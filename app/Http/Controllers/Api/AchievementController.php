<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlayerAchievement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AchievementController extends Controller
{
    /**
     * Pobiera listę osiągnięć dla danej sesji lub pokoju.
     */
    public function index(Request $request): JsonResponse
    {
        $sessionId = $request->query('session_id');
        $roomCode = $request->query('room_code');

        if (!$sessionId && !$roomCode) {
            return response()->json([]);
        }

        $query = PlayerAchievement::query();

        if ($roomCode) {
            $query->where('room_code', $roomCode);
        } else {
            $query->where('session_id', $sessionId);
        }

        $achievements = $query->get();

        return response()->json($achievements);
    }

    /**
     * Zapisuje / synchronizuje stan osiągnięć z klienta.
     */
    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|string|max:100',
            'room_code' => 'nullable|string|max:50',
            'achievements' => 'required|array',
            'achievements.*.achievement_id' => 'required|string|max:100',
            'achievements.*.current_progress' => 'required|integer|min:0',
            'achievements.*.max_progress' => 'nullable|integer|min:1',
            'achievements.*.is_unlocked' => 'required|boolean',
            'achievements.*.unlocked_at' => 'nullable|string',
            'achievements.*.reward_claimed' => 'nullable|boolean',
        ]);

        $sessionId = $validated['session_id'];
        $roomCode = $validated['room_code'] ?? null;
        $syncedCount = 0;

        foreach ($validated['achievements'] as $item) {
            $unlockedAt = null;
            if (!empty($item['unlocked_at'])) {
                try {
                    $unlockedAt = Carbon::parse($item['unlocked_at']);
                } catch (\Exception $e) {
                    $unlockedAt = now();
                }
            } elseif ($item['is_unlocked']) {
                $unlockedAt = now();
            }

            PlayerAchievement::updateOrCreate(
                [
                    'session_id' => $sessionId,
                    'achievement_id' => $item['achievement_id'],
                ],
                [
                    'room_code' => $roomCode,
                    'current_progress' => $item['current_progress'],
                    'max_progress' => $item['max_progress'] ?? 1,
                    'is_unlocked' => $item['is_unlocked'],
                    'unlocked_at' => $unlockedAt,
                    'reward_claimed' => $item['reward_claimed'] ?? false,
                ]
            );

            $syncedCount++;
        }

        return response()->json([
            'success' => true,
            'synced_count' => $syncedCount,
        ]);
    }
}
