<?php

namespace Tests\Feature;

use App\Models\Alias;
use App\Models\BlockedSender;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BlocklistCheckApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = $this->createUser('johndoe');
        config(['vovamail.blocklist.allowed_ips' => ['127.0.0.1'], 'vovamail.blocklist.secret' => '']);
    }

    #[Test]
    public function returns_401_when_secret_required_and_missing(): void
    {
        config(['vovamail.blocklist.secret' => 'shared-secret']);
        config(['vovamail.blocklist.allowed_ips' => ['127.0.0.1']]);

        $response = $this->getJson('/api/blocklist-check?recipient=test@johndoe.'.config('vovamail.domain').'&from_email=spam@example.com');

        $response->assertStatus(401)->assertJson(['error' => 'Unauthorized']);
    }

    #[Test]
    public function returns_401_when_secret_required_and_wrong(): void
    {
        config(['vovamail.blocklist.secret' => 'shared-secret']);
        config(['vovamail.blocklist.allowed_ips' => ['127.0.0.1']]);

        $response = $this->getJson('/api/blocklist-check?recipient=test@johndoe.'.config('vovamail.domain').'&from_email=spam@example.com', [
            'X-Blocklist-Secret' => 'wrong-secret',
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function returns_403_when_ip_not_allowed(): void
    {
        config(['vovamail.blocklist.allowed_ips' => ['10.0.0.1']]);

        $response = $this->withServerVariables(['REMOTE_ADDR' => '192.168.1.1'])
            ->getJson('/api/blocklist-check?recipient=test@johndoe.'.config('vovamail.domain').'&from_email=spam@example.com');

        $response->assertStatus(403)->assertJson(['error' => 'Forbidden']);
    }

    #[Test]
    public function returns_422_when_recipient_missing(): void
    {
        $response = $this->getJson('/api/blocklist-check?from_email=spam@example.com');

        $response->assertStatus(422)->assertJsonValidationErrors(['recipient']);
    }

    #[Test]
    public function returns_block_false_when_recipient_unknown(): void
    {
        $response = $this->getJson('/api/blocklist-check?recipient=unknown@other.com&from_email=spam@example.com');

        $response->assertStatus(200)->assertJson(['block' => false]);
    }

    #[Test]
    public function returns_block_false_when_not_blocked(): void
    {
        Alias::factory()->create([
            'email' => 'ebay@johndoe.'.config('vovamail.domain'),
            'user_id' => $this->user->id,
        ]);

        $response = $this->getJson('/api/blocklist-check?recipient=ebay@johndoe.'.config('vovamail.domain').'&from_email=newsletter@example.com');

        $response->assertStatus(200)->assertJson(['block' => false]);
    }

    #[Test]
    public function returns_block_true_when_email_blocked(): void
    {
        Alias::factory()->create([
            'email' => 'ebay@johndoe.'.config('vovamail.domain'),
            'user_id' => $this->user->id,
        ]);
        BlockedSender::create([
            'user_id' => $this->user->id,
            'type' => 'email',
            'value' => 'spam@example.com',
        ]);

        $response = $this->getJson('/api/blocklist-check?recipient=ebay@johndoe.'.config('vovamail.domain').'&from_email=spam@example.com');

        $response->assertStatus(200)->assertJson(['block' => true]);
    }

    #[Test]
    public function returns_block_true_when_domain_blocked(): void
    {
        Alias::factory()->create([
            'email' => 'ebay@johndoe.'.config('vovamail.domain'),
            'user_id' => $this->user->id,
        ]);
        BlockedSender::create([
            'user_id' => $this->user->id,
            'type' => 'domain',
            'value' => 'spammer.com',
        ]);

        $response = $this->getJson('/api/blocklist-check?recipient=ebay@johndoe.'.config('vovamail.domain').'&from_email=news@spammer.com');

        $response->assertStatus(200)->assertJson(['block' => true]);
    }

    #[Test]
    public function increments_blocked_count_and_last_blocked_on_blocked_sender(): void
    {
        Alias::factory()->create([
            'email' => 'ebay@johndoe.'.config('vovamail.domain'),
            'user_id' => $this->user->id,
        ]);
        $blockedSender = BlockedSender::create([
            'user_id' => $this->user->id,
            'type' => 'email',
            'value' => 'spam@example.com',
        ]);

        $this->assertEquals(0, $blockedSender->blocked);
        $this->assertNull($blockedSender->last_blocked);

        $this->getJson('/api/blocklist-check?recipient=ebay@johndoe.'.config('vovamail.domain').'&from_email=spam@example.com')
            ->assertJson(['block' => true]);

        $blockedSender->refresh();
        $this->assertEquals(1, $blockedSender->blocked);
        $this->assertNotNull($blockedSender->last_blocked);

        $this->getJson('/api/blocklist-check?recipient=ebay@johndoe.'.config('vovamail.domain').'&from_email=spam@example.com')
            ->assertJson(['block' => true]);

        $blockedSender->refresh();
        $this->assertEquals(2, $blockedSender->blocked);
    }

    #[Test]
    public function increments_blocked_count_on_domain_blocked_sender(): void
    {
        Alias::factory()->create([
            'email' => 'ebay@johndoe.'.config('vovamail.domain'),
            'user_id' => $this->user->id,
        ]);
        $blockedSender = BlockedSender::create([
            'user_id' => $this->user->id,
            'type' => 'domain',
            'value' => 'spammer.com',
        ]);

        $this->assertEquals(0, $blockedSender->blocked);

        $this->getJson('/api/blocklist-check?recipient=ebay@johndoe.'.config('vovamail.domain').'&from_email=news@spammer.com')
            ->assertJson(['block' => true]);

        $blockedSender->refresh();
        $this->assertEquals(1, $blockedSender->blocked);
        $this->assertNotNull($blockedSender->last_blocked);
    }

    #[Test]
    public function returns_200_with_secret_header_when_secret_required(): void
    {
        config(['vovamail.blocklist.secret' => 'shared-secret']);
        config(['vovamail.blocklist.allowed_ips' => []]);

        $response = $this->getJson('/api/blocklist-check?recipient=foo@bar.com&from_email=a@b.com', [
            'X-Blocklist-Secret' => 'shared-secret',
        ]);

        $response->assertStatus(200)->assertJson(['block' => false]);
    }
}
