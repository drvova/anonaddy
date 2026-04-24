<?php

namespace App\CustomMailDriver\Transports;

use Illuminate\Http\Client\Factory;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Email;

class ZeaburTransport extends AbstractTransport
{
    public function __construct(
        private readonly Factory $http,
        private readonly string $apiKey,
        private readonly string $baseUrl = 'https://api.zeabur.com/api/v1/zsend',
        private readonly int $timeout = 30,
        ?EventDispatcherInterface $dispatcher = null,
        ?LoggerInterface $logger = null,
    ) {
        parent::__construct($dispatcher, $logger);
    }

    public function __toString(): string
    {
        return 'zeabur';
    }

    protected function doSend(SentMessage $message): void
    {
        if (blank($this->apiKey)) {
            throw new TransportException('Zeabur Email API key is not configured.');
        }

        $originalMessage = $message->getOriginalMessage();

        if (! $originalMessage instanceof Email) {
            throw new TransportException('Zeabur transport only supports Symfony email messages.');
        }

        $envelope = $message->getEnvelope();
        $sender = $envelope->getSender()->getAddress();
        $recipients = array_map(
            fn ($addr) => $addr->getAddress(),
            $envelope->getRecipients()
        );

        if ($recipients === []) {
            throw new TransportException('Zeabur transport requires at least one recipient.');
        }

        $payload = [
            'from' => $sender,
            'to' => $recipients,
            'subject' => (string) $originalMessage->getSubject(),
            'html' => $originalMessage->getHtmlBody() ?? '',
            'text' => $originalMessage->getTextBody() ?? '',
        ];

        $cc = array_map(fn ($addr) => $addr->getAddress(), $originalMessage->getCc());
        if ($cc !== []) {
            $payload['cc'] = $cc;
        }

        $bcc = array_map(fn ($addr) => $addr->getAddress(), $originalMessage->getBcc());
        if ($bcc !== []) {
            $payload['bcc'] = $bcc;
        }

        $replyTo = array_map(fn ($addr) => $addr->getAddress(), $originalMessage->getReplyTo());
        if ($replyTo !== []) {
            $payload['reply_to'] = $replyTo;
        }

        $headers = [];
        foreach ($originalMessage->getHeaders()->all() as $header) {
            $name = $header->getName();
            if (in_array($name, ['From', 'To', 'Cc', 'Bcc', 'Reply-To', 'Subject', 'Date', 'MIME-Version', 'Content-Type', 'Content-Transfer-Encoding'], true)) {
                continue;
            }
            $headers[$name] = $header->getBodyAsString();
        }
        if ($headers !== []) {
            $payload['headers'] = $headers;
        }

        $attachments = [];
        foreach ($originalMessage->getAttachments() as $attachment) {
            $attachments[] = [
                'filename' => $attachment->getName(),
                'content' => base64_encode($attachment->getBody()),
                'content_type' => $attachment->getMediaType().'/'.$attachment->getMediaSubtype(),
            ];
        }
        if ($attachments !== []) {
            $payload['attachments'] = $attachments;
        }

        $response = $this->http
            ->withToken($this->apiKey, 'Bearer')
            ->acceptJson()
            ->asJson()
            ->timeout($this->timeout)
            ->post(rtrim($this->baseUrl, '/').'/emails', $payload);

        if (! $response->successful()) {
            throw new TransportException(sprintf(
                'Zeabur API rejected the email with status %s: %s',
                $response->status(),
                $response->body()
            ));
        }

        $result = $response->json();

        $message->setMessageId($result['id'] ?? '');

        $message->appendDebug('zeabur:'.json_encode([
            'provider' => 'zeabur',
            'id' => $result['id'] ?? null,
            'message_id' => $result['message_id'] ?? null,
            'status' => $result['status'] ?? 'unknown',
        ], JSON_UNESCAPED_SLASHES));
    }
}
