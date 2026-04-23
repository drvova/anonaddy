<?php

namespace App\CustomMailDriver\Transports;

use Illuminate\Http\Client\Factory;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Email;

class CloudflareTransport extends AbstractTransport
{
    public function __construct(
        private readonly Factory $http,
        private readonly string $apiToken,
        private readonly string $accountId,
        private readonly string $baseUrl = 'https://api.cloudflare.com/client/v4',
        private readonly int $timeout = 30,
        ?EventDispatcherInterface $dispatcher = null,
        ?LoggerInterface $logger = null,
    ) {
        parent::__construct($dispatcher, $logger);
    }

    public function __toString(): string
    {
        return 'cloudflare';
    }

    protected function doSend(SentMessage $message): void
    {
        if (blank($this->apiToken)) {
            throw new TransportException('Cloudflare API token is not configured.');
        }

        if (blank($this->accountId)) {
            throw new TransportException('Cloudflare account ID is not configured.');
        }

        $originalMessage = $message->getOriginalMessage();

        if (! $originalMessage instanceof Email) {
            throw new TransportException('Cloudflare transport only supports Symfony email messages.');
        }

        $envelope = $message->getEnvelope();
        $mimeMessage = $originalMessage->toString();

        $sender = $envelope->getSender()->getAddress();
        $recipients = array_map(
            fn ($addr) => $addr->getAddress(),
            $envelope->getRecipients()
        );

        if ($recipients === []) {
            throw new TransportException('Cloudflare transport requires at least one recipient.');
        }

        $response = $this->http
            ->withToken($this->apiToken)
            ->acceptJson()
            ->asJson()
            ->timeout($this->timeout)
            ->post(
                rtrim($this->baseUrl, '/')."/accounts/{$this->accountId}/email/sending/send_raw",
                [
                    'from' => $sender,
                    'mime_message' => $mimeMessage,
                    'recipients' => $recipients,
                ]
            );

        if (! $response->successful()) {
            throw new TransportException(sprintf(
                'Cloudflare API rejected the email with status %s: %s',
                $response->status(),
                $response->body()
            ));
        }

        $result = $response->json('result', []);
        $messageId = $originalMessage->getHeaders()->get('Message-ID')?->getBodyAsString() ?? '';

        $message->setMessageId($messageId);

        $message->appendDebug('cloudflare:'.json_encode([
            'provider' => 'cloudflare',
            'message_id' => $messageId,
            'delivered' => $result['delivered'] ?? [],
            'permanent_bounces' => $result['permanent_bounces'] ?? [],
            'queued' => $result['queued'] ?? [],
            'status' => $this->resolveStatus($result),
        ], JSON_UNESCAPED_SLASHES));
    }

    /**
     * @param  array<string, mixed>  $result
     */
    private function resolveStatus(array $result): string
    {
        $bounces = $result['permanent_bounces'] ?? [];

        if ($bounces !== []) {
            return 'bounced';
        }

        $queued = $result['queued'] ?? [];

        if ($queued !== []) {
            return 'queued';
        }

        $delivered = $result['delivered'] ?? [];

        if ($delivered !== []) {
            return 'delivered';
        }

        return 'unknown';
    }
}
