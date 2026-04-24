<?php

namespace Tests\Feature;

use App\Models\Alias;
use App\Models\OutboundMessage;
use App\Models\Recipient;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ZeaburWebhookTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function zeabur_webhook_rejects_missing_signature()
    {
        config(['mail.mailers.zeabur.api_key' => 'test-api-key']);

        $response = $this->postJson('/api/zeabur/webhook', [
            'event' => 'delivered',
            'message_id' => 'msg-123',
        ]);

        $response->assertUnauthorized();
        $response->assertJson(['message' => 'Invalid signature']);
    }

    #[Test]
    public function zeabur_webhook_rejects_invalid_signature()
    {
        config(['mail.mailers.zeabur.api_key' => 'test-api-key']);

        $response = $this->postJson('/api/zeabur/webhook', [
            'event' => 'delivered',
            'message_id' => 'msg-123',
        ], [
            'X-ZSend-Signature' => 'sha256=invalid',
            'X-ZSend-Timestamp' => (string) time(),
        ]);

        $response->assertUnauthorized();
        $response->assertJson(['message' => 'Invalid signature']);
    }

    #[Test]
    public function zeabur_webhook_rejects_stale_timestamp()
    {
        config(['mail.mailers.zeabur.api_key' => 'test-api-key']);

        $oldTimestamp = time() - 400;
        $body = json_encode(['event' => 'delivered', 'message_id' => 'msg-123']);
        $message = $oldTimestamp.'.'.$body;
        $signature = 'sha256='.hash_hmac('sha256', $message, 'test-api-key');

        $response = $this->postJson('/api/zeabur/webhook', [
            'event' => 'delivered',
            'message_id' => 'msg-123',
        ], [
            'X-ZSend-Signature' => $signature,
            'X-ZSend-Timestamp' => (string) $oldTimestamp,
        ]);

        $response->assertUnauthorized();
        $response->assertJson(['message' => 'Invalid signature']);
    }

    #[Test]
    public function zeabur_webhook_processes_delivered_event()
    {
        config(['mail.mailers.zeabur.api_key' => 'test-api-key']);

        $user = User::factory()->create();
        $alias = Alias::factory()->create(['user_id' => $user->id]);
        $recipient = Recipient::factory()->create(['user_id' => $user->id]);

        $outboundMessage = OutboundMessage::create([
            'id' => 'test-id-123',
            'user_id' => $user->id,
            'alias_id' => $alias->id,
            'recipient_id' => $recipient->id,
            'email_type' => 'F',
            'provider' => 'zeabur',
            'provider_message_id' => 'msg-123',
        ]);

        $timestamp = (string) time();
        $body = json_encode(['event' => 'delivered', 'message_id' => 'msg-123']);
        $message = $timestamp.'.'.$body;
        $signature = 'sha256='.hash_hmac('sha256', $message, 'test-api-key');

        $response = $this->postJson('/api/zeabur/webhook', [
            'event' => 'delivered',
            'message_id' => 'msg-123',
        ], [
            'X-ZSend-Signature' => $signature,
            'X-ZSend-Timestamp' => $timestamp,
        ]);

        $response->assertSuccessful();
        $response->assertJson(['message' => 'Webhook processed']);

        $outboundMessage->refresh();
        $this->assertEquals('delivered', $outboundMessage->provider_status);
    }

    #[Test]
    public function zeabur_webhook_processes_bounced_event()
    {
        config(['mail.mailers.zeabur.api_key' => 'test-api-key']);

        $user = User::factory()->create();
        $alias = Alias::factory()->create(['user_id' => $user->id]);
        $recipient = Recipient::factory()->create(['user_id' => $user->id]);

        OutboundMessage::create([
            'id' => 'test-id-456',
            'user_id' => $user->id,
            'alias_id' => $alias->id,
            'recipient_id' => $recipient->id,
            'email_type' => 'F',
            'provider' => 'zeabur',
            'provider_message_id' => 'msg-456',
        ]);

        $timestamp = (string) time();
        $body = json_encode([
            'event' => 'bounced',
            'message_id' => 'msg-456',
            'bounce_type' => 'hard',
            'recipient' => 'recipient@example.com',
        ]);
        $message = $timestamp.'.'.$body;
        $signature = 'sha256='.hash_hmac('sha256', $message, 'test-api-key');

        $response = $this->postJson('/api/zeabur/webhook', [
            'event' => 'bounced',
            'message_id' => 'msg-456',
            'bounce_type' => 'hard',
            'recipient' => 'recipient@example.com',
        ], [
            'X-ZSend-Signature' => $signature,
            'X-ZSend-Timestamp' => $timestamp,
        ]);

        $response->assertSuccessful();

        $this->assertDatabaseHas('failed_deliveries', [
            'destination' => 'recipient@example.com',
            'bounce_type' => 'hard',
            'email_type' => 'F',
        ]);
    }
}
