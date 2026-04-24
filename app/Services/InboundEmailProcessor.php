<?php

namespace App\Services;

use App\Mail\ForwardEmail;
use App\Mail\ReplyToEmail;
use App\Mail\SendFromEmail;
use App\Models\Alias;
use App\Models\Domain;
use App\Models\EmailData;
use App\Models\OutboundMessage;
use App\Models\Username;
use App\Notifications\DisallowedReplySendAttempt;
use App\Notifications\FailedDeliveryNotification;
use App\Notifications\NearBandwidthLimit;
use App\Notifications\SpamReplySendAttempt;
use Egulias\EmailValidator\EmailValidator;
use Egulias\EmailValidator\Validation\RFCValidation;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ParagonIE\ConstantTime\Base32;
use PhpMimeMailParser\Parser;
use Ramsey\Uuid\Uuid;

class InboundEmailProcessor
{
    protected Parser $parser;

    protected string $senderFrom;

    protected float $size;

    protected string $rawEmail;

    protected $user;

    protected $alias;

    protected array $inboundAlias;

    protected ?string $senderOption;

    public function processRawMime(
        string $rawMime,
        string $sender,
        array $recipients,
        ?int $size = null,
        ?string $source = 'postfix'
    ): ProcessingResult {
        try {
            if ($this->isFromSelf($sender)) {
                return ProcessingResult::ignored('Message from self');
            }

            $this->senderOption = $sender;
            $this->parser = $this->createParser($rawMime);
            $this->senderFrom = $this->resolveSender($sender);

            $inboundAliases = collect($recipients)->map(function ($recipient) {
                return [
                    'email' => strtolower($recipient['email'] ?? ''),
                    'local_part' => strtolower($recipient['local_part'] ?? ''),
                    'extension' => $recipient['extension'] ?? '',
                    'domain' => strtolower($recipient['domain'] ?? ''),
                ];
            });

            $inboundAliasCount = $inboundAliases
                ->where('domain', '!=', 'unsubscribe.'.config('vovamail.domain'))
                ->count();

            $this->size = ($size ?? strlen($rawMime)) / ($inboundAliasCount ?: 1);

            foreach ($inboundAliases as $inboundAlias) {
                $this->inboundAlias = $inboundAlias;
                $this->user = null;
                $this->alias = null;

                $result = $this->processAlias();

                if ($result->shouldStop()) {
                    return $result;
                }
            }

            return ProcessingResult::success();
        } catch (\Throwable $e) {
            Log::error('InboundEmailProcessor error: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            return ProcessingResult::error('4.3.0 An error has occurred, please try again later.');
        }
    }

    protected function processAlias(): ProcessingResult
    {
        if (substr($this->inboundAlias['email'], 0, 2) === 'b_') {
            $result = $this->handleVerpBounce();

            if ($result !== null) {
                return $result;
            }
        }

        if ($this->senderOption === 'MAILER-DAEMON'
            && Str::startsWith(strtolower($this->parser->getHeader('Content-Type')), 'multipart/report')
            && ! isset($this->outboundMessageForBackscatter)
        ) {
            return ProcessingResult::ignored('Backscatter');
        }

        $aliasable = $this->resolveAlias();

        if (! isset($this->user) || ! $this->user->hasVerifiedDefaultRecipient()) {
            return ProcessingResult::ignored('No user or no verified recipient');
        }

        $bandwidthResult = $this->checkBandwidthLimit();
        if ($bandwidthResult !== null) {
            return $bandwidthResult;
        }

        $rateResult = $this->checkRateLimit();
        if ($rateResult !== null) {
            return $rateResult;
        }

        return $this->routeMessage($aliasable ?? null);
    }

    protected function handleVerpBounce(): ?ProcessingResult
    {
        $outboundMessageId = $this->getIdFromVerp($this->inboundAlias['email']);

        if (! $outboundMessageId) {
            return null;
        }

        $outboundMessage = OutboundMessage::with(['user', 'alias', 'recipient'])->find($outboundMessageId);

        if (is_null($outboundMessage)) {
            Log::info('VERP outboundMessage not found');

            return ProcessingResult::ignored('VERP message older than 7 days');
        }

        $bouncedAlias = $outboundMessage->alias;

        if (! $outboundMessage->bounced) {
            $this->handleBounce($outboundMessage);
        }

        if (in_array(strtolower($this->parser->getHeader('Auto-Submitted')), ['auto-replied', 'auto-generated'])
            && ! in_array($outboundMessage->email_type, ['R', 'S'])
        ) {
            Log::info('VERP auto-response to forward/notification, username: '.$outboundMessage->user?->username.' outboundMessageID: '.$outboundMessageId);

            return ProcessingResult::ignored('VERP auto-response');
        }

        if (is_null($bouncedAlias)) {
            Log::info('VERP previously bounced/auto-response to notification, username: '.$outboundMessage->user?->username.' outboundMessageID: '.$outboundMessageId);

            return ProcessingResult::ignored('VERP notification');
        }

        $this->inboundAlias['email'] = $bouncedAlias->email;
        $this->inboundAlias['local_part'] = $bouncedAlias->local_part;
        $this->inboundAlias['domain'] = $bouncedAlias->domain;

        return null;
    }

    protected function resolveAlias(): mixed
    {
        $aliasable = null;

        if ($this->alias = Alias::firstWhere('email', $this->inboundAlias['local_part'].'@'.$this->inboundAlias['domain'])) {
            $this->user = $this->alias->user;

            if ($this->alias->aliasable_id) {
                $aliasable = $this->alias->aliasable;
            }
        } else {
            $parentDomain = collect(config('vovamail.all_domains'))
                ->filter(fn ($name) => Str::endsWith($this->inboundAlias['domain'], '.'.$name))
                ->first();

            if (! empty($parentDomain)) {
                $subdomain = substr($this->inboundAlias['domain'], 0, strrpos($this->inboundAlias['domain'], '.'.$parentDomain));

                if ($subdomain === 'unsubscribe') {
                    $this->handleUnsubscribe();

                    return null;
                }

                if (! empty($subdomain)) {
                    $username = Username::where('username', $subdomain)->first();
                    $this->user = $username->user;
                    $aliasable = $username;
                }
            } else {
                if ($customDomain = Domain::where('domain', $this->inboundAlias['domain'])->first()) {
                    $this->user = $customDomain->user;
                    $aliasable = $customDomain;
                }
            }

            if (! isset($this->user) && ! empty(config('vovamail.admin_username'))) {
                $this->user = Username::where('username', config('vovamail.admin_username'))->first()?->user;
            }
        }

        return $aliasable;
    }

    protected function routeMessage(mixed $aliasable): ProcessingResult
    {
        $destination = Str::replaceLast('=', '@', $this->inboundAlias['extension']);
        $validEmailDestination = false;

        if (App::environment('testing')
            ? filter_var($destination, FILTER_VALIDATE_EMAIL)
            : (new EmailValidator)->isValid($destination, new RFCValidation) || filter_var($destination, FILTER_VALIDATE_EMAIL)
        ) {
            $validEmailDestination = $destination;
        }

        $verifiedRecipient = $validEmailDestination
            ? $this->user->getVerifiedRecipientByEmail($this->senderFrom)
            : null;

        if ($verifiedRecipient?->can_reply_send) {
            $dmarcHeader = $this->parser->getHeader('X-VovaMail-Dmarc-Allow');

            if (! $dmarcHeader && $this->shouldCheckDmarc()) {
                $verifiedRecipient->notify(new SpamReplySendAttempt(
                    $this->inboundAlias,
                    $this->senderFrom,
                    $this->parser->getHeader('X-VovaMail-Authentication-Results')
                ));

                return ProcessingResult::rejected('DMARC check failed');
            }

            if ($this->alias?->attached_recipients_only) {
                if (! $this->alias->verifiedRecipients()->pluck('recipients.id')->contains($verifiedRecipient->id)) {
                    $verifiedRecipient->notify(new DisallowedReplySendAttempt(
                        $this->inboundAlias,
                        $this->senderFrom,
                        $this->parser->getHeader('X-VovaMail-Authentication-Results')
                    ));

                    return ProcessingResult::rejected('Recipient not attached to alias');
                }
            }

            if ($this->parser->getHeader('In-Reply-To') && $this->alias) {
                $this->handleReply($validEmailDestination, $verifiedRecipient);
            } else {
                $this->handleSendFrom($aliasable, $validEmailDestination, $verifiedRecipient);
            }
        } elseif ($verifiedRecipient?->can_reply_send === false) {
            $verifiedRecipient->notify(new DisallowedReplySendAttempt(
                $this->inboundAlias,
                $this->senderFrom,
                $this->parser->getHeader('X-VovaMail-Authentication-Results')
            ));

            return ProcessingResult::rejected('Reply/send not allowed');
        } else {
            $this->handleForward($aliasable);
        }

        return ProcessingResult::success();
    }

    protected function shouldCheckDmarc(): bool
    {
        return true;
    }

    protected function handleUnsubscribe(): void
    {
        $alias = Alias::find($this->inboundAlias['local_part']);

        if ($alias && $alias->user->isVerifiedRecipient($this->senderFrom)) {
            $dmarcHeader = $this->parser->getHeader('X-VovaMail-Dmarc-Allow');
            if ($dmarcHeader || ! $this->shouldCheckDmarc()) {
                $alias->deactivate();
            }
        }
    }

    protected function handleReply(string $destination, $verifiedRecipient): void
    {
        $emailData = new EmailData($this->parser, $this->senderOption, $this->size, 'R');

        $ruleIdsAndActions = UserRuleChecker::getRuleIdsAndActionsForReplies($this->user, $emailData, $this->alias);
        $ruleIds = null;

        if (! empty($ruleIdsAndActions)) {
            if (UserRuleChecker::shouldBlockEmail($ruleIdsAndActions)) {
                $this->alias->increment('emails_blocked', 1, ['last_blocked' => now()]);

                return;
            }

            $ruleIds = array_keys($ruleIdsAndActions);
        }

        $message = new ReplyToEmail($this->user, $this->alias, $verifiedRecipient, $emailData, $ruleIds);

        Mail::to($destination)->queue($message);
    }

    protected function handleSendFrom(mixed $aliasable, string $destination, $verifiedRecipient): void
    {
        if (is_null($this->alias)) {
            $this->alias = $this->user->aliases()->create([
                'email' => $this->inboundAlias['local_part'].'@'.$this->inboundAlias['domain'],
                'local_part' => $this->inboundAlias['local_part'],
                'domain' => $this->inboundAlias['domain'],
                'aliasable_id' => $aliasable?->id,
                'aliasable_type' => $aliasable ? 'App\\Models\\'.class_basename($aliasable) : null,
                'description' => 'Created automatically by catch-all',
            ]);

            $this->alias->refresh();
            $isNewAlias = true;
        }

        $emailData = new EmailData($this->parser, $this->senderOption, $this->size, 'S');

        $ruleIdsAndActions = UserRuleChecker::getRuleIdsAndActionsForSends($this->user, $emailData, $this->alias);
        $ruleIds = null;

        if (! empty($ruleIdsAndActions)) {
            if (UserRuleChecker::shouldBlockEmail($ruleIdsAndActions)) {
                if ($isNewAlias ?? false) {
                    $this->alias->forceDelete();
                } else {
                    $this->alias->increment('emails_blocked', 1, ['last_blocked' => now()]);
                }

                return;
            }

            $ruleIds = array_keys($ruleIdsAndActions);
        }

        $message = new SendFromEmail($this->user, $this->alias, $verifiedRecipient, $emailData, $ruleIds);

        Mail::to($destination)->queue($message);
    }

    protected function handleForward(mixed $aliasable): void
    {
        if (is_null($this->alias)) {
            $this->alias = new Alias([
                'email' => $this->inboundAlias['local_part'].'@'.$this->inboundAlias['domain'],
                'local_part' => $this->inboundAlias['local_part'],
                'domain' => $this->inboundAlias['domain'],
                'aliasable_id' => $aliasable?->id,
                'aliasable_type' => $aliasable ? 'App\\Models\\'.class_basename($aliasable) : null,
                'description' => 'Created automatically by catch-all',
            ]);

            if ($this->user->hasExceededNewAliasLimit()) {
                return;
            }

            if ($this->inboundAlias['extension'] !== '') {
                $this->alias->extension = $this->inboundAlias['extension'];

                $keys = explode('.', $this->inboundAlias['extension']);

                $recipientIds = $this->user
                    ->recipients()
                    ->select(['id', 'email_verified_at'])
                    ->oldest()
                    ->get()
                    ->filter(fn ($item, $key) => in_array($key + 1, $keys) && ! is_null($item['email_verified_at']))
                    ->pluck('id')
                    ->take(10)
                    ->toArray();
            }

            $this->user->aliases()->save($this->alias);
            $this->alias->refresh();

            if (isset($recipientIds)) {
                $this->alias->recipients()->sync($recipientIds);
            }

            $isNewAlias = true;
        }

        $emailData = new EmailData($this->parser, $this->senderOption, $this->size);

        $ruleIdsAndActions = UserRuleChecker::getRuleIdsAndActionsForForwards($this->user, $emailData, $this->alias);
        $ruleIds = null;

        $recipientsToForwardTo = $this->alias->verifiedRecipientsOrDefault();

        if (! empty($ruleIdsAndActions)) {
            if (UserRuleChecker::shouldBlockEmail($ruleIdsAndActions)) {
                if ($isNewAlias ?? false) {
                    $this->alias->forceDelete();
                } else {
                    $this->alias->increment('emails_blocked', 1, ['last_blocked' => now()]);
                }

                return;
            }

            $ruleIds = array_keys($ruleIdsAndActions);

            $forwardToRecipientIds = UserRuleChecker::getRecipientIdsToForwardToFromRuleIdsAndActions($ruleIdsAndActions);

            if (! empty($forwardToRecipientIds)) {
                $ruleRecipients = $this->user->verifiedRecipients()->whereIn('id', $forwardToRecipientIds)->get();
                if ($ruleRecipients->isNotEmpty()) {
                    $recipientsToForwardTo = $ruleRecipients;
                }
            }
        }

        $recipientsToForwardTo->each(function ($aliasRecipient) use ($emailData, $ruleIds) {
            $message = new ForwardEmail($this->alias, $emailData, $aliasRecipient, false, $ruleIds);

            Mail::to($aliasRecipient->email)->queue($message);
        });
    }

    protected function handleBounce(OutboundMessage $outboundMessage): void
    {
        $attachments = collect($this->parser->getAttachments());

        $deliveryReport = $attachments->first(
            fn ($attachment) => $attachment->getContentType() === 'message/delivery-status'
        );

        if (! $deliveryReport) {
            return;
        }

        $outboundMessage->markAsBounced();

        $dsn = $this->parseDeliveryStatus($deliveryReport->getMimePartStr());

        $bouncedEmailAddress = isset($dsn['Final-recipient']) ? trim(Str::after($dsn['Final-recipient'], ';')) : null;
        $remoteMta = isset($dsn['Remote-mta']) ? trim(Str::after($dsn['Remote-mta'], ';')) : '';

        if (isset($dsn['Diagnostic-code']) && isset($dsn['Status'])) {
            $bounceType = $this->getBounceType($dsn['Diagnostic-code'], $dsn['Status']);
            $diagnosticCode = trim(Str::limit($dsn['Diagnostic-code'], 497));
        } else {
            $bounceType = null;
            $diagnosticCode = null;
        }

        $status = $dsn['Status'] ?? null;

        if ($status) {
            if (Str::length($status) > 5) {
                if (is_null($diagnosticCode)) {
                    $diagnosticCode = trim(Str::substr($status, 5, 497));
                }

                $status = trim(Str::substr($status, 0, 5));
            }
        }

        $undeliveredMessage = $attachments->first(
            fn ($attachment) => in_array($attachment->getContentType(), ['text/rfc822-headers', 'message/rfc822'])
        );

        $undeliveredMessageHeaders = [];

        if ($undeliveredMessage) {
            $undeliveredMessageHeaders = $this->parseDeliveryStatus($undeliveredMessage->getMimePartStr());
        }

        $user = $outboundMessage->user;
        $alias = $outboundMessage->alias;
        $recipient = $outboundMessage->recipient;
        $emailType = $outboundMessage->getRawOriginal('email_type');

        if ($user) {
            $failedDeliveryId = Uuid::uuid4();

            $isStored = false;

            if ($undeliveredMessage) {
                if ($user->store_failed_deliveries && ! in_array($emailType, ['VR', 'VU'])) {
                    $isStored = Storage::disk('local')->put("{$failedDeliveryId}.eml", $this->trimUndeliveredMessage($undeliveredMessage->getMimePartStr()));
                }
            }

            $isResend = ($undeliveredMessageHeaders['X-vovamail-resend'] ?? null) === 'Yes';

            $user->failedDeliveries()->create([
                'id' => $failedDeliveryId,
                'recipient_id' => $recipient->id ?? null,
                'alias_id' => $alias->id ?? null,
                'is_stored' => $isStored,
                'resent' => $isResend,
                'bounce_type' => $bounceType,
                'remote_mta' => $remoteMta ?: null,
                'sender' => $undeliveredMessageHeaders['X-vovamail-original-sender'] ?? null,
                'destination' => $bouncedEmailAddress,
                'email_type' => $emailType,
                'status' => $status,
                'code' => $diagnosticCode,
                'attempted_at' => $outboundMessage->created_at,
            ]);

            if ($alias) {
                if ($emailType === 'F' && $alias->emails_forwarded > 0) {
                    $alias->decrement('emails_forwarded');
                }

                if ($emailType === 'R' && $alias->emails_replied > 0) {
                    $alias->decrement('emails_replied');
                }

                if ($emailType === 'S' && $alias->emails_sent > 0) {
                    $alias->decrement('emails_sent');
                }
            }
        } else {
            Log::info('User not found from outbound message, may have been deleted.');
        }

        if (! in_array($emailType, ['FDN'])) {
            $notifiable = $recipient?->email_verified_at ? $recipient : $user?->defaultRecipient;

            if ($notifiable?->email_verified_at) {
                $notifiable->notify(new FailedDeliveryNotification(
                    $alias->email ?? null,
                    $undeliveredMessageHeaders['X-vovamail-original-sender'] ?? null,
                    $undeliveredMessageHeaders['Subject'] ?? null,
                    $isStored ?? false,
                    $user?->store_failed_deliveries,
                    $recipient?->email
                ));

                Log::info('FDN '.$emailType.': '.$notifiable->email);
            }
        }
    }

    protected function checkBandwidthLimit(): ?ProcessingResult
    {
        if ($this->user->hasReachedBandwidthLimit()) {
            $this->user->update(['reject_until' => now()->endOfMonth()]);

            return ProcessingResult::rejected('4.2.1 Bandwidth limit exceeded for user.');
        }

        if ($this->user->nearBandwidthLimit() && ! Cache::has("user:{$this->user->id}:near-bandwidth")) {
            $this->user->notify(new NearBandwidthLimit);

            Cache::put("user:{$this->user->id}:near-bandwidth", now()->toDateTimeString(), now()->addDay());
        }

        return null;
    }

    protected function checkRateLimit(): ?ProcessingResult
    {
        $exceeded = false;

        Redis::throttle("user:{$this->user->id}:limit:emails")
            ->allow(config('vovamail.limit'))
            ->every(3600)
            ->then(
                function () {},
                function () use (&$exceeded) {
                    $this->user->update(['defer_until' => now()->addHour()]);
                    $exceeded = true;
                }
            );

        if ($exceeded) {
            return ProcessingResult::rejected('4.2.1 Rate limit exceeded for user.');
        }

        return null;
    }

    protected function createParser(string $rawMime): Parser
    {
        $parser = new Parser;

        $parser->addMiddleware(function ($mimePart, $next) {
            $part = $mimePart->getPart();

            if (isset($part['headers']['from'])) {
                $value = $part['headers']['from'];
                $value = (is_array($value)) ? $value[0] : $value;

                try {
                    mailparse_rfc822_parse_addresses($value);
                } catch (\Exception $e) {
                    $part['headers']['from'] = str_replace('\\', '', $part['headers']['from']);
                    $mimePart->setPart($part);
                }
            }

            return $next($mimePart);
        });

        $parser->setText($rawMime);

        return $parser;
    }

    protected function resolveSender(string $fallback): string
    {
        try {
            $address = $this->parser->getAddresses('from')[0]['address'];

            return Str::contains($address, '@') && filter_var($address, FILTER_VALIDATE_EMAIL) ? $address : $fallback;
        } catch (\Exception $e) {
            return $fallback;
        }
    }

    protected function isFromSelf(string $sender): bool
    {
        return in_array($sender, [config('mail.from.address'), config('vovamail.return_path')]);
    }

    protected function parseDeliveryStatus(string $deliveryStatus): array
    {
        $lines = explode(PHP_EOL, $deliveryStatus);
        $result = [];

        foreach ($lines as $line) {
            if (preg_match('#^([^\s.]*):\s*(.*)\s*#', $line, $matches)) {
                $key = ucfirst(strtolower($matches[1]));

                if (empty($result[$key])) {
                    $result[$key] = trim($matches[2]);
                }
            } elseif (preg_match('/^\s+(.+)\s*/', $line) && isset($key)) {
                $result[$key] .= ' '.$line;
            }
        }

        return $result;
    }

    protected function trimUndeliveredMessage(string $message): string
    {
        return Str::after($message, 'Content-Type: message/rfc822'.PHP_EOL.PHP_EOL);
    }

    protected function getBounceType(string $code, string $status): string
    {
        if (preg_match("/(:?mailbox|address|user|account|recipient|@).*(:?rejected|unknown|disabled|unavailable|invalid|inactive|not exist|does(n't| not) exist)|(:?rejected|unknown|unavailable|no|illegal|invalid|no such).*(:?mailbox|address|user|account|recipient|alias)|(:?address|user|recipient) does(n't| not) have .*(:?mailbox|account)|returned to sender|(:?auth).*(:?required)/i", $code)) {
            if (Str::startsWith($status, '4')) {
                return 'soft';
            }

            return 'hard';
        }

        if (preg_match('/(:?spam|unsolicited|blacklisting|blacklisted|blacklist|554|mail content denied|reject for policy reason|mail rejected by destination domain|security issue)/i', $code)) {
            return 'spam';
        }

        if (Str::startsWith($status, '5')) {
            return 'hard';
        }

        return 'soft';
    }

    protected function getIdFromVerp(string $verp): ?string
    {
        $localPart = Str::beforeLast($verp, '@');
        $parts = explode('_', $localPart);

        if (count($parts) !== 3) {
            Log::info('VERP invalid email: '.$verp);

            return null;
        }

        try {
            $id = Base32::decodeNoPadding($parts[1]);
            $signature = Base32::decodeNoPadding($parts[2]);
        } catch (\Exception $e) {
            Log::info('VERP base32 decode failure: '.$verp.' '.$e->getMessage());

            return null;
        }

        $expectedSignature = substr(hash_hmac('sha3-224', $id, config('vovamail.secret')), 0, 8);

        if ($signature !== $expectedSignature) {
            Log::info('VERP invalid signature: '.$verp);

            return null;
        }

        return $id;
    }
}
