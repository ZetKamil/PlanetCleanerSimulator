<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Room extends Model
{
    protected $fillable = [
        'code',
        'host_user_id',
        'credits',
    ];

    protected $casts = [
        'credits' => 'float',
    ];

    public function state(): HasOne
    {
        return $this->hasOne(RoomState::class);
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    /**
     * Sprawdza, czy pokój/gracze posiadają wystarczającą ilość kredytów.
     */
    public function hasSufficientCredits(float $cost): bool
    {
        return $cost >= 0 && $this->credits >= $cost;
    }

    /**
     * Pobiera opłatę kredytową (atomowe sprawdzenie i obciążenie konta).
     * Zwraca true jeśli transakcja się powiodła, false przy braku środków.
     */
    public function chargeCredits(float $cost): bool
    {
        if (! $this->hasSufficientCredits($cost)) {
            return false;
        }

        $this->decrement('credits', $cost);
        return true;
    }

    /**
     * Zasila konto kredytowe o wskazaną kwotę (np. sprzedaż urobku z pyłu, misje).
     */
    public function addCredits(float $amount): void
    {
        if ($amount > 0) {
            $this->increment('credits', $amount);
        }
    }

    /**
     * Transakcja skupu pyłu wenusjańskiego w stacji dokującej (Depot).
     */
    public function sellDust(float $dustKg, float $ratePerKg = 1.0): float
    {
        $earnedCredits = round($dustKg * $ratePerKg, 2);
        if ($earnedCredits > 0) {
            $this->addCredits($earnedCredits);
        }
        return $earnedCredits;
    }
}


