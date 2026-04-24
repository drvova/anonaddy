<?php

namespace App\Console\Commands;

use App\Models\Alias;
use App\Models\FailedDelivery;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ParsePostfixMailLog extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vovamail:parse-postfix-mail-log';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Parse Postfix log for inbound rejections and store them';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $logPath = config('vovamail.postfix_log_path', '/var/log/mail.log');

        if (! is_file($logPath) || ! is_readable($logPath)) {
            $this->error("Cannot read log file: {$logPath}");

            return 1;
        }

        $positionFile = 'postfix_log_position.txt';
        $lastPosition = Storage::disk('local')->exists($positionFile)
            ? (int) Storage::disk('local')->get($positionFile)
            : 0;

        $fileSize = filesize($logPath);

        // If the file is smaller than our last position, it was likely rotated
        if ($fileSize < $lastPosition) {
            $lastPosition = 0;
        }

        if ($fileSize === $lastPosition) {
            return 0;
        }

        $handle = fopen($logPath, 'r');
        if (! $handle) {
            $this->error("Failed to open log file: {$logPath}");

            return 1;
        }

        fseek($handle, $lastPosition);

        $allDomains = config('vovamail.all_domains', []);

        $count = 0;
        $storeErrors = 0;

        // Pattern to match syslog and ISO8601 timestamps
        $pattern = '/^(.*?)\s+(?:[^\s]+\s+)?postfix\/(?:smtpd|cleanup)\[\d+\]:\s*(?:[A-Z0-9]+:\s*)?(?:reject|milter-reject|discard):\s*(?:RCPT|END-OF-MESSAGE) from\s*([^:]+):\s*(?:<[^>]+>:\s*)?(?:(\d{3}\s+\d\.\d\.\d|\d\.\d\.\d)\s+)?(.*?);\s*from=<(.*?)>\s*to=<(.*?)>/i';

        while (($line = fgets($handle)) !== false) {
            if (! preg_match('/(?:reject:|milter-reject:|discard:)/', $line) || ! str_contains($line, 'to=<')) {
                continue;
            }

            if (preg_match($pattern, $line, $matches)) {
                $timestampStr = trim($matches[1]);
                $remoteMta = trim($matches[2]);
                $smtpCodeStr = trim($matches[3] ?? '');
                $reason = trim($matches[4]);
                $sender = trim($matches[5]);
                $recipient = trim($matches[6]);

                $smtpCode = '';
                if ($smtpCodeStr) {
                    $parts = explode(' ', $smtpCodeStr);
                    $smtpCode = $parts[0];
                    $reason = $smtpCodeStr.' '.$reason;
                } elseif (preg_match('/^(\d{3})\s+(.*)$/', $reason, $reasonMatches)) {
                    $smtpCode = $reasonMatches[1];
                }

                try {
                    $attemptedAt = Carbon::parse($timestampStr);
                    if ($attemptedAt->isFuture()) {
                        $attemptedAt->subYear();
                    }
                } catch (\Exception $e) {
                    Log::warning('Skipped postfix rejection with invalid timestamp.', [
                        'timestamp' => $timestampStr,
                        'line' => trim($line),
                    ]);

                    continue;
                }

                $recipientLower = strtolower($recipient);
                $aliasLookup = $recipientLower;

                if (str_contains($recipientLower, '+')) {
                    $parts = explode('@', $recipientLower);
                    if (count($parts) === 2) {
                        $aliasLookup = explode('+', $parts[0])[0].'@'.$parts[1];
                    }
                }

                $alias = Alias::withTrashed()->where('email', $aliasLookup)->first();
                $userId = null;

                if ($alias) {
                    $userId = $alias->user_id;
                }

                if (! $userId) {
                    continue;
                }

                $bounceType = 'hard';
                if (str_contains(strtolower($reason), 'spam message rejected')) {
                    $bounceType = 'spam';
                }

                $irDedupeKey = hash('sha256', $userId.'|'.($alias ? $alias->id : '').'|'.$attemptedAt->format('Y-m-d H:i:s'));

                try {
                    FailedDelivery::create([
                        'user_id' => $userId,
                        'alias_id' => $alias ? $alias->id : null,
                        'email_type' => 'IR',
                        'ir_dedupe_key' => $irDedupeKey,
                        'sender' => $sender === '' ? '<>' : Str::limit($sender, 255),
                        'destination' => $recipientLower,
                        'remote_mta' => Str::limit($remoteMta, 255),
                        'code' => Str::limit($reason, 255),
                        'status' => $smtpCode ? Str::limit($smtpCode, 10) : null,
                        'attempted_at' => $attemptedAt,
                        'created_at' => $attemptedAt,
                        'updated_at' => $attemptedAt,
                        'bounce_type' => $bounceType,
                    ]);

                    $count++;
                } catch (QueryException $e) {
                    if ($this->isDuplicateKeyException($e)) {
                        continue;
                    }

                    report($e);
                    $storeErrors++;
                }
            }
        }

        $newPosition = ftell($handle);
        Storage::disk('local')->put($positionFile, (string) $newPosition);

        fclose($handle);

        if ($count > 0) {
            $this->info("Stored {$count} inbound rejections.");
            Log::info("Stored {$count} inbound rejections.");
        }

        if ($storeErrors > 0) {
            $this->warn("Failed to store {$storeErrors} inbound rejection(s); see application log for details.");
            Log::info("Failed to store {$storeErrors} inbound rejection(s); see application log for details.");
        }

        return 0;
    }

    protected function isDuplicateKeyException(QueryException $e): bool
    {
        return match (DB::getDriverName()) {
            'mysql' => ($e->errorInfo[1] ?? 0) === 1062,
            'sqlite' => str_contains($e->getMessage(), 'UNIQUE constraint failed'),
            default => ($e->errorInfo[0] ?? '') === '23000',
        };
    }
}
