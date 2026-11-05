<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomState extends Model
{
    protected $fillable = [
        'room_id',
        'grid_data',
        'dirt_bitmask',
    ];

    protected $casts = [
        'grid_data' => 'array',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Zapisuje snapshot stanu fabryki i zanieczyszczeń w bazie danych.
     */
    public static function persistSnapshot(int $roomId, array $gridData, ?string $dirtBitmask = null): self
    {
        return static::updateOrCreate(
            ['room_id' => $roomId],
            [
                'grid_data' => $gridData,
                'dirt_bitmask' => $dirtBitmask,
            ]
        );
    }
}


