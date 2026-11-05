<?php

namespace Tests\Unit;

use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomDomainTest extends TestCase
{
    use RefreshDatabase;

    public function test_room_credit_domain_methods(): void
    {
        $room = Room::create([
            'code' => 'vns-test',
            'credits' => 100.00,
        ]);

        $this->assertTrue($room->hasSufficientCredits(50));
        $this->assertTrue($room->hasSufficientCredits(100));
        $this->assertFalse($room->hasSufficientCredits(101));

        // Obciążenie konta
        $charged = $room->chargeCredits(40);
        $this->assertTrue($charged);
        $this->assertEquals(60.00, $room->fresh()->credits);

        // Próba obciążenia ponad stan
        $overcharged = $room->chargeCredits(70);
        $this->assertFalse($overcharged);
        $this->assertEquals(60.00, $room->fresh()->credits);

        // Zasilenie konta ze sprzedaży pyłu
        $earned = $room->sellDust(20.0, 1.5);
        $this->assertEquals(30.00, $earned);
        $this->assertEquals(90.00, $room->fresh()->credits);
    }
}

