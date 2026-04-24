<?php

namespace App\Console\Commands;

use App\Models\Recipient;
use App\Models\User;
use App\Models\Username;
use App\Rules\NotDeletedUsername;
use App\Rules\NotLocalRecipient;
use App\Rules\RegisterUniqueRecipient;
use Illuminate\Auth\Events\Registered;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Ramsey\Uuid\Uuid;
use RuntimeException;

class CreateUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vovamail:create-user {username} {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Creates a new user';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $validator = Validator::make(
            [
                'username' => $this->argument('username'),
                'email' => $this->argument('email'),
            ],
            [
                'username' => [
                    'required',
                    'regex:/^[a-zA-Z0-9]*$/',
                    'max:20',
                    'unique:usernames,username',
                    new NotDeletedUsername,
                ],
                'email' => [
                    'required',
                    'email:rfc,dns',
                    'max:254',
                    new RegisterUniqueRecipient,
                    new NotLocalRecipient,
                ],
            ]
        );

        if ($validator->fails()) {
            $errors = $validator->errors();
            foreach ($errors->all() as $message) {
                $this->error($message);
            }

            return 1;
        }

        try {
            $user = DB::transaction(function (): User {
                $userId = Uuid::uuid4()->toString();

                $recipient = Recipient::create([
                    'email' => $this->argument('email'),
                    'user_id' => $userId,
                ]);

                $username = Username::create([
                    'username' => $this->argument('username'),
                    'user_id' => $userId,
                ]);

                $twoFactor = app('pragmarx.google2fa');

                $user = User::create([
                    'id' => $userId,
                    'default_username_id' => $username->id,
                    'default_recipient_id' => $recipient->id,
                    'password' => Hash::make(Str::password(64)),
                    'two_factor_secret' => $twoFactor->generateSecretKey(),
                ]);

                event(new Registered($user));

                $resetResponse = Password::broker()->sendResetLink(['id' => $user->id]);

                if ($resetResponse !== Password::RESET_LINK_SENT) {
                    throw new RuntimeException(trans($resetResponse));
                }

                return $user->load('defaultUsername');
            });
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return 1;
        }

        $this->info('Created user: "'.$user->username.'" with user_id: "'.$user->id.'"');
        $this->info('A password reset link has been sent to the user.');

        return 0;
    }
}
