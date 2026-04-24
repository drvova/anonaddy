<?php

use App\Http\Middleware\BlocklistApiMiddleware;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ProxyAuthentication;
use App\Http\Middleware\VerifyTwoFactorAuthMethods;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        api: __DIR__.'/../routes/api.php',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->throttleWithRedis();
        $middleware->throttleApi('api', true);
        $middleware->authenticateSessions();
        $middleware->statefulApi();

        $middleware->trustProxies(at: [
            '10.0.0.0/8',
            '127.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
            '::1/128',
            'fc00::/7',
            'fe80::/10',
        ]);

        $middleware->trimStrings(
            except: [
                'current',
                'current_password',
                'password',
                'password_confirmation',
                'current_password_2fa',
            ]
        );

        $middleware->validateCsrfTokens(
            except: [
                'deactivate-one-click/*', // One-Click Unsubscribe
                'delete-one-click/*', // One-Click Delete
                'block-email-one-click/*', // One-Click Block Sender Email
                'block-domain-one-click/*', // One-Click Block Sender Domain
                'api/auth/login',
            ]
        );

        $middleware->web(append: [
            ProxyAuthentication::class,
            HandleInertiaRequests::class, // Must be the last item!
        ]);

        $middleware->alias([
            '2fa' => VerifyTwoFactorAuthMethods::class,
            'blocklist.api' => BlocklistApiMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->dontFlash([
            'current',
            'current_password',
            'password',
            'password_confirmation',
            'current_password_2fa',
        ]);
    })->create();
