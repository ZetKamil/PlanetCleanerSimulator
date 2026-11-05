<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\AchievementController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Room & Multiplayer Co-op Endpoints
Route::post('/rooms', [RoomController::class, 'create']);
Route::get('/rooms/{code}', [RoomController::class, 'show']);
Route::post('/rooms/{code}/transaction', [RoomController::class, 'transaction']);
Route::post('/rooms/{code}/snapshot', [RoomController::class, 'snapshot']);

// Achievement & Milestone Endpoints
Route::get('/achievements', [AchievementController::class, 'index']);
Route::post('/achievements/sync', [AchievementController::class, 'sync']);
