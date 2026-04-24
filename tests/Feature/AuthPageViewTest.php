<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuthPageViewTest extends TestCase
{
    #[Test]
    public function guest_auth_pages_use_branded_titles_and_logo(): void
    {
        $pages = [
            ['/login', '<title>Sign in — VovaMail</title>', 'Protect the inbox you actually use.'],
            ['/password/reset', '<title>Reset password — VovaMail</title>', null],
            ['/password/reset/test-token', '<title>Choose a new password — VovaMail</title>', null],
            ['/username/reminder', '<title>Recover your username — VovaMail</title>', null],
        ];

        if (config('vovamail.enable_registration')) {
            $pages[] = ['/register', '<title>Create account — VovaMail</title>', 'Protect the inbox you actually use.'];
        }

        foreach ($pages as [$uri, $title, $copy]) {
            $response = $this->get($uri)
                ->assertOk()
                ->assertSee($title, false)
                ->assertSee('/svg/logo.svg');

            if ($copy) {
                $response->assertSee($copy);
            }
        }
    }

    #[Test]
    public function landing_page_uses_the_vovamail_title(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('<title>VovaMail — Encrypted email aliases</title>', false)
            ->assertSee('/svg/logo.svg')
            ->assertSee('Email aliases with a real kill switch.');
    }

    #[Test]
    public function generated_asset_urls_use_https_when_the_app_url_is_secure(): void
    {
        $this->get('/')->assertOk();

        $assetUrl = URL::asset('build/assets/app.css');

        $this->assertSame('https', parse_url($assetUrl, PHP_URL_SCHEME));
    }
}
