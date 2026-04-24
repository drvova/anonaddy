<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InboundEmailProcessor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InboundWebhookController extends Controller
{
    public function __construct(
        private readonly InboundEmailProcessor $processor,
    ) {
    }

    public function handle(Request $request): JsonResponse
    {
        if (! $this->isValidSecret($request)) {
            return response()->json(['message' => 'Invalid webhook secret'], 401);
        }

        $validated = $request->validate([
            'raw_mime' => 'required|string',
            'sender' => 'required|string|email',
            'recipients' => 'required|array|min:1',
            'recipients.*.email' => 'required|string|email',
            'recipients.*.local_part' => 'required|string',
            'recipients.*.extension' => 'nullable|string',
            'recipients.*.domain' => 'required|string',
            'size' => 'nullable|integer|min:1',
        ]);

        try {
            $result = $this->processor->processRawMime(
                rawMime: $validated['raw_mime'],
                sender: $validated['sender'],
                recipients: $validated['recipients'],
                size: $validated['size'] ?? null,
                source: 'webhook',
            );

            return match ($result->status) {
                'success' => response()->json(['message' => 'Email processed']),
                'ignored' => response()->json(['message' => $result->message ?? 'Ignored'], 202),
                'rejected' => response()->json(['message' => $result->message ?? 'Rejected'], 422),
                'error' => response()->json(['message' => $result->message ?? 'Error'], 500),
                default => response()->json(['message' => 'Unknown status'], 500),
            };
        } catch (\Throwable $e) {
            Log::error('Inbound webhook error: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            return response()->json(['message' => 'Internal error'], 500);
        }
    }

    protected function isValidSecret(Request $request): bool
    {
        $secret = config('vovamail.inbound_webhook_secret');

        if (blank($secret)) {
            return false;
        }

        $header = $request->header('X-Webhook-Secret');

        if (blank($header)) {
            return false;
        }

        return hash_equals($secret, $header);
    }
}
