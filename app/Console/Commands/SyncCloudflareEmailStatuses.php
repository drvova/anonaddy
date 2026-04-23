<?php

namespace App\Console\Commands;

use App\Services\CloudflareStatusSynchronizer;
use Illuminate\Console\Command;
use Throwable;

class SyncCloudflareEmailStatuses extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vovamail:sync-cloudflare-email-statuses {--minutes= : Lookback window in minutes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Cloudflare Email Service delivery statuses';

    public function __construct(private readonly CloudflareStatusSynchronizer $synchronizer)
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (config('mail.default') !== 'cloudflare') {
            $this->info('Skipping Cloudflare status sync because the default mailer is not cloudflare.');

            return self::SUCCESS;
        }

        $minutes = (int) ($this->option('minutes') ?: config('mail.mailers.cloudflare.sync_window_minutes', 15));

        if ($minutes < 1) {
            $this->error('The sync window must be at least 1 minute.');

            return self::FAILURE;
        }

        try {
            $summary = $this->synchronizer->syncRecentEvents($minutes);
        } catch (Throwable $throwable) {
            report($throwable);
            $this->error($throwable->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Fetched %d Cloudflare event(s); updated %d message(s); recorded %d failed delivery event(s); ignored %d event(s).',
            $summary['processed'],
            $summary['updated'],
            $summary['failed'],
            $summary['ignored'],
        ));

        return self::SUCCESS;
    }
}
