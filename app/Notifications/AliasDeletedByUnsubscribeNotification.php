<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Symfony\Component\Mime\Email;

class AliasDeletedByUnsubscribeNotification extends Notification implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable;

    public function __construct(
        protected string $aliasEmail,
        protected ?string $ipAddress = null,
        protected ?string $userAgent = null,
        protected ?string $timestamp = null,
    ) {}

    /**
     * @param  mixed  $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail'];
    }

    /**
     * @param  mixed  $notifiable
     * @return MailMessage
     */
    public function toMail($notifiable)
    {
        $recipient = $notifiable->defaultRecipient;
        $fingerprint = $recipient->should_encrypt ? $recipient->fingerprint : null;

        return (new MailMessage)
            ->subject('Alias deleted via one-click unsubscribe')
            ->markdown('mail.alias_deleted_by_unsubscribe', [
                'aliasEmail' => $this->aliasEmail,
                'ipAddress' => $this->ipAddress,
                'userAgent' => $this->userAgent,
                'timestamp' => $this->timestamp,
                'userId' => $notifiable->id,
                'recipientId' => $notifiable->default_recipient_id,
                'emailType' => 'ADLN',
                'fingerprint' => $fingerprint,
            ])
            ->withSymfonyMessage(function (Email $message) {
                $message->getHeaders()
                    ->addTextHeader('Feedback-ID', 'ADLN:vovamail');
            });
    }

    /**
     * @param  mixed  $notifiable
     * @return array
     */
    public function toArray($notifiable)
    {
        return [];
    }
}
