<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AppPageViewTest extends TestCase
{
    #[Test]
    public function inertia_app_layout_uses_the_neutral_vovamail_shell_title(): void
    {
        $layout = file_get_contents(resource_path('views/layouts/app.blade.php'));

        $this->assertStringContainsString('<title>VovaMail</title>', $layout);
        $this->assertStringNotContainsString('Encrypted email aliases', $layout);
    }

    #[Test]
    public function inertia_client_bootstrap_supports_script_element_page_payloads(): void
    {
        $bootstrap = file_get_contents(resource_path('js/lib/inertia/createInertiaApp.ts'));

        $this->assertStringContainsString('script[data-page', $bootstrap);
        $this->assertStringContainsString('Inertia initial page payload was not found', $bootstrap);
        $this->assertStringNotContainsString('JSON.parse(el.dataset.page)', $bootstrap);
    }
}
