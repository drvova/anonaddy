<?php

namespace Tests\Feature;

use App\Models\Alias;
use App\Models\FailedDelivery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ParsePostfixMailLogTest extends TestCase
{
    use RefreshDatabase;

    protected $logPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = $this->createUser();

        Storage::fake('local');
        $this->logPath = storage_path('app/mail.log');
        Config::set('vovamail.postfix_log_path', $this->logPath);
        Config::set('vovamail.all_domains', ['vovamail.xyz']);
    }

    protected function tearDown(): void
    {
        if (file_exists($this->logPath)) {
            unlink($this->logPath);
        }
        parent::tearDown();
    }

    public function test_it_parses_rejection_lines_and_creates_failed_delivery_for_users()
    {
        $alias = Alias::factory()->create(['user_id' => $this->user->id, 'email' => 'test@vovamail.xyz']);

        $logContent = "Mar 17 10:30:00 server postfix/smtpd[12345]: NOQUEUE: reject: RCPT from unknown[1.2.3.4]: 450 4.7.1 Client host rejected: cannot find your hostname; from=<s@x.com> to=<test@vovamail.xyz> proto=ESMTP helo=<1.2.3.4>\n";
        file_put_contents($this->logPath, $logContent);

        $this->artisan('vovamail:parse-postfix-mail-log')->assertExitCode(0);

        $this->assertDatabaseHas('failed_deliveries', [
            'user_id' => $this->user->id,
            'alias_id' => $alias->id,
            'email_type' => 'IR',
            'code' => '450 4.7.1 Client host rejected: cannot find your hostname',
            'status' => '450',
            'remote_mta' => 'unknown[1.2.3.4]',
        ]);

        $failedDelivery = FailedDelivery::first();
        $this->assertEquals('s@x.com', $failedDelivery->sender);
        $this->assertEquals('test@vovamail.xyz', $failedDelivery->destination);
    }

    public function test_it_skips_missing_alias()
    {
        $logContent = "Mar 17 10:30:00 server postfix/smtpd[12345]: NOQUEUE: reject: RCPT from unknown[1.2.3.4]: 450 4.7.1 Client host rejected; from=<s@x.com> to=<nobody@vovamail.xyz> proto=ESMTP helo=<1.2.3.4>\n";
        file_put_contents($this->logPath, $logContent);

        $this->artisan('vovamail:parse-postfix-mail-log')->assertExitCode(0);

        $this->assertDatabaseCount('failed_deliveries', 0);
    }

    public function test_it_rejects_non_file_log_paths()
    {
        Config::set('vovamail.postfix_log_path', storage_path('app'));

        $this->artisan('vovamail:parse-postfix-mail-log')->assertExitCode(1);
    }

    public function test_it_skips_rejection_lines_with_invalid_timestamps()
    {
        Alias::factory()->create(['user_id' => $this->user->id, 'email' => 'test@vovamail.xyz']);

        $logContent = "NotADate server postfix/smtpd[12345]: NOQUEUE: reject: RCPT from unknown[1.2.3.4]: 450 4.7.1 Client host rejected; from=<s@x.com> to=<test@vovamail.xyz> proto=ESMTP helo=<1.2.3.4>\n";
        file_put_contents($this->logPath, $logContent);

        $this->artisan('vovamail:parse-postfix-mail-log')->assertExitCode(0);

        $this->assertDatabaseCount('failed_deliveries', 0);
    }

    public function test_it_handles_log_rotation_and_maintains_position()
    {
        $alias = Alias::factory()->create(['user_id' => $this->user->id, 'email' => 'test@vovamail.xyz']);

        $logContent1 = "Mar 17 10:30:00 server postfix/smtpd[12345]: NOQUEUE: reject: RCPT from unknown[1.2.3.4]: 450 4.7.1 Client host rejected; from=<s@x.com> to=<test@vovamail.xyz>\n";
        file_put_contents($this->logPath, $logContent1);

        $this->artisan('vovamail:parse-postfix-mail-log')->assertExitCode(0);
        $this->assertDatabaseCount('failed_deliveries', 1);

        // Add a second line to same file
        $logContent2 = "Mar 17 10:31:00 server postfix/smtpd[12345]: NOQUEUE: reject: RCPT from unknown[1.2.3.4]: 450 4.7.1 Client host rejected; from=<b@x.com> to=<test@vovamail.xyz>\n";
        file_put_contents($this->logPath, $logContent1.$logContent2);

        $this->artisan('vovamail:parse-postfix-mail-log')->assertExitCode(0);
        $this->assertDatabaseCount('failed_deliveries', 2);

        // Simulate log rotation (file smaller)
        $logContent3 = "Mar 17 10:32:00 server postfix/smtpd[12345]: NOQUEUE: reject: RCPT from unknown[1.2.3.4]: 450 4.7.1 Client host rejected; from=<c@x.com> to=<test@vovamail.xyz>\n";
        file_put_contents($this->logPath, $logContent3);

        $this->artisan('vovamail:parse-postfix-mail-log')->assertExitCode(0);
        $this->assertDatabaseCount('failed_deliveries', 3);
    }

    public function test_it_prevents_duplicate_rejections()
    {
        $alias = Alias::factory()->create(['user_id' => $this->user->id, 'email' => 'test@vovamail.xyz']);

        $logContent = "Mar 17 10:30:00 server postfix/smtpd[12345]: NOQUEUE: reject: RCPT from unknown[1.2.3.4]: 450 4.7.1 Client host rejected; from=<s@x.com> to=<test@vovamail.xyz>\n";
        file_put_contents($this->logPath, $logContent);

        $this->artisan('vovamail:parse-postfix-mail-log')->assertExitCode(0);
        $this->assertDatabaseCount('failed_deliveries', 1);

        // Reset position to force re-reading the same line
        Storage::disk('local')->put('postfix_log_position.txt', '0');

        $this->artisan('vovamail:parse-postfix-mail-log')->assertExitCode(0);
        $this->assertDatabaseCount('failed_deliveries', 1); // Should not duplicate
    }

    public function test_it_parses_milter_reject_lines()
    {
        $alias = Alias::factory()->create(['user_id' => $this->user->id, 'email' => 'test@vovamail.xyz']);

        $logContent = "Mar 18 12:53:05 mail2 postfix/cleanup[1661539]: 7EB9BFF16A: milter-reject: END-OF-MESSAGE from mx.abc.eu[86.106.123.126]: 5.7.1 Spam message rejected; from=<noreply@hi.market> to=<test@vovamail.xyz> proto=ESMTP helo=<mx.abc.eu>\n";
        file_put_contents($this->logPath, $logContent);

        $this->artisan('vovamail:parse-postfix-mail-log')->assertExitCode(0);

        $this->assertDatabaseHas('failed_deliveries', [
            'user_id' => $this->user->id,
            'alias_id' => $alias->id,
            'email_type' => 'IR',
            'code' => '5.7.1 Spam message rejected',
            'status' => '5.7.1',
            'remote_mta' => 'mx.abc.eu[86.106.123.126]',
            'bounce_type' => 'spam',
        ]);

        $failedDelivery = FailedDelivery::first();
        $this->assertEquals('noreply@hi.market', $failedDelivery->sender);
        $this->assertEquals('test@vovamail.xyz', $failedDelivery->destination);
    }

    public function test_it_parses_discard_lines()
    {
        $alias = Alias::factory()->create(['user_id' => $this->user->id, 'email' => 'caloric.test@vovamail.xyz']);

        $logContent = "Mar 18 06:55:15 mail2 postfix/smtpd[1491842]: NOQUEUE: discard: RCPT from a.b.com[52.48.1.81]: <caloric.test@vovamail.xyz>: Recipient address is inactive alias; from=<takedown@b.com> to=<caloric.test@vovamail.xyz> proto=SMTP helo=<a.b.com>\n";
        file_put_contents($this->logPath, $logContent);

        $this->artisan('vovamail:parse-postfix-mail-log')->assertExitCode(0);

        $this->assertDatabaseHas('failed_deliveries', [
            'user_id' => $this->user->id,
            'alias_id' => $alias->id,
            'email_type' => 'IR',
            'code' => 'Recipient address is inactive alias',
            'status' => '',
            'remote_mta' => 'a.b.com[52.48.1.81]',
            'bounce_type' => 'hard',
        ]);

        $failedDelivery = FailedDelivery::first();
        $this->assertEquals('takedown@b.com', $failedDelivery->sender);
        $this->assertEquals('caloric.test@vovamail.xyz', $failedDelivery->destination);
    }
}
