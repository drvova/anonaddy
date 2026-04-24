<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes
|--------------------------------------------------------------------------
|
| This file is where you may define all of your Closure based console
| commands. Each Closure is bound to a command instance allowing a
| simple approach to interacting with each command's IO methods.
|
*/

Schedule::command('vovamail:reset-bandwidth')->monthlyOn(1, '00:00');
Schedule::command('vovamail:check-domains-sending-verification')->daily();
Schedule::command('vovamail:check-domains-mx-validation')->daily();
Schedule::command('vovamail:clear-failed-deliveries')->daily();
Schedule::command('vovamail:clear-outbound-messages')->everySixHours();
Schedule::command('vovamail:email-users-with-token-expiring-soon')->daily();
Schedule::command('vovamail:parse-postfix-mail-log')->everyFiveMinutes();
Schedule::command('auth:clear-resets')->daily();
Schedule::command('sanctum:prune-expired --hours=168')->daily();
Schedule::command('cache:prune-stale-tags')->hourly();
