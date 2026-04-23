<?php

namespace App\Console\Commands;

use App\Services\InboundEmailProcessor;
use Illuminate\Console\Command;

class ReceiveEmail extends Command
{
    protected $signature = 'vovamail:receive-email
                            {file=stream : The file of the email}
                            {--sender= : The sender of the email}
                            {--recipient=* : The recipient of the email}
                            {--local_part=* : The local part of the recipient}
                            {--extension=* : The extension of the local part of the recipient}
                            {--domain=* : The domain of the recipient}
                            {--size= : The size of the email in bytes}';

    protected $description = 'Receive email from postfix pipe';

    public function handle(InboundEmailProcessor $processor): int
    {
        try {
            $file = $this->argument('file');

            if ($file === 'stream') {
                $fd = fopen('php://stdin', 'r');
                $rawMime = '';
                while (! feof($fd)) {
                    $rawMime .= fread($fd, 1024);
                }
                fclose($fd);
            } else {
                $rawMime = file_get_contents($file);
            }

            $recipients = collect($this->option('recipient'))->map(function ($item, $key) {
                return [
                    'email' => $item,
                    'local_part' => strtolower($this->option('local_part')[$key]),
                    'extension' => $this->option('extension')[$key],
                    'domain' => strtolower($this->option('domain')[$key]),
                ];
            })->all();

            $result = $processor->processRawMime(
                rawMime: $rawMime,
                sender: $this->option('sender'),
                recipients: $recipients,
                size: $this->option('size') ? (int) $this->option('size') : null,
                source: 'postfix'
            );

            if ($result->status === 'error') {
                $this->error($result->message ?? 'An error occurred.');
            }

            return $result->exitCode();
        } catch (\Throwable $e) {
            $this->error('4.3.0 An error has occurred, please try again later.');

            report($e);

            return 1;
        }
    }
}
