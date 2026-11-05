import { Container, Graphics } from 'pixi.js';
import type { SoundSystem } from '../SoundSystem';
import type { ShieldDome } from '../SimulationLoop';

export interface AtmosphereManagerOptions {
    effectsLayer: Container;
    soundSystem: SoundSystem;
    onAcidRainEvent?: (active: boolean, timer: number) => void;
    cycleInterval?: number; // Czas między burzami w sekundach (domyślnie 240s = 4 min)
    stormDuration?: number; // Czas trwania burzy (domyślnie 30s)
}

export interface AtmosphereState {
    isAcidRain: boolean;
    acidRainTimer: number;
    corrosion: number;          // 0.0 - 1.0
    corrosionPercent: number;   // 0 - 100%
    isPlayerShielded: boolean;
    speedMultiplier: number;    // 1.0 down to 0.55 (spowolnienie korozją)
    isHullBreached: boolean;    // true przy 100% korozji (krytyczne rozpuszczenie)
}

/**
 * Dedykowany menedżer zjawisk atmosferycznych i przetrwania na Wenus (Single Responsibility Principle).
 * Obsługuje okresowe burze kwasu siarkowego (Acid Rain), syreny alarmowe, korozję pancerza i osłonę tarcz.
 */
export class AtmosphereManager {
    public isAcidRain: boolean = false;
    public acidRainTimer: number = 0;
    public corrosion: number = 0; // 0.0 do 1.0
    private acidRainCycleTimer: number;
    private readonly cycleInterval: number;
    private readonly stormDuration: number;
    private sizzleSoundTimer: number = 0;

    private acidRainGfx: Graphics;
    private effectsLayer: Container;
    private soundSystem: SoundSystem;
    private onAcidRainEvent?: (active: boolean, timer: number) => void;

    constructor(options: AtmosphereManagerOptions) {
        this.effectsLayer = options.effectsLayer;
        this.soundSystem = options.soundSystem;
        this.onAcidRainEvent = options.onAcidRainEvent;
        this.cycleInterval = options.cycleInterval ?? 240;
        this.stormDuration = options.stormDuration ?? 30;
        this.acidRainCycleTimer = this.cycleInterval;

        this.acidRainGfx = new Graphics();
        this.effectsLayer.addChild(this.acidRainGfx);
    }

    public update(
        dt: number,
        playerPos: { x: number; y: number },
        activeShieldDomes: ShieldDome[],
        baseDepotRect?: { x: number; y: number; width: number; height: number },
        hasAcidPerk: boolean = false,
    ): AtmosphereState {
        this.acidRainCycleTimer -= dt;

        if (this.acidRainCycleTimer <= 0 && !this.isAcidRain) {
            this.isAcidRain = true;
            this.acidRainTimer = this.stormDuration;
            this.acidRainCycleTimer = this.cycleInterval;
            this.soundSystem.playAcidAlarm();
            this.onAcidRainEvent?.(true, Math.round(this.acidRainTimer));
        }

        const isUnderDome = this.isPointShielded(playerPos.x, playerPos.y, activeShieldDomes);
        const isInsideBase = baseDepotRect
            ? (playerPos.x >= baseDepotRect.x &&
               playerPos.x <= baseDepotRect.x + baseDepotRect.width &&
               playerPos.y >= baseDepotRect.y &&
               playerPos.y <= baseDepotRect.y + baseDepotRect.height)
            : false;
        const isPlayerShielded = isUnderDome || isInsideBase;

        if (this.isAcidRain) {
            this.acidRainTimer -= dt;
            this.renderAcidRain(playerPos, activeShieldDomes, isPlayerShielded);

            if (!isPlayerShielded) {
                // Poza tarczą pancerz ulega agresywnej korozji kwasowej (+12% na sekundę -> ok. 8.3s na schronienie)
                const corrosionRate = hasAcidPerk ? 0.06 : 0.12;
                this.corrosion = Math.min(1.0, this.corrosion + corrosionRate * dt);

                // Dźwięk syczenia i skwierczenia kwasu na karoserii
                this.sizzleSoundTimer += dt;
                if (this.sizzleSoundTimer >= 0.35) {
                    this.sizzleSoundTimer = 0;
                    this.soundSystem.playAcidSizzle();
                }
            } else {
                // Pod tarczą lub w Bazie kwas jest neutralizowany - pancerz regeneruje się (-25% na sekundę)
                this.corrosion = Math.max(0.0, this.corrosion - 0.25 * dt);
                this.sizzleSoundTimer = 0;
            }

            if (this.acidRainTimer <= 0) {
                this.isAcidRain = false;
                this.acidRainGfx.clear();
                this.onAcidRainEvent?.(false, 0);
            }
        } else {
            // Po ustąpieniu burzy pancerz samoczynnie wraca do 100% sprawności
            this.corrosion = Math.max(0.0, this.corrosion - 0.40 * dt);
            this.sizzleSoundTimer = 0;
        }

        // Wykrycie krytycznego rozpuszczenia podwozia (Hull Breach)
        let isHullBreached = false;
        if (this.corrosion >= 1.0) {
            isHullBreached = true;
            this.corrosion = 0.0;
        }

        // Spowolnienie napędu łazika w wyniku korozji kół i przekładni (od 100% do 55% prędkości)
        const speedMultiplier = Math.max(0.55, 1.0 - this.corrosion * 0.45);
        const corrosionPercent = Math.round(this.corrosion * 100);

        return {
            isAcidRain: this.isAcidRain,
            acidRainTimer: Math.max(0, Math.round(this.acidRainTimer)),
            corrosion: this.corrosion,
            corrosionPercent,
            isPlayerShielded,
            speedMultiplier,
            isHullBreached,
        };
    }

    public isPointShielded(px: number, py: number, activeShieldDomes: ShieldDome[]): boolean {
        for (const dome of activeShieldDomes) {
            if (!dome.active) continue;
            const dist = Math.hypot(px - dome.x, py - dome.y);
            if (dist <= dome.radius) {
                return true;
            }
        }
        return false;
    }

    private renderAcidRain(playerPos: { x: number; y: number }, activeShieldDomes: ShieldDome[], isPlayerShielded: boolean): void {
        this.acidRainGfx.clear();
        const dropCount = 75;

        for (let i = 0; i < dropCount; i++) {
            const rx = playerPos.x + (Math.random() - 0.5) * 1400;
            const ry = playerPos.y + (Math.random() - 0.5) * 900;
            const length = 14 + Math.random() * 20;

            // Jeśli kropla wpada w pole siłowe pylonu tarczy, nie rysujemy jej (kopuła paruje kwas!)
            if (this.isPointShielded(rx, ry, activeShieldDomes)) {
                continue;
            }

            this.acidRainGfx.moveTo(rx, ry)
                .lineTo(rx - 6, ry + length)
                .stroke({ width: 1.5, color: 0x4ade80, alpha: 0.65 });
        }

        // Efekt skwierczenia i pryskania kwasu bezpośrednio na łazik, gdy gracz nie ma osłony
        if (!isPlayerShielded && this.corrosion > 0.05) {
            for (let i = 0; i < 4; i++) {
                const ox = (Math.random() - 0.5) * 28;
                const oy = (Math.random() - 0.5) * 28;
                this.acidRainGfx.circle(playerPos.x + ox, playerPos.y + oy, 2.5)
                    .fill({ color: 0x86efac, alpha: 0.85 });
            }
        }
    }

    public destroy(): void {
        this.effectsLayer.removeChild(this.acidRainGfx);
        this.acidRainGfx.destroy();
    }
}
