import { Container } from 'pixi.js';
import { RhombusSector } from './RhombusSector';
import type { DirtSystem } from '../DirtSystem';

export interface SectorManagerOptions {
    worldWidth: number;
    worldHeight: number;
    sectorSize?: number; // default 512
}

export interface SectorClaimEvent {
    sector: RhombusSector;
    creditsAward: number;
    totalBonusPercent: number;
}

export class SectorManager {
    public readonly worldWidth: number;
    public readonly worldHeight: number;
    public readonly sectorSize: number;

    public container: Container;
    public sectors: Map<string, RhombusSector> = new Map();
    public claimedSectors: Set<string> = new Set();
    private pendingEvaluationSectors: Set<RhombusSector> = new Set();
    private claimEventQueue: SectorClaimEvent[] = [];

    constructor(options: SectorManagerOptions) {
        this.worldWidth = options.worldWidth;
        this.worldHeight = options.worldHeight;
        this.sectorSize = options.sectorSize ?? 512;
        this.container = new Container();
        this.container.visible = false; // Option A: Hidden in normal view, toggled via Alt-Mode [ALT] and Minimap [M]

        this.generateSectors();
    }

    /**
     * Toggles tactical rhombus sector boundary display across all sectors in Alt-Mode [ALT].
     */
    public setAltMode(active: boolean): void {
        this.container.visible = active;
        for (const sector of this.sectors.values()) {
            sector.setAltMode(active);
        }
    }

    private generateSectors(): void {
        const D = this.sectorSize;
        const W = this.worldWidth;
        const H = this.worldHeight;

        const minU = Math.floor(-W / D) - 1;
        const maxU = Math.ceil(H / D) + 1;
        const minV = -1;
        const maxV = Math.ceil((W + H) / D) + 1;

        for (let u = minU; u <= maxU; u++) {
            for (let v = minV; v <= maxV; v++) {
                const cx = (v - u) * (D / 2);
                const cy = (u + v + 1) * (D / 2);

                // Include sector if its bounding box intersects world bounds
                if (cx + D / 2 >= 0 && cx - D / 2 <= W && cy + D / 2 >= 0 && cy - D / 2 <= H) {
                    const key = `${u}_${v}`;
                    // Generate military tactical designation (e.g. SEC-A04, SEC-H06)
                    const rowIdx = (u + 12) % 26;
                    const letter = String.fromCharCode(65 + Math.abs(rowIdx));
                    const numStr = Math.max(1, v).toString().padStart(2, '0');
                    const sectorId = `SEC-${letter}${numStr}`;

                    const sector = new RhombusSector({
                        id: sectorId,
                        u,
                        v,
                        cx,
                        cy,
                        size: D,
                    });

                    this.sectors.set(key, sector);
                    this.container.addChild(sector.container);
                }
            }
        }
    }

    public getSectorAt(px: number, py: number): RhombusSector | null {
        const D = this.sectorSize;
        const u0 = Math.floor((py - px) / D);
        const v0 = Math.floor((py + px) / D);
        const key = `${u0}_${v0}`;
        return this.sectors.get(key) || null;
    }

    private botReservations: Map<string, string> = new Map(); // botId -> sectorId

    public reserveSector(botId: string, sectorId: string): void {
        this.botReservations.set(botId, sectorId);
    }

    public releaseSectorReservation(botId: string): void {
        this.botReservations.delete(botId);
    }

    /**
     * Wyszukuje najbliższy nieoczyszczony (i nieprzejęty) sektor dla autonomicznych robotów (Roomba).
     * Zapobiega kolizji i dublowaniu: wyklucza sektory zarezerwowane przez inne boty.
     */
    public getNearestUnclaimedSector(fromX: number, fromY: number, botId?: string): RhombusSector | null {
        let nearest: RhombusSector | null = null;
        let minDistSq = Infinity;

        // Sektory zarezerwowane przez INNE roboty
        const otherReserved = new Set<string>();
        for (const [bId, sId] of this.botReservations.entries()) {
            if (!botId || bId !== botId) {
                otherReserved.add(sId);
            }
        }

        // Krok 1: Wyszukaj najbliższy nieprzejęty i wolny od innych botów sektor
        for (const sector of this.sectors.values()) {
            if (sector.isClaimed) continue;
            if (otherReserved.has(sector.id)) continue;
            const dx = sector.cx - fromX;
            const dy = sector.cy - fromY;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearest = sector;
            }
        }

        // Krok 2: Fallback (gdyby robotów było więcej niż dostępnych wolnych sektorów)
        if (!nearest) {
            minDistSq = Infinity;
            for (const sector of this.sectors.values()) {
                if (sector.isClaimed) continue;
                const dx = sector.cx - fromX;
                const dy = sector.cy - fromY;
                const distSq = dx * dx + dy * dy;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    nearest = sector;
                }
            }
        }

        if (nearest && botId) {
            this.botReservations.set(botId, nearest.id);
        }

        return nearest;
    }

    public notifyDustCleanedAt(x: number, y: number): void {
        const sector = this.getSectorAt(x, y);
        if (sector && !sector.isClaimed) {
            this.pendingEvaluationSectors.add(sector);
        }
    }

    /**
     * Weryfikuje czy sektor spełnia warunek ukończenia (>= 95.5% pyłu wyczyszczone, czyli zaokrąglone 96%).
     * Jeśli tak:
     * 1. Czyści matrycę do 100% (zero pozostających paprochów)
     * 2. Oznacza sektor jako przejęty (isClaimed = true, cleanPercentage = 100)
     * 3. Kolejkuje nagrodę $10.00 i mnożnik +10% do odebrania w silniku gry
     */
    public claimSectorIfQualified(sector: RhombusSector, dirtSystem: DirtSystem): SectorClaimEvent | null {
        if (sector.isClaimed) return null;

        const cleanPct = dirtSystem.getRhombusCleanPercentage(
            sector.cx,
            sector.cy,
            this.sectorSize,
            this.sectorSize,
        );
        sector.updateCleanliness(cleanPct);

        if (cleanPct >= 95.5 || sector.cleanPercentage >= 96) {
            return this.forceClaimSector(sector, dirtSystem);
        }

        return null;
    }

    /**
     * Wymusza natychmiastowe zaliczenie sektora (wywoływane np. po ukończeniu wszystkich pasów przez robota).
     */
    public forceClaimSector(sector: RhombusSector, dirtSystem: DirtSystem): SectorClaimEvent {
        if (sector.isClaimed) {
            return {
                sector,
                creditsAward: 0,
                totalBonusPercent: this.getClaimedCount() * 10,
            };
        }

        // 1. Pełne oczyszczenie matrycy logicznej i wizualnej renderTexture
        dirtSystem.clearRhombus(sector.cx, sector.cy, this.sectorSize, this.sectorSize);

        // 2. Oznaczenie sektora jako zdobytego
        sector.claim();
        this.claimedSectors.add(sector.id);
        this.pendingEvaluationSectors.delete(sector);
        for (const [bId, sId] of this.botReservations.entries()) {
            if (sId === sector.id) this.botReservations.delete(bId);
        }

        // 3. Rejestracja zdarzenia nagrody ekonomicznej
        const event: SectorClaimEvent = {
            sector,
            creditsAward: 10, // $10.00 nagroda za oczyszczenie sektora
            totalBonusPercent: this.getClaimedCount() * 10,
        };
        this.claimEventQueue.push(event);
        return event;
    }

    /**
     * Updates telemetry of the sector the player is currently standing on (for HUD).
     */
    public updatePlayerSectorTelemetry(
        playerPos: { x: number; y: number },
        dirtSystem: DirtSystem,
    ): void {
        const sector = this.getSectorAt(playerPos.x, playerPos.y);
        if (sector && !sector.isClaimed) {
            this.claimSectorIfQualified(sector, dirtSystem);
        }
    }

    /**
     * Evaluates any sectors that recently had dust cleaned (by player, mouse, or bots).
     * Returns all claim events triggered during this tick or queued by bots/player.
     */
    public evaluatePendingSectors(dirtSystem: DirtSystem): SectorClaimEvent[] {
        for (const sector of this.pendingEvaluationSectors) {
            if (!sector.isClaimed) {
                this.claimSectorIfQualified(sector, dirtSystem);
            }
        }
        this.pendingEvaluationSectors.clear();

        // Opróżnij kolejkę zdarzeń zakończenia i przekaż do GameEngine
        const events = [...this.claimEventQueue];
        this.claimEventQueue = [];
        return events;
    }

    public getClaimedCount(): number {
        return this.claimedSectors.size;
    }

    /**
     * Returns the global economic multiplier:
     * 1 claimed sector = 1.10 (+10%), 2 claimed sectors = 1.20 (+20%), etc.
     */
    public getTotalBonusMultiplier(): number {
        return 1.0 + (this.getClaimedCount() * 0.10);
    }

    public getSectorBonusPercent(): number {
        return this.getClaimedCount() * 10;
    }

    public getStats(playerPos: { x: number; y: number }) {
        const active = this.getSectorAt(playerPos.x, playerPos.y);
        return {
            activeSectorId: active?.id ?? 'SEC-OUTPOST',
            activeSectorCleanPct: active?.cleanPercentage ?? 0,
            activeSectorClaimed: active?.isClaimed ?? false,
            claimedSectorsCount: this.getClaimedCount(),
            totalSectorsCount: this.sectors.size,
            sectorBonusPercent: this.getSectorBonusPercent(),
            bonusMultiplier: this.getTotalBonusMultiplier(),
        };
    }

    public destroy(): void {
        for (const sector of this.sectors.values()) {
            sector.destroy();
        }
        this.sectors.clear();
        this.claimedSectors.clear();
        this.container.destroy({ children: true });
    }
}

