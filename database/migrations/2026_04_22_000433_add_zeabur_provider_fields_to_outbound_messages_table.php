<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('outbound_messages', function (Blueprint $table) {
            $table->string('provider')->nullable()->after('email_type');
            $table->string('provider_email_id')->nullable()->after('provider');
            $table->string('provider_message_id')->nullable()->after('provider_email_id');
            $table->string('provider_status')->nullable()->after('provider_message_id');
            $table->string('provider_last_event')->nullable()->after('provider_status');
            $table->json('provider_payload')->nullable()->after('provider_last_event');

            $table->index(['provider', 'provider_email_id'], 'outbound_messages_provider_email_idx');
            $table->index(['provider', 'provider_message_id'], 'outbound_messages_provider_message_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outbound_messages', function (Blueprint $table) {
            $table->dropIndex('outbound_messages_provider_email_idx');
            $table->dropIndex('outbound_messages_provider_message_idx');
            $table->dropColumn([
                'provider',
                'provider_email_id',
                'provider_message_id',
                'provider_status',
                'provider_last_event',
                'provider_payload',
            ]);
        });
    }
};
