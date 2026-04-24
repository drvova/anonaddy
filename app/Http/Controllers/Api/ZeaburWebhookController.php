<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OutboundMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Ramsey\Uuid\Uuid;

class ZeaburWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        if (! $this->isValidSignature($request)) {
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $payload = $request->all();

        if (! isset($payload['event'], $payload['message_id'])) {
            return response()->json(['message' => 'Missing required fields'], 422);
        }

        $event = $payload['event'];
        $messageId = $payload['message_id'];

        $outboundMessage = OutboundMessage::where('provider', 'zeabur')
            ->where('provider_message_id', $messageId)
            ->first();

        if (! $outboundMessage) {
            Log::info('Zeabur webhook: outbound message not found', ['message_id' => $messageId]);

            return response()->json(['message' => 'Message not found'], 404);
        }

        match ($event) {
            'delivered' => $outboundMessage->update([
                'provider_status' => 'delivered',
                'provider_last_event' => 'delivered',
                'provider_payload' => $payload,
            ]),
            'bounced' => $this->handleBounce($outboundMessage, $payload),
            'dropped', 'deferred', 'processed', 'open', 'click', 'complaint', 'unsubscribe' => $outboundMessage->update([
                'provider_status' => $event,
                'provider_last_event' => $event,
                'provider_payload' => $payload,
            ]),
            default => Log::info('Zeabur webhook: unhandled event', ['event' => $event, 'message_id' => $messageId]),
        };

        return response()->json(['message' => 'Webhook processed']);
    }

    protected function handleBounce(OutboundMessage $outboundMessage, array $payload): void
    {
        $outboundMessage->markAsBounced();

        $bounceType = $payload['bounce_type'] ?? null;
        $diagnosticCode = isset($payload['diagnostic_code']) ? str_limit($payload['diagnostic_code'], 497) : null;

        $outboundMessage->update([
            'provider_status' => 'bounced',
            'provider_last_event' => 'bounced',
            'provider_payload' => $payload,
        ]);

        $user = $outboundMessage->user;
        $alias = $outboundMessage->alias;
        $recipient = $outboundMessage->recipient;
        $emailType = $outboundMessage->getRawOriginal('email_type');

        if (! $user) {
            return;
        }

        $failedDeliveryId = Uuid::uuid4();

        $user->failedDeliveries()->create([
            'id' => $failedDeliveryId,
            'recipient_id' => $recipient->id ?? null,
            'alias_id' => $alias->id ?? null,
            'is_stored' => false,
            'bounce_type' => $bounceType,
            'remote_mta' => $payload['remote_mta'] ?? null,
            'sender' => null,
            'destination' => $payload['recipient'] ?? null,
            'email_type' => $emailType,
            'status' => $payload['status'] ?? null,
            'code' => $diagnosticCode,
            'attempted_at' => $outboundMessage->created_at,
        ]);

        if ($alias) {
            if ($emailType === 'F' && $alias->emails_forwarded > 0) {
                $alias->decrement('emails_forwarded');
            }

            if ($emailType === 'R' && $alias->emails_replied > 0) {
                $alias->decrement('emails_replied');
            }

            if ($emailType === 'S' && $alias->emails_sent > 0) {
                $alias->decrement('emails_sent');
            }
        }
    }

    protected function isValidSignature(Request $request): bool
    {
        $signature = $request->header('X-ZSend-Signature');
        $timestamp = $request->header('X-ZSend-Timestamp');

        if (blank($signature) || blank($timestamp)) {
            return false;
        }

        // Reject timestamps older than 5 minutes to prevent replay attacks
        if (abs(time() - (int) $timestamp) > 300) {
            return false;
        }

        $secret = config('mail.mailers.zeabur.webhook_secret')
            ?? config('mail.mailers.zeabur.api_key')
            ?? '';

        if (blank($secret)) {
            return false;
        }

        $body = $request->getContent();
        $message = $timestamp.'.'.$body;
        $expected = 'sha256='.hash_hmac('sha256', $message, $secret);

        return hash_equals($expected, $signature);
    }
}
