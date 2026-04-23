<?php

namespace App\Services;

class ProcessingResult
{
    public readonly string $status;

    public readonly ?string $message;

    private function __construct(string $status, ?string $message = null)
    {
        $this->status = $status;
        $this->message = $message;
    }

    public static function success(): self
    {
        return new self('success');
    }

    public static function ignored(string $message): self
    {
        return new self('ignored', $message);
    }

    public static function rejected(string $message): self
    {
        return new self('rejected', $message);
    }

    public static function error(string $message): self
    {
        return new self('error', $message);
    }

    public function shouldStop(): bool
    {
        return in_array($this->status, ['rejected', 'error']);
    }

    public function exitCode(): int
    {
        return match ($this->status) {
            'success', 'ignored' => 0,
            'rejected' => 0,
            'error' => 1,
            default => 1,
        };
    }
}
