<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OutboundMessage extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'alias_id',
        'recipient_id',
        'email_type',
        'provider',
        'provider_email_id',
        'provider_message_id',
        'provider_status',
        'provider_last_event',
        'provider_payload',
        'encrypted',
        'bounced',
    ];

    protected $casts = [
        'id' => 'string',
        'user_id' => 'string',
        'alias_id' => 'string',
        'recipient_id' => 'string',
        'provider_payload' => 'array',
        'encrypted' => 'boolean',
        'bounced' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user for the outbound message.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the recipient for the outbound message.
     */
    public function recipient()
    {
        return $this->belongsTo(Recipient::class);
    }

    /**
     * Get the alias for the outbound message.
     */
    public function alias()
    {
        return $this->belongsTo(Alias::class)->withTrashed();
    }

    public function markAsBounced()
    {
        $this->update(['bounced' => true]);
    }

    public function scopeForProviderIdentifiers(Builder $query, ?string $providerEmailId, ?string $providerMessageId): Builder
    {
        return $query->where(function (Builder $providerQuery) use ($providerEmailId, $providerMessageId) {
            if (filled($providerEmailId)) {
                $providerQuery->orWhere('provider_email_id', $providerEmailId);
            }

            if (filled($providerMessageId)) {
                $providerQuery->orWhere('provider_message_id', $providerMessageId);
            }
        });
    }
}
