<?php

namespace App\Helpers;

use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Symfony\Component\Process\Exception\RuntimeException;
use Symfony\Component\Process\Process;

class GitVersionHelper
{
    public static function version()
    {
        if (Cache::has('app-version')) {
            return Cache::get('app-version');
        }

        return self::cacheFreshVersion();
    }

    public static function updateAvailable()
    {
        $currentVersion = self::version()->value();

        // Cache latestVersion for 1 day
        $latestVersion = Cache::remember('app-latest-version', now()->addDay(), function () {

            try {
                $response = Http::get('https://api.github.com/repos/vovamail/vovamail/releases/latest');
            } catch (Exception $e) {
                report($e);

                return '0.0.0';
            }

            return Str::of($response->json('tag_name', 'v0.0.0'))->after('v')->trim();
        });

        return version_compare($latestVersion, $currentVersion, '>');
    }

    public static function cacheFreshVersion()
    {
        $version = self::freshVersion();
        Cache::put('app-version', $version);

        return $version;
    }

    public static function freshVersion()
    {
        $path = base_path();

        $latestTagCommit = self::runGit(['git', 'rev-list', '--tags', '--max-count=1'], $path);

        if (! $latestTagCommit) {
            return str(config('vovamail.version'));
        }

        $output = self::runGit(['git', 'describe', '--tags', trim($latestTagCommit)], $path);

        if (! $output) {
            return str(config('vovamail.version'));
        }

        return Str::of($output)->after('v')->trim();
    }

    protected static function runGit(array $command, string $path): ?string
    {
        try {
            $process = new Process($command, $path);
            $process->mustRun();

            return $process->getOutput();
        } catch (RuntimeException) {
            return null;
        }
    }
}
