<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('host_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('credits', 12, 2)->default(0.00);
            $table->timestamps();
        });

        Schema::create('room_states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('rooms')->cascadeOnDelete();
            $table->json('grid_data')->nullable(); // placed buildings
            $table->longText('dirt_bitmask')->nullable(); // compressed dirt state
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_states');
        Schema::dropIfExists('rooms');
    }
};

