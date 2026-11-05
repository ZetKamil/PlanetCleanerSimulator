<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Str;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Presence channel for multiplayer co-op room
Broadcast::channel('presence-room.{roomCode}', function ($user = null) {
    $guestId = request()->header('X-Player-Id') ?? request()->input('player_id') ?? (string) Str::uuid();
    $name = $user ? $user->name : 'Astronaut_' . substr(md5($guestId), 0, 4);

    return [
        'id' => $user ? (string) $user->id : (string) $guestId,
        'name' => $name,
    ];
});
