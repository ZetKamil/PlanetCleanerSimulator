<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlayerAchievement extends Model
{
    protected $fillable = [
        'session_id',
        'room_code',
        'achievement_id',
        'current_progress',
        'max_progress',
        'is_unlocked',
        'unlocked_at',
        'reward_claimed',
    ];

    protected $casts = [
        'is_unlocked' => 'boolean',
        'reward_claimed' => 'boolean',
        'unlocked_at' => 'datetime',
        'current_progress' => 'integer',
        'max_progress' => 'integer',
    ];
}
