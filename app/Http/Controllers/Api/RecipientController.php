<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexRecipientRequest;
use App\Http\Requests\ShowRecipientRequest;
use App\Http\Requests\StoreRecipientRequest;
use App\Http\Resources\RecipientResource;

class RecipientController extends Controller
{
    public function index(IndexRecipientRequest $request)
    {
        $recipients = user()->recipients()->latest();

        if ($request->input('filter.alias_count') !== 'false') {
            $recipients->withCount('aliases');
        }

        if ($request->input('filter.verified') === 'true') {
            $recipients->verified();
        }

        if ($request->input('filter.verified') === 'false') {
            $recipients->verified('false');
        }

        return RecipientResource::collection($recipients->get());
    }

    public function show(ShowRecipientRequest $request, $id)
    {
        $recipient = user()->recipients()->findOrFail($id);

        if ($request->input('filter.alias_count') !== 'false') {
            $recipient->loadCount('aliases');
        }

        return new RecipientResource($recipient);
    }

    public function store(StoreRecipientRequest $request)
    {
        $data = ['email' => strtolower($request->email)];

        if (config('vovamail.auto_verify_new_recipients')) {
            $data['email_verified_at'] = now();
        }

        $recipient = user()->recipients()->create($data);

        if (! config('vovamail.auto_verify_new_recipients')) {
            $recipient->sendEmailVerificationNotification();
        }

        return new RecipientResource($recipient->refresh()->loadCount('aliases'));
    }

    public function destroy($id)
    {
        if ($id === user()->default_recipient_id) {
            return response('You cannot delete your default recipient', 403);
        }

        $recipient = user()->recipients()->findOrFail($id);

        $recipient->delete();

        return response('', 204);
    }
}
