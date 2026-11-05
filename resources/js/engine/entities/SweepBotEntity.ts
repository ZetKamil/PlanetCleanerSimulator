import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { DirtSystem } from '../DirtSystem';
import type { SectorManager } from '../sectors/SectorManager';
import type { RhombusSector } from '../sectors/RhombusSector';
import { BotCleaningTool, type BotToolType } from './BotCleaningTool';
import { AutonomousEntity } from './AutonomousEntity';
import { VENUS_THEME } from '../VenusArtTheme';
import { BotModel } from '../../core/models/BotModel';

export type BotState =
    | 'ASSIGN_SECTOR'
    | 'NAVIGATE_TO_SECTOR'
    | 'ROOMBA_SWEEP'
    | 'RETURN_TO_DOCK'
    | 'UNLOAD';

export interface BotDropoffContext {
    policy: 'silos_first' | 'nearest_any' | 'base_only';
    silos: Array<{ id: string; x: number; y: number; acceptsBots: boolean; storedDust: number; maxDustCapacity: number }>;
    docks?: Array<{ x: number; y: number }>;
    basePos: { x: number; y: number };
}

export interface BotUpdateResult {
    unloadedDust: number;
    unloadedToSilo?: { siloId: string; amount: number; x: number; y: number };
}

export interface SweepLane {
    v: number;
    uStart: number;
    uEnd: number;
    worldStart: { x: number; y: number };
    worldEnd: { x: number; y: number };
}

export interface SweepBotOptions {
    id?: string;
    x: number;
    y: number;
    worldWidth: number;
    worldHeight: number;
    dockPosition?: { x: number; y: number };
    toolType?: BotToolType;
    speed?: number;
    capacity?: number;
}

export class SweepBotEntity extends AutonomousEntity {
    public radius: number = 14;
    public readonly model: BotModel;

    // Zaawansowane parametry narzędzia (OOP Component)
    public tool: BotCleaningTool;

    // Maszyna stanów i koordynacja sektorowa (Roomba Pattern)
    public state: BotState = 'ASSIGN_SECTOR';
    public dockPosition: { x: number; y: number };
    public assignedSector: RhombusSector | null = null;

    private bodyContainer: Container;
    private graphics: Graphics;
    private stateLabel: Text;

    // Nowy system pasów rombowych (Lawnmower Rhombus Stripe Sweeping)
    private sectorLanes: SweepLane[] = [];
    private currentLaneIdx: number = 0;
    private lanePhase: 'ALIGN' | 'SWEEP' = 'ALIGN';
    private cleanCheckTimer: number = 0;
    private currentDropoffTarget: { type: 'silo' | 'base'; id?: string; x: number; y: number } | null = null;

    private worldWidth: number;
    private worldHeight: number;

    constructor(options: SweepBotOptions) {
        super(
            options.id ?? `sweep_bot_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            options.x,
            options.y,
            options.speed ?? 135,
            options.capacity ?? 20,
        );

        this.worldWidth = options.worldWidth;
        this.worldHeight = options.worldHeight;
        this.dockPosition = options.dockPosition ?? { x: 1024, y: 1024 };

        // 1. Narzędzie czyszczące (szczotka/miotła/odkurzacz) – niezależny obiekt OOP
        this.tool = new BotCleaningTool({ type: options.toolType ?? 'brush' });

        this.model = new BotModel({
            id: this.id,
            x: this.x,
            y: this.y,
            dockX: this.dockPosition.x,
            dockY: this.dockPosition.y,
            speed: this.speed,
            capacity: this.maxCapacity,
            cleaningRadius: this.tool.radius,
        });

        // Kontener obracający się wraz z kierunkiem ruchu robota
        this.bodyContainer = new Container();
        this.container.addChild(this.bodyContainer);
        this.bodyContainer.addChild(this.tool.container);

        // 2. Kadłub robota
        this.graphics = new Graphics();
        this.bodyContainer.addChild(this.graphics);

        // 3. Etykieta taktyczna pod robotem (zawsze pozioma, nieobraca się)
        const style = new TextStyle({
            fontSize: 8,
            fill: '#fde047',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            dropShadow: { color: '#000000', alpha: 0.9, distance: 1 },
        });
        this.stateLabel = new Text({ text: 'Sweep-Bot', style });
        this.stateLabel.anchor.set(0.5, 0);
        this.stateLabel.y = this.radius + 4;
        this.container.addChild(this.stateLabel);

        this.renderBot();
    }

    public setSpeed(newSpeed: number): void {
        this.speed = Math.max(50, newSpeed);
    }

    public setCapacity(newCapacity: number): void {
        this.maxCapacity = Math.max(10, newCapacity);
        this.renderBot();
    }

    public equipTool(newTool: BotCleaningTool): void {
        this.bodyContainer.removeChild(this.tool.container);
        this.tool.destroy();
        this.tool = newTool;
        this.bodyContainer.addChildAt(this.tool.container, 0);
        // Po zmianie narzędzia przelicz pasy dla bieżącego sektora
        if (this.assignedSector && !this.assignedSector.isClaimed) {
            this.generateSectorLanes(this.assignedSector);
        }
    }

    private renderBot(): void {
        this.graphics.clear();

        // 1. Miękki cień bota na gruncie
        this.graphics.ellipse(0, 3, this.radius + 3, this.radius + 1)
            .fill({ color: 0x000000, alpha: 0.35 });

        // 2. Boczne metalowe gąsienice (Side Crawler Treads)
        const treadW = 5;
        const treadH = 22;
        // Lewa gąsienica
        this.graphics.roundRect(-this.radius - 3, -11, treadW, treadH, 2.5)
            .fill({ color: 0x18181b })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });
        // Prawa gąsienica
        this.graphics.roundRect(this.radius - 2, -11, treadW, treadH, 2.5)
            .fill({ color: 0x18181b })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        // Prążki trakcyjne gąsienic
        for (let ty = -8; ty <= 8; ty += 4) {
            this.graphics.moveTo(-this.radius - 2, ty).lineTo(-this.radius + 1, ty).stroke({ width: 1, color: 0x52525b });
            this.graphics.moveTo(this.radius - 1, ty).lineTo(this.radius + 2, ty).stroke({ width: 1, color: 0x52525b });
        }

        // 3. Pękaty, ciepły miodowo-żółty kadłub (Styl Pixar / Wall-E)
        this.graphics.roundRect(-this.radius + 1, -12, (this.radius - 1) * 2, 24, 7)
            .fill({ color: VENUS_THEME.hazardYellow })
            .stroke({ width: 2.5, color: VENUS_THEME.ink });

        // 4. Górna pokrywa serwisowa z industrialnego beżu z nitami
        this.graphics.roundRect(-this.radius + 4, -8, (this.radius - 4) * 2, 16, 4)
            .fill({ color: VENUS_THEME.industrialBeige })
            .stroke({ width: 1, color: VENUS_THEME.copperDark });

        // Nity na rogach pokrywy
        this.graphics.circle(-this.radius + 6, -5, 1).fill({ color: VENUS_THEME.rivetColor });
        this.graphics.circle(this.radius - 6, -5, 1).fill({ color: VENUS_THEME.rivetColor });
        this.graphics.circle(-this.radius + 6, 5, 1).fill({ color: VENUS_THEME.rivetColor });
        this.graphics.circle(this.radius - 6, 5, 1).fill({ color: VENUS_THEME.rivetColor });

        // 5. Przedni panel wizjera i dwa świecące złote oczy (Wall-E Eyes)
        this.graphics.roundRect(-9, -13, 18, 9, 4)
            .fill({ color: 0x090d16 })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        const isFull = this.currentDust >= this.maxCapacity;

        if (this.state === 'UNLOAD') {
            // Radosne zmrużone oczka ^^ przy rozładunku w bazie!
            this.graphics.moveTo(-6, -8).quadraticCurveTo(-4, -11, -2, -8).stroke({ width: 1.8, color: 0xfef08a });
            this.graphics.moveTo(2, -8).quadraticCurveTo(4, -11, 6, -8).stroke({ width: 1.8, color: 0xfef08a });
        } else if (isFull) {
            // Ostrzegawcze czerwone oczka zaniepokojenia
            this.graphics.circle(-4, -9, 2.5).fill({ color: 0xef4444 });
            this.graphics.circle(4, -9, 2.5).fill({ color: 0xef4444 });
            this.graphics.circle(-4.6, -9.6, 0.8).fill({ color: 0xffffff });
            this.graphics.circle(3.4, -9.6, 0.8).fill({ color: 0xffffff });
        } else {
            // Dwa wyraziste świecące złote oczka z błyskiem refleksu
            this.graphics.circle(-4, -9, 2.5).fill({ color: 0xfde047 });
            this.graphics.circle(4, -9, 2.5).fill({ color: 0xfde047 });
            this.graphics.circle(-4.7, -9.7, 0.8).fill({ color: 0xffffff });
            this.graphics.circle(3.3, -9.7, 0.8).fill({ color: 0xffffff });
        }

        // 6. Mini miotełka szczotkowa z przodu (Front Sweeper Whisk)
        this.graphics.poly([
            { x: -5, y: -this.radius - 1 },
            { x: 0, y: -this.radius - 5 },
            { x: 5, y: -this.radius - 1 },
        ]).fill({ color: VENUS_THEME.terracottaLight })
            .stroke({ width: 1, color: VENUS_THEME.ink });
    }

    public update(
        dt: number,
        dirtSystem: DirtSystem,
        sectorManager?: SectorManager,
        dropoffContext?: BotDropoffContext
    ): BotUpdateResult {
        let unloadedDust = 0;
        let unloadedToSilo: { siloId: string; amount: number; x: number; y: number } | undefined = undefined;

        switch (this.state) {
            case 'ASSIGN_SECTOR':
                this.handleAssignSector(sectorManager, dirtSystem);
                break;
            case 'NAVIGATE_TO_SECTOR':
                this.handleNavigateToSector(dt, sectorManager, dirtSystem);
                break;
            case 'ROOMBA_SWEEP':
                this.handleRoombaSweep(dt, dirtSystem, sectorManager);
                break;
            case 'RETURN_TO_DOCK':
                this.handleReturnToDock(dt, dropoffContext);
                break;
            case 'UNLOAD': {
                const res = this.handleUnload();
                unloadedDust = res.unloadedDust;
                unloadedToSilo = res.unloadedToSilo;
                break;
            }
        }

        // Aktualizacja pozycji i rotacji
        this.container.x = this.x;
        this.container.y = this.y;
        this.bodyContainer.rotation = this.rotation;

        // Synchronize Headless BotModel state
        this.model.x = this.x;
        this.model.y = this.y;
        this.model.rotation = this.rotation;
        this.model.dustBuffer = this.currentDust;
        this.model.capacity = this.maxCapacity;
        this.model.speed = this.speed;

        return { unloadedDust, unloadedToSilo };
    }

    /**
     * Konwertuje współrzędne obróconego układu rombu (u, v) do współrzędnych świata (x, y).
     * W przestrzeni (u, v) romb o przekątnej 512px jest idealnym kwadratem [-L, L] x [-L, L].
     */
    private uvToWorld(u: number, v: number, cx: number, cy: number): { x: number; y: number } {
        return {
            x: cx + (u - v) * (1 / Math.SQRT2),
            y: cy + (u + v) * (1 / Math.SQRT2),
        };
    }

    /**
     * Generuje równoległe pasy czyszczenia wzdłuż przekątnej 45 stopni rombu (Lawnmower Pattern).
     * Zapewnia równe, czyste pasy bez ząbków i chaosu!
     */
    private generateSectorLanes(sector: RhombusSector): void {
        this.sectorLanes = [];
        this.currentLaneIdx = 0;
        this.lanePhase = 'ALIGN';

        const H = sector.halfSize; // 256
        const L = H / Math.SQRT2;  // ~181.02
        const margin = 10;
        const Leff = L - margin;

        // Odstęp między pasami zależy od szerokości narzędzia (25% overlap)
        const laneSpacing = Math.max(14, this.tool.radius * 1.5);
        const totalSpan = 2 * Leff;
        const numLanes = Math.max(3, Math.ceil(totalSpan / laneSpacing));
        const vStep = totalSpan / (numLanes - 1);

        for (let i = 0; i < numLanes; i++) {
            const v = -Leff + i * vStep;
            // Pasy naprzemienne (boustrophedon):
            // Parzyste pasy jadą w przód (-Leff -> +Leff), nieparzyste wracają (+Leff -> -Leff)
            const uStart = (i % 2 === 0) ? -Leff : Leff;
            const uEnd = (i % 2 === 0) ? Leff : -Leff;

            this.sectorLanes.push({
                v,
                uStart,
                uEnd,
                worldStart: this.uvToWorld(uStart, v, sector.cx, sector.cy),
                worldEnd: this.uvToWorld(uEnd, v, sector.cx, sector.cy),
            });
        }
    }

    /**
     * Szybkie próbkowanie czy pas jest już w całości czysty.
     */
    private isLaneClean(lane: SweepLane, dirtSystem: DirtSystem): boolean {
        const samples = 8;
        for (let s = 0; s <= samples; s++) {
            const t = s / samples;
            const sx = lane.worldStart.x + (lane.worldEnd.x - lane.worldStart.x) * t;
            const sy = lane.worldStart.y + (lane.worldEnd.y - lane.worldStart.y) * t;
            if (!dirtSystem.isClean(sx, sy)) {
                return false;
            }
        }
        return true;
    }

    /**
     * KROK 1: Wybór i przypisanie sektora, który wymaga oczyszczenia.
     */
    private handleAssignSector(sectorManager?: SectorManager, dirtSystem?: DirtSystem): void {
        this.stateLabel.text = '🔍 CEL SEKTOR';

        if (!sectorManager || !dirtSystem) {
            this.state = 'ROOMBA_SWEEP';
            return;
        }

        // 1. Jeśli bieżący sektor nadal istnieje i nie jest przejęty:
        if (this.assignedSector && !this.assignedSector.isClaimed) {
            // Sprawdź czy przypadkiem nie kwalifikuje się już do przejęcia
            const claimEvent = sectorManager.claimSectorIfQualified(this.assignedSector, dirtSystem);
            if (!claimEvent && !this.assignedSector.isClaimed) {
                // Sektor nadal wymaga pracy – kontynuuj!
                if (this.assignedSector.contains(this.x, this.y)) {
                    this.state = 'ROOMBA_SWEEP';
                } else {
                    this.state = 'NAVIGATE_TO_SECTOR';
                }
                return;
            }
        }

        // 2. Wyszukaj najbliższy nieoczyszczony sektor (z rezerwacją unikalną dla tego bota)
        const nextSector = sectorManager.getNearestUnclaimedSector(this.x, this.y, this.id);
        if (nextSector) {
            this.assignedSector = nextSector;
            this.generateSectorLanes(nextSector);

            if (nextSector.contains(this.x, this.y)) {
                this.state = 'ROOMBA_SWEEP';
            } else {
                this.state = 'NAVIGATE_TO_SECTOR';
            }
        } else {
            // Wszystkie sektory oczyszczone!
            sectorManager.releaseSectorReservation(this.id);
            if (this.currentDust > 0) {
                this.state = 'RETURN_TO_DOCK';
            } else {
                this.stateLabel.text = '✨ WENUS CZYSTA';
            }
        }
    }

    /**
     * KROK 2: Dolot do wyznaczonego sektora z pełną prędkością.
     */
    private handleNavigateToSector(dt: number, sectorManager?: SectorManager, dirtSystem?: DirtSystem): void {
        if (!this.assignedSector || this.assignedSector.isClaimed) {
            this.state = 'ASSIGN_SECTOR';
            this.sectorLanes = [];
            return;
        }

        if (sectorManager && dirtSystem) {
            const claimEvent = sectorManager.claimSectorIfQualified(this.assignedSector, dirtSystem);
            if (claimEvent || this.assignedSector.isClaimed) {
                this.state = 'ASSIGN_SECTOR';
                this.sectorLanes = [];
                return;
            }
        }

        this.stateLabel.text = '🚀 W DRODZE';
        this.tool.update(dt, false);

        if (this.sectorLanes.length === 0) {
            this.generateSectorLanes(this.assignedSector);
        }

        // Celujemy w początek pierwszego niedokończonego pasa
        const target = (this.currentLaneIdx < this.sectorLanes.length)
            ? this.sectorLanes[this.currentLaneIdx].worldStart
            : { x: this.assignedSector.cx, y: this.assignedSector.cy };

        const reached = this.moveTowards(target.x, target.y, dt);
        if (reached || this.assignedSector.contains(this.x, this.y)) {
            this.state = 'ROOMBA_SWEEP';
        }
    }

    /**
     * KROK 3: Systematyczne pasowe sprzątanie wyznaczonego sektora rombowego (Lawnmower Roomba).
     * Zasady:
     * 1. Robot jedzie równoległymi pasami pod kątem 45 stopni wzdłuż krawędzi rombu.
     * 2. Zbiera brud w sposób ciągły (sweepContinuous) eliminując wszelkie ząbki.
     * 3. Wraca do bazy TYLKO po pełnym zapełnieniu zbiornika (20kg), a po rozładunku wraca dokończyć ten sam sektor!
     * 4. Przy 96% sektor natychmiast się zalicza (100% auto-clean, $100 bonus, ding dźwiękowy).
     */
    private handleRoombaSweep(dt: number, dirtSystem: DirtSystem, sectorManager?: SectorManager): void {
        if (!this.assignedSector || this.assignedSector.isClaimed) {
            this.state = 'ASSIGN_SECTOR';
            this.sectorLanes = [];
            return;
        }

        const dustKg = this.currentDust.toFixed(1);
        this.stateLabel.text = `🧹 PAS ${this.currentLaneIdx + 1}/${this.sectorLanes.length} (${dustKg}/${this.maxCapacity}kg)`;

        // 1. KLUCZOWY WARUNEK: Powrót do bazy TYLKO gdy zbiornik jest w 100% pełny!
        if (this.currentDust >= this.maxCapacity) {
            this.currentDust = this.maxCapacity;
            this.state = 'RETURN_TO_DOCK';
            this.currentDropoffTarget = null;
            this.tool.update(dt, false);
            this.renderBot(); // Oczy zapalają się na czerwono
            return;
        }

        // 2. Przygotowanie pasów rombu
        if (this.sectorLanes.length === 0) {
            this.generateSectorLanes(this.assignedSector);
        }

        // 3. Okresowa weryfikacja czy sektor osiągnął próg ukończenia (>= 96%)
        this.cleanCheckTimer -= dt;
        if (this.cleanCheckTimer <= 0) {
            this.cleanCheckTimer = 0.35;
            if (sectorManager) {
                const claimEvent = sectorManager.claimSectorIfQualified(this.assignedSector, dirtSystem);
                if (claimEvent || this.assignedSector.isClaimed) {
                    // Sektor zdobyty! Przyznano bonus i wykonano auto-clean do 100%
                    sectorManager.releaseSectorReservation(this.id);
                    this.state = 'ASSIGN_SECTOR';
                    this.sectorLanes = [];
                    return;
                }
            }
        }

        // 4. Przeskakiwanie pasów, które są już w 100% czyste
        while (
            this.currentLaneIdx < this.sectorLanes.length &&
            this.isLaneClean(this.sectorLanes[this.currentLaneIdx], dirtSystem)
        ) {
            this.currentLaneIdx++;
            this.lanePhase = 'ALIGN';
        }

        // Jeśli bot przejechał już wszystkie pasy w sektorze:
        if (this.currentLaneIdx >= this.sectorLanes.length) {
            if (sectorManager) {
                // Wymuś pełne zaliczenie sektora z nagrodą i oczyszczeniem 100%
                sectorManager.forceClaimSector(this.assignedSector, dirtSystem);
                sectorManager.releaseSectorReservation(this.id);
            }
            this.state = 'ASSIGN_SECTOR';
            this.sectorLanes = [];
            return;
        }

        const currentLane = this.sectorLanes[this.currentLaneIdx];
        const prevX = this.x;
        const prevY = this.y;

        if (this.lanePhase === 'ALIGN') {
            // A) Dolot do początku bieżącego pasa
            const reached = this.moveTowards(currentLane.worldStart.x, currentLane.worldStart.y, dt);

            // Ciągłe oczyszczanie pasma w trakcie ruchu
            const sweepRes = this.tool.sweepContinuous(prevX, prevY, this.x, this.y, dirtSystem);
            this.currentDust += sweepRes.cleanedKg;
            this.tool.update(dt, true);

            if (sectorManager && sweepRes.cleanedKg > 0) {
                sectorManager.notifyDustCleanedAt(this.x, this.y);
            }

            if (reached) {
                this.lanePhase = 'SWEEP';
            }
        } else {
            // B) Zamiatanie wzdłuż pasa (precyzyjnie 45° wzdłuż krawędzi rombu)
            const reached = this.moveTowards(currentLane.worldEnd.x, currentLane.worldEnd.y, dt);

            // Ciągłe oczyszczanie pasma
            const sweepRes = this.tool.sweepContinuous(prevX, prevY, this.x, this.y, dirtSystem);
            this.currentDust += sweepRes.cleanedKg;
            this.tool.update(dt, true);

            if (sectorManager && sweepRes.cleanedKg > 0) {
                sectorManager.notifyDustCleanedAt(this.x, this.y);
            }

            if (reached) {
                // Koniec pasa – natychmiastowa weryfikacja ukończenia sektora
                if (sectorManager) {
                    const claimEvent = sectorManager.claimSectorIfQualified(this.assignedSector, dirtSystem);
                    if (claimEvent || this.assignedSector.isClaimed) {
                        this.state = 'ASSIGN_SECTOR';
                        this.sectorLanes = [];
                        return;
                    }
                }

                // Przejście do następnego pasa
                this.currentLaneIdx++;
                this.lanePhase = 'ALIGN';
            }
        }
    }

    /**
     * KROK 4: Powrót do punktu zrzutu na rozładunek (Baza vs. Silosy wg botDropoffPolicy).
     */
    private handleReturnToDock(dt: number, dropoffContext?: BotDropoffContext): void {
        this.tool.update(dt, false);

        const basePos = dropoffContext?.basePos ?? this.dockPosition;
        const policy = dropoffContext?.policy ?? 'silos_first';
        const silos = dropoffContext?.silos ?? [];

        // Filtrujemy silosy, które mają włączone przyjmowanie botów i wolne miejsce w buforze (< 300 kg)
        const validSilos = silos.filter(s => s.acceptsBots && s.storedDust < s.maxDustCapacity);

        if (!this.currentDropoffTarget || (this.currentDropoffTarget.type === 'silo' && !validSilos.some(s => s.id === this.currentDropoffTarget?.id))) {
            if (policy === 'silos_first') {
                if (validSilos.length > 0) {
                    // Wybierz najbliższy silos
                    let nearestSilo = validSilos[0];
                    let minDist = Math.hypot(this.x - nearestSilo.x, this.y - nearestSilo.y);
                    for (let i = 1; i < validSilos.length; i++) {
                        const d = Math.hypot(this.x - validSilos[i].x, this.y - validSilos[i].y);
                        if (d < minDist) {
                            minDist = d;
                            nearestSilo = validSilos[i];
                        }
                    }
                    this.currentDropoffTarget = { type: 'silo', id: nearestSilo.id, x: nearestSilo.x, y: nearestSilo.y };
                } else {
                    // Wszystkie silosy pełne lub brak -> zjazd do Bazy
                    this.currentDropoffTarget = { type: 'base', x: basePos.x, y: basePos.y };
                }
            } else if (policy === 'nearest_any') {
                let bestTarget: { type: 'silo' | 'base'; id?: string; x: number; y: number } = { type: 'base', x: basePos.x, y: basePos.y };
                let bestDist = Math.hypot(this.x - basePos.x, this.y - basePos.y);

                for (const s of validSilos) {
                    const d = Math.hypot(this.x - s.x, this.y - s.y);
                    if (d < bestDist) {
                        bestDist = d;
                        bestTarget = { type: 'silo', id: s.id, x: s.x, y: s.y };
                    }
                }
                this.currentDropoffTarget = bestTarget;
            } else {
                // 'base_only' - tylko Baza Centralna
                this.currentDropoffTarget = { type: 'base', x: basePos.x, y: basePos.y };
            }
        }

        const target = this.currentDropoffTarget;
        if (target.type === 'silo') {
            this.stateLabel.text = `🏛️ DO SILOSU (${this.currentDust.toFixed(0)}kg)`;
        } else {
            this.stateLabel.text = `⚓ DO BAZY (${this.currentDust.toFixed(0)}kg)`;
        }

        const dist = Math.hypot(this.x - target.x, this.y - target.y);
        const reached = this.moveTowards(target.x, target.y, dt);
        if (reached || dist <= 48) {
            this.state = 'UNLOAD';
            this.renderBot(); // Radosne zmrużone oczka ^^
        }
    }

    /**
     * KROK 5: Rozładunek urobku (w Silosie lub Bazie) i powrót do zamiatania.
     */
    private handleUnload(): { unloadedDust: number; unloadedToSilo?: { siloId: string; amount: number; x: number; y: number } } {
        const dumped = this.currentDust;
        this.currentDust = 0;
        this.renderBot();

        const target = this.currentDropoffTarget;
        this.currentDropoffTarget = null;

        // Po rozładunku wraca do swojego sektora, jeśli nie został jeszcze ukończony!
        if (this.assignedSector && !this.assignedSector.isClaimed) {
            this.state = 'NAVIGATE_TO_SECTOR';
        } else {
            this.state = 'ASSIGN_SECTOR';
            this.sectorLanes = [];
        }

        if (target && target.type === 'silo' && target.id) {
            this.stateLabel.text = '⚡ ZRZUT DO SILO';
            return {
                unloadedDust: 0,
                unloadedToSilo: { siloId: target.id, amount: dumped, x: target.x, y: target.y },
            };
        } else {
            this.stateLabel.text = '⚡ WYŁADUNEK W BAZIE';
            return { unloadedDust: dumped };
        }
    }

    public override moveTowards(tx: number, ty: number, dt: number): boolean {
        return super.moveTowards(tx, ty, dt, 4, Math.PI / 2);
    }

    public destroy(): void {
        this.tool.destroy();
        this.graphics.destroy();
        this.stateLabel.destroy();
        this.container.destroy({ children: true });
    }
}
