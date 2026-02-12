<?php

namespace Tests\Feature;

use Exception;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Mail;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CustomMailerFailureVisibilityTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function it_throws_on_transport_failure_without_user_context()
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => '127.0.0.1',
            'mail.mailers.smtp.port' => 1,
            'mail.mailers.smtp.encryption' => null,
            'mail.mailers.smtp.username' => null,
            'mail.mailers.smtp.password' => null,
            'mail.mailers.smtp.timeout' => 1,
        ]);

        app('mail.manager')->forgetMailers();

        $this->expectException(Exception::class);

        Mail::raw('transport failure probe', function ($message) {
            $message->to('recipient@example.com')
                ->subject('Transport Failure Probe');
        });
    }
}
