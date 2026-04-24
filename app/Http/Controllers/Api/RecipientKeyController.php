<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateRecipientKeyRequest;
use App\Http\Resources\RecipientResource;

class RecipientKeyController extends Controller
{
    public function update(UpdateRecipientKeyRequest $request, $id)
    {
        if (! class_exists('gnupg')) {
            return response('GnuPG extension is not installed.', 503);
        }

        $recipient = user()->recipients()->findOrFail($id);

        $info = $this->gnupg()->import($request->key_data);

        if (! $info || ! $info['fingerprint']) {
            return response('Key could not be imported', 404);
        }

        $recipient->update([
            'should_encrypt' => true,
            'fingerprint' => $info['fingerprint'],
        ]);

        return new RecipientResource($recipient->fresh()->loadCount('aliases'));
    }

    public function destroy($id)
    {
        if (! class_exists('gnupg')) {
            return response('GnuPG extension is not installed.', 503);
        }

        $recipient = user()->recipients()->findOrFail($id);

        user()->deleteKeyFromKeyring($recipient->fingerprint);

        $recipient->update([
            'should_encrypt' => false,
            'inline_encryption' => false,
            'protected_headers' => false,
            'inline_encryption' => false,
            'protected_headers' => false,
            'fingerprint' => null,
        ]);

        return response('', 204);
    }

    protected function gnupg(): \gnupg
    {
        $gnupg = new \gnupg;
        $gnupg->seterrormode(\gnupg::ERROR_EXCEPTION);

        return $gnupg;
    }
}
