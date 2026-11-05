<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_achievements', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->index();
            $table->string('room_code')->nullable()->index();
            $table->string('achievement_id');
            $table->integer('current_progress')->default(0);
            $table->integer('max_progress')->default(1);
            $table->boolean('is_unlocked')->default(false);
            $table->timestamp('unlocked_at')->nullable();
            $table->boolean('reward_claimed')->default(false);
            $table->timestamps();

            $table->unique(['session_id', 'achievement_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_achievements');
    }
};
