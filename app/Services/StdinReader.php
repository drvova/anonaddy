<?php

namespace App\Services;

use RuntimeException;

class StdinReader
{
    public function read(): string
    {
        $handle = fopen('php://stdin', 'rb');

        if ($handle === false) {
            throw new RuntimeException('Unable to open stdin.');
        }

        $contents = stream_get_contents($handle);
        fclose($handle);

        if ($contents === false) {
            throw new RuntimeException('Unable to read stdin.');
        }

        return $contents;
    }
}
