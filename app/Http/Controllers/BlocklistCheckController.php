<?php

namespace App\Http\Controllers;

use App\Models\Alias;
use App\Models\BlockedSender;
use App\Models\Domain;
use App\Models\Username;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BlocklistCheckController extends Controller
{
    /**
     * Check if the given From: address (or domain) is blocked for the recipient's user.
     * Used by Rspamd on mail servers. Query params: recipient, from_email.
     */
    public function check(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recipient' => ['required', 'string', 'max:254'],
            'from_email' => ['required', 'string', 'max:254'],
        ]);

        $recipient = strtolower($validated['recipient']);
        $fromEmail = strtolower($validated['from_email']);

        $fromDomain = Str::contains($fromEmail, '@')
            ? Str::afterLast($fromEmail, '@')
            : null;

        [$userId, $alias] = $this->resolveUserAndAlias($recipient);

        if ($userId === null) {
            return response()->json(['block' => false]);
        }

        $blockedSender = BlockedSender::where('user_id', $userId)
            ->where('type', 'email')
            ->where('value', $fromEmail)
            ->first();

        if ($blockedSender === null && $fromDomain !== null) {
            $blockedSender = BlockedSender::where('user_id', $userId)
                ->where('type', 'domain')
                ->where('value', $fromDomain)
                ->first();
        }

        if ($blockedSender === null) {
            return response()->json(['block' => false]);
        }

        $blockedSender->increment('blocked', 1, ['last_blocked' => now()]);

        if ($alias !== null) {
            $alias->increment('emails_blocked', 1, ['last_blocked' => now()]);
        }

        return response()->json(['block' => true]);
    }

    /**
     * Resolve envelope recipient to user_id and alias in a single pass.
     *
     * @return array{0: string|null, 1: Alias|null}
     */
    private function resolveUserAndAlias(string $recipient): array
    {
        $aliasEmail = Str::contains($recipient, '+')
            ? Str::before($recipient, '+').'@'.Str::afterLast($recipient, '@')
            : $recipient;

        $alias = Alias::where('email', $aliasEmail)->first();

        if ($alias !== null) {
            return [$alias->user_id, $alias];
        }

        $parts = explode('@', $recipient, 2);

        if (count($parts) !== 2) {
            return [null, null];
        }

        [, $domain] = $parts;

        $allDomains = config('vovamail.all_domains', []);

        foreach ($allDomains as $parentDomain) {
            if (str_ends_with($domain, '.'.$parentDomain)) {
                $subdomain = substr($domain, 0, -strlen($parentDomain) - 1);
                $userId = Username::where('username', $subdomain)->value('user_id');

                return [$userId, null];
            }
        }

        $userId = Domain::where('domain', $domain)->value('user_id');

        return [$userId, null];
    }
}
