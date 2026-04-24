<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\CustomResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CreateUserTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_creates_a_user_without_exposing_a_login_password(): void
    {
        Notification::fake();

        $this->artisan('vovamail:create-user', [
            'username' => 'newuser',
            'email' => 'newuser@example.com',
        ])
            ->expectsOutputToContain('Created user: "newuser"')
            ->expectsOutputToContain('A password reset link has been sent to the user.')
            ->doesntExpectOutputToContain('default password')
            ->assertExitCode(0);

        $user = User::whereRelation('defaultUsername', 'username', 'newuser')->firstOrFail();

        $this->assertSame('newuser@example.com', $user->defaultRecipient->email);
        $this->assertFalse(Hash::check($user->id, $user->password));

        Notification::assertSentTo($user, CustomResetPassword::class, function (CustomResetPassword $notification) use ($user) {
            return str_contains($notification->toMail($user)->actionUrl, 'username=newuser');
        });
    }

    #[Test]
    public function it_does_not_create_partial_records_when_validation_fails(): void
    {
        Notification::fake();

        $this->artisan('vovamail:create-user', [
            'username' => 'bad user',
            'email' => 'not-an-email',
        ])->assertExitCode(1);

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('usernames', 0);
        $this->assertDatabaseCount('recipients', 0);
        Notification::assertNothingSent();
    }
}
