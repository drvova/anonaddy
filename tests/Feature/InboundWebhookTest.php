<?php

namespace Tests\Feature;

use App\Models\Alias;
use App\Models\Recipient;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InboundWebhookTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function inbound_webhook_rejects_missing_secret()
    {
        $response = $this->postJson('/api/inbound', [
            'raw_mime' => 'test',
            'sender' => 'sender@example.com',
            'recipients' => [['email' => 'alias@example.com', 'local_part' => 'alias', 'extension' => '', 'domain' => 'example.com']],
        ]);

        $response->assertUnauthorized();
        $response->assertJson(['message' => 'Invalid webhook secret']);
    }

    #[Test]
    public function inbound_webhook_rejects_invalid_secret()
    {
        config(['vovamail.inbound_webhook_secret' => 'correct-secret']);

        $response = $this->postJson('/api/inbound', [
            'raw_mime' => 'test',
            'sender' => 'sender@example.com',
            'recipients' => [['email' => 'alias@example.com', 'local_part' => 'alias', 'extension' => '', 'domain' => 'example.com']],
        ], ['X-Webhook-Secret' => 'wrong-secret']);

        $response->assertUnauthorized();
        $response->assertJson(['message' => 'Invalid webhook secret']);
    }

    #[Test]
    public function inbound_webhook_rejects_invalid_payload()
    {
        config(['vovamail.inbound_webhook_secret' => 'correct-secret']);

        $response = $this->postJson('/api/inbound', [
            'raw_mime' => '',
            'sender' => 'not-an-email',
            'recipients' => [],
        ], ['X-Webhook-Secret' => 'correct-secret']);

        $response->assertUnprocessable();
    }

    #[Test]
    public function inbound_webhook_processes_valid_email()
    {
        config(['vovamail.inbound_webhook_secret' => 'correct-secret']);

        $user = $this->createUser();
        $recipient = Recipient::factory()->create([
            'user_id' => $user->id,
            'email' => 'real@example.com',
            'email_verified_at' => now(),
        ]);
        $user->default_recipient_id = $recipient->id;
        $user->save();

        $alias = Alias::factory()->create([
            'user_id' => $user->id,
            'email' => 'alias@example.com',
            'local_part' => 'alias',
            'domain' => 'example.com',
        ]);

        $rawMime = "From: sender@example.com\r\nTo: alias@example.com\r\nSubject: Test\r\nContent-Type: text/plain\r\n\r\nHello world";

        $response = $this->postJson('/api/inbound', [
            'raw_mime' => $rawMime,
            'sender' => 'sender@example.com',
            'recipients' => [
                [
                    'email' => 'alias@example.com',
                    'local_part' => 'alias',
                    'extension' => '',
                    'domain' => 'example.com',
                ],
            ],
            'size' => strlen($rawMime),
        ], ['X-Webhook-Secret' => 'correct-secret']);

        $response->assertSuccessful();
        $response->assertJson(['message' => 'Email processed']);
    }
}
