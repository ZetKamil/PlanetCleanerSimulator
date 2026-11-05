import { defineStore } from 'pinia';
import { useAchievementStore } from './useAchievementStore';

export interface PlayerTool {
    id: string;
    name: string;
    cost: number;
    radius: number;
    sweepRate: number; // kg/s
    description: string;
}

export interface PlayerBackpack {
    id: string;
    name: string;
    cost: number;
    capacity: number; // kg
    description: string;
}

export const AVAILABLE_TOOLS: PlayerTool[] = [
    {
        id: 'tool-t1-scraper',
        name: 'Termo-Skrobak Ręczny (Starter)',
        cost: 0,
        radius: 16,
        sweepRate: 1.2,
        description: 'Podstawowy ręczny skrobak termiczny do precyzyjnego zdrapywania pyłu.',
    },
    {
        id: 'tool-t2-brush',
        name: 'Szczotka Kompozytowa',
        cost: 4,
        radius: 26,
        sweepRate: 2.5,
        description: 'Wzmocniona szczotka z włókien węglowych. Ponad 2x szybsze czyszczenie!',
    },
    {
        id: 'tool-t3-broom',
        name: 'Miotła Szerokokątna',
        cost: 18,
        radius: 42,
        sweepRate: 5.0,
        description: 'Szeroka głowica zamiatająca pełny ślad kół łazika.',
    },
    {
        id: 'tool-t4-turbine',
        name: 'Ręczna Turbina Ssąca',
        cost: 65,
        radius: 60,
        sweepRate: 10.0,
        description: 'Półautomatyczny agregat próżniowy generujący silne podciśnienie.',
    },
    {
        id: 'tool-t5-vacuum',
        name: 'Przemysłowy Odkurzacz Wirowy',
        cost: 220,
        radius: 85,
        sweepRate: 22.0,
        description: 'Potężna turbina wirowa błyskawicznie pożerająca wulkaniczny pył.',
    },
    {
        id: 'tool-t6-harvester',
        name: 'Mega-Harvester Magnetyczny',
        cost: 750,
        radius: 120,
        sweepRate: 50.0,
        description: 'Ekstremalny kombajn czyszczący całe połacie Wenus za jednym przejazdem!',
    },
];

export const AVAILABLE_BACKPACKS: PlayerBackpack[] = [
    {
        id: 'backpack-t1-starter',
        name: 'Zasobnik Lekki (Starter)',
        cost: 0,
        capacity: 8,
        description: 'Kompaktowy zasobnik na pierwsze próby w terenie.',
    },
    {
        id: 'backpack-t2-reinforced',
        name: 'Wzmocniony Zasobnik',
        cost: 5,
        capacity: 20,
        description: 'Szczelny zbiornik ciśnieniowy mieszczący 20 kg urobku.',
    },
    {
        id: 'backpack-t3-pressure',
        name: 'Zbiornik Ciśnieniowy',
        cost: 25,
        capacity: 50,
        description: 'Pojemny kompozytowy zasobnik – idealny pod miotłę szerokokątną.',
    },
    {
        id: 'backpack-t4-composite',
        name: 'Kontener Kompozytowy',
        cost: 85,
        capacity: 120,
        description: 'Wielkogabarytowy zbiornik do intensywnych prac w terenie.',
    },
    {
        id: 'backpack-t5-titanium',
        name: 'Tytanowy Magazyn Mobilny',
        cost: 250,
        capacity: 300,
        description: 'Ciężki przemysłowy zbiornik na dalekie ekspedycje do kraterów.',
    },
    {
        id: 'backpack-t6-atlas',
        name: 'Zbiornik Próżniowy Atlas',
        cost: 650,
        capacity: 800,
        description: 'Endgame\'owy zbiornik podciśnieniowy o gigantycznej pojemności.',
    },
];

export interface DustBreakdown {
    basalt: number; // kg ($1.0/kg)
    sulfur: number; // kg ($2.5/kg)
    magma: number;  // kg ($5.0/kg)
}

export const usePlayerStore = defineStore('player', {
    state: () => ({
        credits: 0,
        currentDust: 0,
        currentTool: AVAILABLE_TOOLS[0] as PlayerTool,
        currentBackpack: AVAILABLE_BACKPACKS[0] as PlayerBackpack,
        purchasedToolIds: ['tool-t1-scraper', 'brush-starter'] as string[],
        purchasedBackpackIds: ['backpack-t1-starter', 'backpack-starter'] as string[],
        upgrades: [] as string[],
        activePerks: [] as string[],
        // Turbo-Glide [Shift]
        boostEnergy: 100, // 0 to 100%
        isBoosting: false,
        // Tempomat [Q]
        cruiseControl: false,
    }),
    getters: {
        isBackpackFull: (state) => state.currentDust >= state.currentBackpack.capacity,
        dustPercentage: (state) => {
            if (state.currentBackpack.capacity <= 0) return 0;
            return Math.min(100, Math.round((state.currentDust / state.currentBackpack.capacity) * 100));
        },
        remainingCapacity: (state) => Math.max(0, state.currentBackpack.capacity - state.currentDust),
        isToolPurchased: (state) => (toolId: string) => state.purchasedToolIds.includes(toolId),
        isBackpackPurchased: (state) => (backpackId: string) => state.purchasedBackpackIds.includes(backpackId),
        hasPerk: (state) => (perkId: string) => state.activePerks.includes(perkId),
    },
    actions: {
        addDust(amount: number): number {
            if (amount <= 0) return 0;
            const spaceLeft = Math.max(0, this.currentBackpack.capacity - this.currentDust);
            const toAdd = Math.min(spaceLeft, amount);
            this.currentDust = Number((this.currentDust + toAdd).toFixed(2));
            return toAdd;
        },

        emptyBackpack(): number {
            const dumped = this.currentDust;
            this.currentDust = 0;
            return dumped;
        },

        dumpDust(maxAmount?: number): number {
            if (this.currentDust <= 0) return 0;
            const toDump = maxAmount !== undefined ? Math.min(this.currentDust, maxAmount) : this.currentDust;
            this.currentDust = Number(Math.max(0, this.currentDust - toDump).toFixed(2));
            return toDump;
        },

        sellDust(bonusMultiplier: number = 1.0): { soldDust: number; earnedCredits: number } {
            const dust = this.currentDust;
            if (dust <= 0) return { soldDust: 0, earnedCredits: 0 };

            // Venus dust price: $0.10 / kg * multipliers
            const aphroditeMultiplier = this.hasPerk('aphrodite_market_uplink') ? 1.15 : 1.0;
            const finalMultiplier = bonusMultiplier * aphroditeMultiplier;
            const earned = Number((dust * 0.10 * finalMultiplier).toFixed(2));

            this.currentDust = 0;
            this.credits = Number((this.credits + earned).toFixed(2));
            return { soldDust: dust, earnedCredits: earned };
        },

        unlockPerk(perkId: string): void {
            if (!this.activePerks.includes(perkId)) {
                this.activePerks.push(perkId);
            }
        },
        updateBoostStatus(energy: number, isBoosting: boolean): void {
            this.boostEnergy = Math.min(100, Math.max(0, Number(energy.toFixed(1))));
            this.isBoosting = isBoosting;
        },
        toggleCruiseControl(forceState?: boolean): boolean {
            this.cruiseControl = forceState !== undefined ? forceState : !this.cruiseControl;
            return this.cruiseControl;
        },
        addCredits(amount: number) {
            this.credits = Number((this.credits + amount).toFixed(2));
        },
        spendCredits(amount: number): boolean {
            if (this.credits >= amount) {
                this.credits = Number((this.credits - amount).toFixed(2));
                return true;
            }
            return false;
        },
        buyTool(tool: PlayerTool): boolean {
            if (this.isToolPurchased(tool.id)) {
                this.equipTool(tool);
                return true;
            }
            if (this.spendCredits(tool.cost)) {
                this.purchasedToolIds.push(tool.id);
                this.equipTool(tool);
                useAchievementStore().trackProgress('upgrade_first', 1);
                return true;
            }
            return false;
        },
        equipTool(tool: PlayerTool): void {
            if (this.isToolPurchased(tool.id)) {
                this.currentTool = tool;
            }
        },
        buyBackpack(backpack: PlayerBackpack): boolean {
            if (this.isBackpackPurchased(backpack.id)) {
                this.equipBackpack(backpack);
                return true;
            }
            if (this.spendCredits(backpack.cost)) {
                this.purchasedBackpackIds.push(backpack.id);
                this.equipBackpack(backpack);
                useAchievementStore().trackProgress('upgrade_first', 1);
                return true;
            }
            return false;
        },
        equipBackpack(backpack: PlayerBackpack): void {
            if (this.isBackpackPurchased(backpack.id)) {
                this.currentBackpack = backpack;
            }
        },
        resetPlayer(): void {
            this.credits = 0;
            this.currentDust = 0;
            this.currentTool = AVAILABLE_TOOLS[0];
            this.currentBackpack = AVAILABLE_BACKPACKS[0];
            this.purchasedToolIds = ['tool-t1-scraper', 'brush-starter'];
            this.purchasedBackpackIds = ['backpack-t1-starter', 'backpack-starter'];
            this.upgrades = [];
            this.activePerks = [];
            this.boostEnergy = 100;
            this.isBoosting = false;
            this.cruiseControl = false;
        },
    },
});
