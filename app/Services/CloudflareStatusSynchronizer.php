<?php

namespace App\Services;

use App\Models\FailedDelivery;
use App\Models\OutboundMessage;
use App\Notifications\FailedDeliveryNotification;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Ramsey\Uuid\Uuid;
use RuntimeException;

class CloudflareStatusSynchronizer
{
    public function __construct(private readonly Factory $http) {}

    /**
     * @return array{processed:int, updated:int, failed:int, ignored:int}
     */
    public function syncRecentEvents(int $minutes): array
    {
        $config = $this->cloudflareConfig();
        $this->ensureConfigured($config);

        $events = $this->fetchEvents(
            $config,
            now()->utc()->subMinutes($minutes),
            now()->utc(),
        );

        $summary = [
            'processed' => count($events),
            'updated' => 0,
            'failed' => 0,
            'ignored' => 0,
        ];

        foreach ($events as $event) {
            $summary[$this->syncEvent($event, $config)]++;
        }

        return $summary;
    }

    /**
     * @return array<string, mixed>
     */
    protected function cloudflareConfig(): array
    {
        return config('mail.mailers.cloudflare', []);
    }

    /**
     * @param  array<string, mixed>  $config
     */
    protected function ensureConfigured(array $config): void
    {
        if (blank($config['api_token'] ?? null)) {
            throw new RuntimeException('Cloudflare API token is not configured.');
        }

        if (blank($config['zone_id'] ?? null)) {
            throw new RuntimeException('Cloudflare zone ID is not configured.');
        }
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<int, array<string, mixed>>
     */
    protected function fetchEvents(array $config, Carbon $start, Carbon $end): array
    {
        $response = $this->http
            ->withToken((string) $config['api_token'])
            ->acceptJson()
            ->asJson()
            ->timeout((int) ($config['timeout'] ?? 30))
            ->post((string) ($config['graphql_url'] ?? 'https://api.cloudflare.com/client/v4/graphql'), [
                'query' => $this->buildQuery(max(1, (int) ($config['sync_limit'] ?? 500))),
                'variables' => [
                    'zoneTag' => (string) $config['zone_id'],
                    'start' => $start->toIso8601ZuluString(),
                    'end' => $end->toIso8601ZuluString(),
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException(sprintf(
                'Cloudflare GraphQL query failed with status %s: %s',
                $response->status(),
                $response->body(),
            ));
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            throw new RuntimeException('Cloudflare GraphQL returned an invalid response.');
        }

        $errors = Arr::wrap($payload['errors'] ?? []);

        if ($errors !== []) {
            $message = collect($errors)
                ->map(fn ($error) => is_array($error) ? ($error['message'] ?? json_encode($error)) : (string) $error)
                ->filter()
                ->implode(' | ');

            throw new RuntimeException('Cloudflare GraphQL returned errors: '.$message);
        }

        $events = Arr::get($payload, 'data.viewer.zones.0.emailSendingAdaptive', []);

        return is_array($events) ? $events : [];
    }

    protected function buildQuery(int $limit): string
    {
        return <<<GRAPHQL
query RecentEmailEvents(
  \$zoneTag: string!
  \$start: Time!
  \$end: Time!
) {
  viewer {
    zones(filter: { zoneTag: \$zoneTag }) {
      emailSendingAdaptive(
        filter: { datetime_geq: \$start, datetime_leq: \$end }
        limit: {$limit}
        orderBy: [datetime_ASC]
      ) {
        datetime
        from
        to
        subject
        status
        eventType
        messageId
        sessionId
        errorCause
        errorDetail
      }
    }
  }
}
GRAPHQL;
    }

    /**
     * @param  array<string, mixed>  $event
     * @param  array<string, mixed>  $config
     */
    protected function syncEvent(array $event, array $config): string
    {
        $messageId = trim((string) Arr::get($event, 'messageId'));
        $sessionId = trim((string) Arr::get($event, 'sessionId'));

        if ($messageId === '') {
            return 'ignored';
        }

        $outboundMessage = OutboundMessage::query()
            ->where('provider', 'cloudflare')
            ->forProviderIdentifiers($sessionId ?: null, $messageId)
            ->with(['alias', 'recipient', 'user.defaultRecipient'])
            ->first();

        if (! $outboundMessage) {
            return 'ignored';
        }

        if ($this->isDuplicateEvent($outboundMessage, $event)) {
            return 'ignored';
        }

        $outboundMessage->update([
            'provider' => 'cloudflare',
            'provider_email_id' => $sessionId ?: $outboundMessage->provider_email_id,
            'provider_message_id' => $messageId,
            'provider_status' => (string) Arr::get($event, 'status', 'unknown'),
            'provider_last_event' => $this->resolveLastEvent($event),
            'provider_payload' => $event,
            'bounced' => $this->isFailedEvent($event) ? true : $outboundMessage->bounced,
        ]);

        if (! $this->isFailedEvent($event)) {
            return 'updated';
        }

        return $this->recordFailedDelivery(
            $outboundMessage->fresh(['alias', 'recipient', 'user.defaultRecipient']) ?? $outboundMessage,
            $event,
            $config,
        ) ? 'failed' : 'ignored';
    }

    /**
     * @param  array<string, mixed>  $event
     */
    protected function isFailedEvent(array $event): bool
    {
        return strcasecmp((string) Arr::get($event, 'status'), 'deliveryFailed') === 0;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    protected function resolveLastEvent(array $event): string
    {
        return (string) (Arr::get($event, 'eventType') ?: Arr::get($event, 'status') ?: 'sync');
    }

    /**
     * @param  array<string, mixed>  $event
     */
    protected function isDuplicateEvent(OutboundMessage $outboundMessage, array $event): bool
    {
        return $outboundMessage->provider_status === (string) Arr::get($event, 'status')
            && $outboundMessage->provider_last_event === $this->resolveLastEvent($event)
            && Arr::get($outboundMessage->provider_payload, 'datetime') === Arr::get($event, 'datetime');
    }

    /**
     * @param  array<string, mixed>  $event
     * @param  array<string, mixed>  $config
     */
    protected function recordFailedDelivery(OutboundMessage $outboundMessage, array $event, array $config): bool
    {
        $status = $this->resolveFailedDeliveryStatus($event);
        $diagnosticCode = $this->resolveDiagnosticCode($event);
        $destination = (string) (Arr::get($event, 'to') ?: $outboundMessage->recipient?->email ?: $outboundMessage->user?->defaultRecipient?->email);
        $dedupeKey = hash('sha256', implode('|', array_filter([
            'cloudflare',
            Arr::get($event, 'messageId'),
            Arr::get($event, 'datetime'),
            $destination,
        ])));

        $failedDelivery = FailedDelivery::firstOrCreate(
            ['ir_dedupe_key' => $dedupeKey],
            [
                'id' => Uuid::uuid4()->toString(),
                'user_id' => $outboundMessage->user_id,
                'recipient_id' => $outboundMessage->recipient_id,
                'alias_id' => $outboundMessage->alias_id,
                'is_stored' => false,
                'resent' => false,
                'bounce_type' => $this->resolveBounceType($status, $diagnosticCode),
                'remote_mta' => parse_url((string) ($config['graphql_url'] ?? 'https://api.cloudflare.com/client/v4/graphql'), PHP_URL_HOST) ?: 'api.cloudflare.com',
                'sender' => (string) Arr::get($event, 'from'),
                'destination' => $destination,
                'email_type' => $outboundMessage->email_type,
                'status' => $status,
                'code' => $diagnosticCode,
                'attempted_at' => $outboundMessage->created_at ?? now(),
            ]
        );

        if (! $failedDelivery->wasRecentlyCreated) {
            return false;
        }

        $outboundMessage->markAsBounced();
        $this->decrementAliasCounters($outboundMessage);
        $this->notifyFailedDelivery($outboundMessage, $event);

        return true;
    }

    protected function decrementAliasCounters(OutboundMessage $outboundMessage): void
    {
        if (! $outboundMessage->alias) {
            return;
        }

        if ($outboundMessage->email_type === 'F' && $outboundMessage->alias->emails_forwarded > 0) {
            $outboundMessage->alias->decrement('emails_forwarded');
        }

        if ($outboundMessage->email_type === 'R' && $outboundMessage->alias->emails_replied > 0) {
            $outboundMessage->alias->decrement('emails_replied');
        }

        if ($outboundMessage->email_type === 'S' && $outboundMessage->alias->emails_sent > 0) {
            $outboundMessage->alias->decrement('emails_sent');
        }
    }

    /**
     * @param  array<string, mixed>  $event
     */
    protected function notifyFailedDelivery(OutboundMessage $outboundMessage, array $event): void
    {
        if ($outboundMessage->email_type === 'FDN') {
            return;
        }

        $notifiable = $outboundMessage->recipient?->email_verified_at
            ? $outboundMessage->recipient
            : $outboundMessage->user?->defaultRecipient;

        if (! $notifiable?->email_verified_at) {
            return;
        }

        $notifiable->notify(new FailedDeliveryNotification(
            $outboundMessage->alias?->email,
            Arr::get($event, 'from'),
            Arr::get($event, 'subject'),
            false,
            $outboundMessage->user?->store_failed_deliveries ?? false,
            $outboundMessage->recipient?->email,
        ));
    }

    /**
     * @param  array<string, mixed>  $event
     */
    protected function resolveFailedDeliveryStatus(array $event): string
    {
        $errorDetail = (string) Arr::get($event, 'errorDetail');

        if (preg_match('/\b([245]\.\d\.\d)\b/', $errorDetail, $matches)) {
            return $matches[1];
        }

        if (preg_match('/\b([245]\d\d)\b/', $errorDetail, $matches)) {
            return $matches[1];
        }

        return Str::contains(strtolower((string) Arr::get($event, 'errorCause')), ['temporary', 'throttle', 'timeout'])
            ? '4.0.0'
            : '5.0.0';
    }

    /**
     * @param  array<string, mixed>  $event
     */
    protected function resolveDiagnosticCode(array $event): string
    {
        return Str::limit((string) (Arr::get($event, 'errorDetail') ?: Arr::get($event, 'errorCause') ?: 'Cloudflare reported a delivery failure.'), 497, '');
    }

    protected function resolveBounceType(string $status, string $diagnosticCode): string
    {
        if (preg_match('/spam|unsolicited|blacklist|blocked|policy/i', $diagnosticCode)) {
            return 'spam';
        }

        return Str::startsWith($status, '4') ? 'soft' : 'hard';
    }
}
