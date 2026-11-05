<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_new_multiplayer_room(): void
    {
        $response = $this->postJson('/api/rooms');

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'room' => [
                    'id',
                    'code',
                    'credits',
                    'state',
                ],
            ]);

        $this->assertDatabaseHas('rooms', [
            'code' => $response->json('room.code'),
        ]);
    }

    public function test_can_fetch_existing_room(): void
    {
        $createRes = $this->postJson('/api/rooms');
        $code = $createRes->json('room.code');

        $getRes = $this->getJson("/api/rooms/{$code}");

        $getRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'room' => [
                    'code' => $code,
                ],
            ]);
    }

    public function test_can_execute_dust_sale_transaction(): void
    {
        $createRes = $this->postJson('/api/rooms');
        $code = $createRes->json('room.code');

        $txRes = $this->postJson("/api/rooms/{$code}/transaction", [
            'type' => 'sell_dust',
            'amount' => 25.50,
        ]);

        $txRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'credits' => 25.50,
            ]);
    }

    public function test_can_save_and_retrieve_room_snapshot(): void
    {
        $createRes = $this->postJson('/api/rooms');
        $code = $createRes->json('room.code');

        $snapRes = $this->postJson("/api/rooms/{$code}/snapshot", [
            'grid_data' => [
                ['type' => 'conveyor', 'gx' => 10, 'gy' => 12, 'dir' => 'E'],
                ['type' => 'packager', 'gx' => 12, 'gy' => 12, 'dir' => 'E'],
            ],
            'dirt_bitmask' => '{"cleanedKg": 50, "percentCleaned": 4}',
        ]);

        $snapRes->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $getRes = $this->getJson("/api/rooms/{$code}");
        $getRes->assertStatus(200);
        $buildings = $getRes->json('live_state.grid_data');
        $this->assertCount(2, $buildings);
        $this->assertEquals('conveyor', $buildings[0]['type']);
    }

    public function test_room_web_route_loads_single_page_app(): void
    {
        $response = $this->get('/room/vns-test');
        $response->assertStatus(200);
    }
}

