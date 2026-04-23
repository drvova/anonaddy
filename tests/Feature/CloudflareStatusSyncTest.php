<?php

namespace Tests\Feature;

use App\Models\Alias;
use App\Models\FailedDelivery;
use App\Models\OutboundMessage;
use App\Notifications\FailedDeliveryNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class CloudflareStatusSyncTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'mail.default' => 'cloudflare',
            'mail.mailers.cloudflare.api_token' => 'test-token',
            'mail.mailers.cloudflare.zone_id' => 'test-zone',
            'mail.mailers.cloudflare.graphql_url' => 'https://api.cloudflare.com/client/v4/graphql',
            'mail.mailers.cloudflare.sync_window_minutes' => 15,
        ]);
    }

    public function test_sync_command_marks_matching_outbound_messages_as_delivered(): void
    {
        $user = $this->createUser('statussync');

        $outboundMessage = OutboundMessage::create([
            'id' => Str::lower(Str::random(12)),
            'user_id' => $user->id,
            'recipient_id' => $user->defaultRecipient->id,
            'email_type' => 'F',
            'provider' => 'cloudflare',
            'provider_message_id' => '<delivered@example.com>',
            'provider_status' => 'queued',
        ]);

        Http::fake([
            'https://api.cloudflare.com/client/v4/graphql' => Http::response($this->graphQlPayload([
                $this->event([
                    'messageId' => '<delivered@example.com>',
                    'sessionId' => 'session-1',
                    'status' => 'delivered',
                    'eventType' => 'delivered',
                    'to' => $user->defaultRecipient->email,
                ]),
            ])),
        ]);

        $this->artisan('vovamail:sync-cloudflare-email-statuses')
            ->assertExitCode(0);

        $outboundMessage->refresh();

        $this->assertSame('cloudflare', $outboundMessage->provider);
        $this->assertSame('session-1', $outboundMessage->provider_email_id);
        $this->assertSame('<delivered@example.com>', $outboundMessage->provider_message_id);
        $this->assertSame('delivered', $outboundMessage->provider_status);
        $this->assertSame('delivered', $outboundMessage->provider_last_event);
        $this->assertFalse($outboundMessage->bounced);
    }

    public function test_sync_command_records_failed_deliveries_for_delivery_failed_events(): void
    {
        Notification::fake();

        $user = $this->createUser('hardfail');
        $alias = Alias::factory()->create([
            'user_id' => $user->id,
            'email' => 'store@hardfail.'.config('vovamail.domain'),
            'local_part' => 'store',
            'domain' => 'hardfail.'.config('vovamail.domain'),
            'emails_forwarded' => 1,
        ]);

        $outboundMessage = OutboundMessage::create([
            'id' => Str::lower(Str::random(12)),
            'user_id' => $user->id,
            'alias_id' => $alias->id,
            'recipient_id' => $user->defaultRecipient->id,
            'email_type' => 'F',
            'provider' => 'cloudflare',
            'provider_message_id' => '<failed@example.com>',
            'provider_status' => 'queued',
        ]);

        Http::fake([
            'https://api.cloudflare.com/client/v4/graphql' => Http::response($this->graphQlPayload([
                $this->event([
                    'messageId' => '<failed@example.com>',
                    'sessionId' => 'session-2',
                    'status' => 'deliveryFailed',
                    'eventType' => 'delivery',
                    'from' => 'sender@example.com',
                    'to' => $user->defaultRecipient->email,
                    'subject' => 'Failed subject',
                    'errorCause' => 'smtp',
                    'errorDetail' => '550 5.1.1 Recipient address rejected: User unknown',
                ]),
            ])),
        ]);

        $this->artisan('vovamail:sync-cloudflare-email-statuses')
            ->assertExitCode(0);

        $outboundMessage->refresh();
        $alias->refresh();

        $this->assertSame('deliveryFailed', $outboundMessage->provider_status);
        $this->assertSame('delivery', $outboundMessage->provider_last_event);
        $this->assertTrue($outboundMessage->bounced);
        $this->assertSame(0, $alias->emails_forwarded);

        $this->assertDatabaseHas('failed_deliveries', [
            'user_id' => $user->id,
            'alias_id' => $alias->id,
            'email_type' => 'F',
            'bounce_type' => 'hard',
            'remote_mta' => 'api.cloudflare.com',
            'status' => '5.1.1',
            'code' => '550 5.1.1 Recipient address rejected: User unknown',
        ]);

        $failedDelivery = FailedDelivery::query()->first();

        $this->assertSame('sender@example.com', $failedDelivery->sender);
        $this->assertSame($user->defaultRecipient->email, $failedDelivery->destination);

        Notification::assertSentTo($user->defaultRecipient, FailedDeliveryNotification::class);
    }

    public function test_sync_command_is_idempotent_for_duplicate_delivery_failed_events(): void
    {
        Notification::fake();

        $user = $this->createUser('dedupe');
        $alias = Alias::factory()->create([
            'user_id' => $user->id,
            'email' => 'alerts@dedupe.'.config('vovamail.domain'),
            'local_part' => 'alerts',
            'domain' => 'dedupe.'.config('vovamail.domain'),
            'emails_forwarded' => 1,
        ]);

        OutboundMessage::create([
            'id' => Str::lower(Str::random(12)),
            'user_id' => $user->id,
            'alias_id' => $alias->id,
            'recipient_id' => $user->defaultRecipient->id,
            'email_type' => 'F',
            'provider' => 'cloudflare',
            'provider_message_id' => '<duplicate@example.com>',
            'provider_status' => 'queued',
        ]);

        $payload = $this->graphQlPayload([
            $this->event([
                'messageId' => '<duplicate@example.com>',
                'status' => 'deliveryFailed',
                'eventType' => 'delivery',
                'to' => $user->defaultRecipient->email,
                'errorDetail' => '550 5.1.1 Recipient address rejected: User unknown',
            ]),
        ]);

        Http::fake([
            'https://api.cloudflare.com/client/v4/graphql' => Http::response($payload),
        ]);

        $this->artisan('vovamail:sync-cloudflare-email-statuses')->assertExitCode(0);
        $this->artisan('vovamail:sync-cloudflare-email-statuses')->assertExitCode(0);

        $alias->refresh();

        $this->assertDatabaseCount('failed_deliveries', 1);
        $this->assertSame(0, $alias->emails_forwarded);
        Notification::assertSentToTimes($user->defaultRecipient, FailedDeliveryNotification::class, 1);
    }

    public function test_sync_command_fails_when_zone_id_is_missing(): void
    {
        config(['mail.mailers.cloudflare.zone_id' => null]);

        Http::fake();

        $this->artisan('vovamail:sync-cloudflare-email-statuses')
            ->assertExitCode(1);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    protected function event(array $overrides = []): array
    {
        return array_merge([
            'datetime' => '2026-04-22T12:00:00Z',
            'from' => 'mailer@vovamail.xyz',
            'to' => 'recipient@example.com',
            'subject' => 'Status sync',
            'status' => 'delivered',
            'eventType' => 'delivered',
            'messageId' => '<event@example.com>',
            'sessionId' => 'session-default',
            'errorCause' => '',
            'errorDetail' => '',
        ], $overrides);
    }

    /**
     * @param  array<int, array<string, mixed>>  $events
     * @return array<string, mixed>
     */
    protected function graphQlPayload(array $events): array
    {
        return [
            'data' => [
                'viewer' => [
                    'zones' => [[
                        'emailSendingAdaptive' => $events,
                    ]],
                ],
            ],
            'errors' => null,
        ];
    }
}
