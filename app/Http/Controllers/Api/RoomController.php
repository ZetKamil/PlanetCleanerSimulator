<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RoomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Czysty, lekki kontroler HTTP (Thin Controller) delegujący logikę domenową do RoomService.
 */
class RoomController extends Controller
{
    public function __construct(
        protected RoomService $roomService
    ) {}

    public function create(Request $request): JsonResponse
    {
        $room = $this->roomService->createRoom($request->user()?->id);

        return response()->json([
            'success' => true,
            'room' => $room,
        ], 201);
    }

    public function show(string $code): JsonResponse
    {
        $result = $this->roomService->getRoomWithState($code);

        if (! $result) {
            return response()->json(['error' => 'Pokój nie istnieje.'], 404);
        }

        return response()->json([
            'success' => true,
            'room' => $result['room'],
            'live_state' => $result['live_state'],
        ]);
    }

    public function transaction(Request $request, string $code): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:sell_dust,buy_upgrade,build',
            'amount' => 'nullable|numeric',
            'cost' => 'nullable|numeric',
        ]);

        $result = $this->roomService->processTransaction(
            $code,
            $validated['type'],
            isset($validated['amount']) ? (float) $validated['amount'] : null,
            isset($validated['cost']) ? (float) $validated['cost'] : null,
        );

        if (! $result['success']) {
            return response()->json(['error' => $result['error'] ?? 'Transakcja nieudana'], 400);
        }

        return response()->json([
            'success' => true,
            'credits' => $result['credits'],
        ]);
    }

    public function snapshot(Request $request, string $code): JsonResponse
    {
        $validated = $request->validate([
            'grid_data' => 'nullable|array',
            'dirt_bitmask' => 'nullable|string',
        ]);

        $result = $this->roomService->saveSnapshot(
            $code,
            $validated['grid_data'] ?? [],
            $validated['dirt_bitmask'] ?? null
        );

        return response()->json($result);
    }
}
