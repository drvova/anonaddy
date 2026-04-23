<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InboundEmailProcessor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CloudflareInboundController extends Controller
{
    public function __construct(
        protected InboundEmailProcessor $processor,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $secret = config('mail.mailers.cloudflare.webhook_secret', '');

        if ($secret === '' || $secret === null) {
            return response()->json(['error' => 'Cloudflare inbound not configured'], 503);
        }

        $timestamp = $request->header('X-Cf-Inbound-Timestamp');
        $signature = $request->header('X-Cf-Inbound-Signature');

        if (! $timestamp || ! $signature) {
            return response()->json(['error' => 'Missing required headers'], 400);
        }

        $rawBody = $request->getContent();

        $expectedSignature = 'sha256='.hash_hmac('sha256', "{$timestamp}.{$rawBody}", $secret);

        if (! hash_equals($expectedSignature, $signature)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $payload = json_decode($rawBody, true);

        if (! is_array($payload)) {
            return response()->json(['error' => 'Invalid JSON payload'], 400);
        }

        $rawMime = $payload['raw_mime'] ?? null;
        $sender = $payload['sender'] ?? null;
        $recipients = $payload['recipients'] ?? [];
        $size = $payload['size'] ?? null;

        if (! $rawMime || ! $sender || empty($recipients)) {
            return response()->json(['error' => 'Missing required fields: raw_mime, sender, recipients'], 422);
        }

        $result = $this->processor->processRawMime(
            rawMime: $rawMime,
            sender: $sender,
            recipients: $recipients,
            size: $size,
            source: 'cloudflare'
        );

        return response()->json([
            'status' => $result->status,
            'message' => $result->message,
        ]);
    }
}
