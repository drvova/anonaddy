<?php

namespace Tests\Feature;

use App\Mail\SendFromEmail;
use App\Models\Alias;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Mail;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SendFromEmailTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = $this->createUser('johndoe', 'will@vovamail.xyz');
    }

    #[Test]
    public function it_can_send_email_from_alias_from_file()
    {
        Mail::fake();

        Mail::assertNothingSent();

        Alias::factory()->create([
            'user_id' => $this->user->id,
            'email' => 'ebay@johndoe.'.config('vovamail.domain'),
            'local_part' => 'ebay',
            'domain' => 'johndoe.'.config('vovamail.domain'),
        ]);

        $extension = 'contact=ebay.com';

        $this->receiveEmailFromFixture('tests/emails/email_send_from_alias.eml', [
            '--sender' => $this->user->email,
            '--recipient' => ['ebay+'.$extension.'@johndoe.vovamail.xyz'],
            '--local_part' => ['ebay'],
            '--extension' => [$extension],
            '--domain' => ['johndoe.vovamail.xyz'],
            '--size' => '1000',
        ]
        )->assertExitCode(0);

        $this->assertEquals(1, $this->user->aliases()->count());

        Mail::assertQueued(SendFromEmail::class, function ($mail) {
            return $mail->hasTo('contact@ebay.com');
        });
    }

    #[Test]
    public function it_can_send_from_alias_to_multiple_emails_from_file()
    {
        Mail::fake();

        Mail::assertNothingSent();

        Alias::factory()->create([
            'user_id' => $this->user->id,
            'email' => 'ebay@johndoe.'.config('vovamail.domain'),
            'local_part' => 'ebay',
            'domain' => 'johndoe.'.config('vovamail.domain'),
        ]);

        $extension1 = 'contact=ebay.com';
        $extension2 = 'support=ebay.com';

        $this->receiveEmailFromFixture('tests/emails/email_multiple_send_from.eml', [
            '--sender' => $this->user->email,
            '--recipient' => [
                'ebay+'.$extension1.'@johndoe.vovamail.xyz',
                'ebay+'.$extension2.'@johndoe.vovamail.xyz',
            ],
            '--local_part' => ['ebay', 'ebay'],
            '--extension' => [$extension1, $extension2],
            '--domain' => ['johndoe.vovamail.xyz', 'johndoe.vovamail.xyz'],
            '--size' => '1000',
        ]
        )->assertExitCode(0);

        $this->assertEquals(1, $this->user->aliases()->count());

        Mail::assertQueued(SendFromEmail::class, function ($mail) {
            return $mail->hasTo('contact@ebay.com');
        });

        Mail::assertQueued(SendFromEmail::class, function ($mail) {
            return $mail->hasTo('support@ebay.com');
        });
    }

    #[Test]
    public function it_can_send_email_from_catch_all_alias_that_does_not_yet_exist()
    {
        Mail::fake();

        Mail::assertNothingSent();

        $extension = 'contact=ebay.com';

        $this->assertDatabaseMissing('aliases', [
            'email' => 'ebay@johndoe.vovamail.xyz',
        ]);

        $this->receiveEmailFromFixture('tests/emails/email_send_from_alias.eml', [
            '--sender' => $this->user->email,
            '--recipient' => ['ebay+'.$extension.'@johndoe.vovamail.xyz'],
            '--local_part' => ['ebay'],
            '--extension' => [$extension],
            '--domain' => ['johndoe.vovamail.xyz'],
            '--size' => '1000',
        ]
        )->assertExitCode(0);

        $this->assertDatabaseHas('aliases', [
            'email' => 'ebay@johndoe.vovamail.xyz',
            'local_part' => 'ebay',
            'domain' => 'johndoe.vovamail.xyz',
            'emails_forwarded' => 0,
            'emails_blocked' => 0,
            'emails_replied' => 0,
        ]);
        $this->assertEquals(1, $this->user->aliases()->count());

        $this->assertEquals('Created automatically by catch-all', $this->user->aliases()->first()->description);

        Mail::assertQueued(SendFromEmail::class, function ($mail) {
            return $mail->hasTo('contact@ebay.com');
        });
    }
}
