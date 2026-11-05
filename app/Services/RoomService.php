<?php

namespace App\Services;

use App\Models\Room;
use App\Models\RoomState;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class RoomService
{
    /**
     * Czas wygaśnięcia cache stanu gry w Redis (2 godziny).
     */
    protected const REDIS_TTL_SECONDS = 7200;

    /**
     * Tworzy nowy pokój wieloosobowy wraz ze stanem początkowym i cache w Redis.
     */
    public function createRoom(?int $hostUserId = null): Room
    {
        $code = 'vns-' . strtolower(Str::random(4));

        $room = Room::create([
            'code' => $code,
            'host_user_id' => $hostUserId,
            'credits' => 0.00,
        ]);

        $initialState = [
            'grid_data' => [],
            'dirt_bitmask' => null,
            'updated_at' => now()->toIso8601String(),
        ];

        RoomState::create([
            'room_id' => $room->id,
            'grid_data' => [],
            'dirt_bitmask' => null,
        ]);

        $this->storeInRedis($code, $initialState);

        return $room->load('state');
    }

    /**
     * Pobiera pokój wraz z aktualnym stanem (priorytet pamięci podręcznej Redis, fallback do bazy).
     */
    public function getRoomWithState(string $code): ?array
    {
        $room = Room::with('state')->where('code', $code)->first();

        if (! $room) {
            return null;
        }

        $cachedState = $this->getFromRedis($code);

        return [
            'room' => $room,
            'live_state' => $cachedState ?: $room->state,
        ];
    }

    /**
     * Wykonuje transakcję kredytową z wykorzystaniem metod domenowych modelu Room.
     *
     * @return array{success: bool, credits?: float, error?: string}
     */
    public function processTransaction(string $code, string $type, ?float $amount = null, ?float $cost = null): array
    {
        $room = Room::where('code', $code)->firstOrFail();

        if ($type === 'sell_dust') {
            $room->sellDust($amount ?? 0);
        } elseif ($type === 'buy_upgrade' || $type === 'build') {
            $requiredCost = $cost ?? 0;
            if (! $room->chargeCredits($requiredCost)) {
                return [
                    'success' => false,
                    'error' => 'Brak środków',
                ];
            }
        }

        return [
            'success' => true,
            'credits' => $room->fresh()->credits,
        ];
    }

    /**
     * Zapisuje snapshot stanu fabryki w pamięci Redis oraz trwale w bazie danych.
     */
    public function saveSnapshot(string $code, array $gridData, ?string $dirtBitmask = null): array
    {
        $room = Room::where('code', $code)->firstOrFail();

        $stateData = [
            'grid_data' => $gridData,
            'dirt_bitmask' => $dirtBitmask,
            'updated_at' => now()->toIso8601String(),
        ];

        // 1. Live state do Redis
        $this->storeInRedis($code, $stateData);

        // 2. Snapshot domenowy do bazy danych
        $state = RoomState::persistSnapshot($room->id, $gridData, $dirtBitmask);

        return [
            'success' => true,
            'saved_at' => $state->updated_at,
            'redis' => true,
        ];
    }

    /**
     * Zapisuje dane stanu w Redis lub w systemowym Cache przy awarii połączenia.
     */
    protected function storeInRedis(string $code, array $data): void
    {
        try {
            Redis::setex("room:{$code}:state", self::REDIS_TTL_SECONDS, json_encode($data));
        } catch (\Throwable $e) {
            Cache::put("room:{$code}:state", $data, self::REDIS_TTL_SECONDS);
        }
    }

    /**
     * Odczytuje dane stanu z Redis lub w systemowym Cache.
     */
    protected function getFromRedis(string $code): ?array
    {
        try {
            $raw = Redis::get("room:{$code}:state");
            if ($raw) {
                return json_decode($raw, true);
            }
        } catch (\Throwable $e) {
            return Cache::get("room:{$code}:state");
        }

        return null;
    }
}

