<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BlocklistApiMiddleware
{
    /**
     * Restrict the blocklist-check API to allowed mail server IPs and optional shared secret.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $secret = config('vovamail.blocklist.secret', '');
        $allowedIps = config('vovamail.blocklist.allowed_ips', []);

        if (config('app.env') === 'production' && $secret === '' && $allowedIps === []) {
            return response()->json(['error' => 'Blocklist API not configured'], 503);
        }

        if ($secret !== '' && $request->header('X-Blocklist-Secret') !== $secret) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        if ($allowedIps !== [] && ! in_array($request->ip(), $allowedIps, true)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
