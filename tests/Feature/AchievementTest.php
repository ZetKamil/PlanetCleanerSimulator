<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AchievementTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_sync_and_fetch_achievements(): void
    {
        $sessionId = 'test_session_123';

        // 1. Sync achievements
        $response = $this->postJson('/api/achievements/sync', [
            'session_id' => $sessionId,
            'achievements' => [
                [
                    'achievement_id' => 'relic_first',
                    'current_progress' => 1,
                    'max_progress' => 1,
                    'is_unlocked' => true,
                    'unlocked_at' => now()->toIso8601String(),
                    'reward_claimed' => false,
                ],
                [
                    'achievement_id' => 'clean_10_sectors',
                    'current_progress' => 4,
                    'max_progress' => 10,
                    'is_unlocked' => false,
                    'reward_claimed' => false,
                ],
            ],
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'synced_count' => 2,
        ]);

        // 2. Fetch achievements
        $fetchResponse = $this->getJson("/api/achievements?session_id={$sessionId}");
        $fetchResponse->assertStatus(200);
        $fetchResponse->assertJsonCount(2);

        $fetchResponse->assertJsonFragment([
            'achievement_id' => 'relic_first',
            'is_unlocked' => true,
        ]);
        $fetchResponse->assertJsonFragment([
            'achievement_id' => 'clean_10_sectors',
            'current_progress' => 4,
            'is_unlocked' => false,
        ]);
    }
}
