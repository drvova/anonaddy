<?php

namespace Tests\Feature;

use Tests\TestCase;

class CloudflareInboundTest extends TestCase
{
    public function test_cloudflare_mailer_and_inbound_route_are_registered(): void
    {
        $this->assertSame('cloudflare', config('mail.mailers.cloudflare.transport'));
        $this->assertSame('/api/cloudflare/inbound', route('cloudflare.inbound', absolute: false));
    }

    public function test_cloudflare_inbound_rejects_requests_without_signature(): void
    {
        config(['mail.mailers.cloudflare.webhook_secret' => 'test-secret']);

        $response = $this->postJson(route('cloudflare.inbound', absolute: false), [
            'raw_mime' => 'test',
            'sender' => 'test@example.com',
            'recipients' => [['email' => 'alias@vovamail.xyz', 'local_part' => 'alias', 'extension' => '', 'domain' => 'vovamail.xyz']],
        ]);

        $response->assertStatus(400);
    }

    public function test_cloudflare_inbound_rejects_invalid_signatures(): void
    {
        config(['mail.mailers.cloudflare.webhook_secret' => 'test-secret']);

        $response = $this->withHeaders([
            'X-Cf-Inbound-Timestamp' => '1713744000',
            'X-Cf-Inbound-Signature' => 'sha256=invalid',
        ])->postJson(route('cloudflare.inbound', absolute: false), [
            'raw_mime' => 'test',
            'sender' => 'test@example.com',
            'recipients' => [['email' => 'alias@vovamail.xyz', 'local_part' => 'alias', 'extension' => '', 'domain' => 'vovamail.xyz']],
        ]);

        $response->assertStatus(401);
    }

    public function test_cloudflare_inbound_rejects_requests_without_required_fields(): void
    {
        config(['mail.mailers.cloudflare.webhook_secret' => 'test-secret']);

        $payload = json_encode(['raw_mime' => 'test']);
        $timestamp = '1713744000';
        $signature = 'sha256='.hash_hmac('sha256', "{$timestamp}.{$payload}", 'test-secret');

        $response = $this->withHeaders([
            'X-Cf-Inbound-Timestamp' => $timestamp,
            'X-Cf-Inbound-Signature' => $signature,
        ])->postJson(route('cloudflare.inbound', absolute: false), ['raw_mime' => 'test']);

        $response->assertStatus(422);
    }

    public function test_cloudflare_inbound_returns_503_when_not_configured(): void
    {
        config(['mail.mailers.cloudflare.webhook_secret' => '']);

        $response = $this->postJson(route('cloudflare.inbound', absolute: false), []);

        $response->assertStatus(503);
    }
}
