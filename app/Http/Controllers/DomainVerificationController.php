<?php

namespace App\Http\Controllers;

use App\Http\Resources\DomainResource;

class DomainVerificationController extends Controller
{
    public function __construct()
    {
        $this->middleware('throttle:6,1');
    }

    public function checkSending($id)
    {
        $domain = user()->domains()->findOrFail($id);
        $usesCloudflareMail = config('mail.mailers.'.config('mail.default').'.transport') === 'cloudflare';

        // Check MX records separately
        if (! $domain->checkMxRecords()) {
            return response()->json([
                'success' => false,
                'message' => $usesCloudflareMail
                    ? 'Cloudflare Email Routing MX records were not found yet. Finish Cloudflare Email Routing onboarding and try again after DNS propagation.'
                    : 'MX record not found or does not have correct priority. This could be due to DNS caching, please try again later.',
                'data' => new DomainResource($domain->fresh()),
            ]);
        }

        return $domain->checkVerificationForSending();
    }
}
