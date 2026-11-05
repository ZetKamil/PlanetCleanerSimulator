import { Container, Graphics } from 'pixi.js';
import type { GridSystem } from './GridSystem';
import type { BuildingEntity, Direction } from './entities/BuildingEntity';
import type { SiloBuilding } from './entities/buildings/ProductionBuildings';
import type { ThermalCrater } from './hazards/ThermalCraterSystem';
import { SimulationCore } from '../core/simulation/SimulationCore';

export type FactoryItemType = 'dust_bag' | 'briquette' | 'plate' | 'acid_cell';

export interface FactoryItem {
    id: string;
    type: FactoryItemType;
    gridX: number;
    gridY: number;
    progress: number; // 0.0 to 1.0 along current conveyor
    value: number; // dust_bag: $1.20, briquette: $4.50, plate: $16.00, acid_cell: $45.00
}

export interface ShieldDome {
    x: number;
    y: number;
    radius: number; // 280 px
    active: boolean;
}

export interface SimulationResult {
    creditsEarned: number;
    briquettesSold: number;
    platesSold: number;
    acidCellsSold: number;
    totalPowerProduced: number;
    totalPowerConsumed: number;
    hasPower: boolean;
    hasPackagerStomped: boolean;
    hasSmelterFinished: boolean;
    hasRefineryFinished: boolean;
    activeShieldDomes: ShieldDome[];
}

export class SimulationLoop {
    /**
     * Headless core simulation engine.
     * Pure calculations without PixiJS/Three.js rendering dependencies.
     */
    public readonly core: SimulationCore = new SimulationCore();

    private gridSystem: GridSystem;
    private tickTimer: number = 0;
    public readonly tickInterval: number = 0.1; // 10 Hz machine tick

    // Cache stanu symulacji (zapobiega resetowaniu pól siłowych i energii między klatkami 60 FPS)
    private lastTotalPowerProduced: number = 10;
    private lastTotalPowerConsumed: number = 0;
    private lastHasPower: boolean = true;
    private lastActiveShieldDomes: ShieldDome[] = [];
    public isAcidRainActive: boolean = false;
    public hotCraterChecker?: (worldX: number, worldY: number) => boolean;
    public craterGetter?: (worldX: number, worldY: number) => ThermalCrater | null;

    // Moving items on conveyors
    public items: FactoryItem[] = [];

    // Dedicated rendering layer for conveyor items (Single Draw Call PixiJS)
    public itemsContainer: Container;
    private itemsGfx: Graphics;

    // Internal machine timers & storage
    private packagerProgress: Map<string, number> = new Map(); // id -> ticks (0..30)
    private packagerHasRaw: Map<string, boolean> = new Map();
    private smelterProgress: Map<string, number> = new Map();  // id -> ticks (0..25)
    private smelterHasBriquette: Map<string, boolean> = new Map();
    private siloQueues: Map<string, FactoryItemType[]> = new Map(); // id -> items queue
    private siloDust: Map<string, number> = new Map(); // id -> raw dust (kg)
    private splitterToggle: Map<string, boolean> = new Map();

    constructor(gridSystem: GridSystem) {
        this.gridSystem = gridSystem;
        this.itemsContainer = new Container();
        this.itemsContainer.label = 'simulation-items-layer';
        this.itemsGfx = new Graphics();
        this.itemsContainer.addChild(this.itemsGfx);
    }

    public getPackagerRatio(id: string): number {
        return Math.min(1, (this.packagerProgress.get(id) ?? 0) / 30);
    }

    public getSmelterProgress(id: string): number {
        return Math.min(1, (this.smelterProgress.get(id) ?? 0) / 25);
    }

    public getSmelterHasRaw(id: string): boolean {
        return this.smelterHasBriquette.get(id) ?? false;
    }

    public getRefineryProgress(id: string): number {
        return 0;
    }

    public getRefineryHasAcid(id: string): boolean {
        return false;
    }

    public getSiloCount(id: string): number {
        return this.siloQueues.get(id)?.length ?? 0;
    }

    public getSiloDust(id: string): number {
        return this.siloDust.get(id) ?? 0;
    }

    /**
     * Bezpośredni zrzut urobku gracza do Magazynu Zasobnikowego (Silo).
     * Zwraca faktycznie zdeponowaną ilość pyłu (w kg).
     */
    public depositDustIntoSilo(siloId: string, dustAmount: number): number {
        if (dustAmount <= 0) return 0;
        const current = this.siloDust.get(siloId) ?? 0;
        const maxCapacity = 300; // 300 kg pyłu max
        const spaceLeft = Math.max(0, maxCapacity - current);
        const actualDeposited = Math.min(spaceLeft, dustAmount);

        if (actualDeposited > 0) {
            const newTotal = current + actualDeposited;
            this.siloDust.set(siloId, Number(newTotal.toFixed(2)));

            const building = this.gridSystem.buildings.get(siloId) as SiloBuilding | undefined;
            if (building) {
                building.storedDust = Number(newTotal.toFixed(2));
                building.inventoryCount = (this.siloQueues.get(siloId) ?? []).length;
            }
        }

        return actualDeposited;
    }

    public update(dt: number, baseDepotRect: { x: number; y: number; width: number; height: number }): SimulationResult {
        // 1. Płynny ruch przedmiotów po taśmociągach (Factorio-style Continuous Interpolation)
        const moveResult = this.updateConveyorMovement(dt, baseDepotRect);

        // 2. Cykliczny tick maszyn (10 Hz)
        this.tickTimer += dt;
        let creditsEarned = moveResult.creditsEarned;
        let briquettesSold = moveResult.briquettesSold;
        let platesSold = moveResult.platesSold;
        let acidCellsSold = moveResult.acidCellsSold;
        let hasPackagerStomped = false;
        let hasSmelterFinished = false;

        while (this.tickTimer >= this.tickInterval) {
            this.tickTimer -= this.tickInterval;
            const tickResult = this.tickMachines();
            if (tickResult.hasPackagerStomped) hasPackagerStomped = true;
            if (tickResult.hasSmelterFinished) hasSmelterFinished = true;
        }

        // 3. Renderowanie wszystkich płynących przedmiotów w bieżącej klatce
        this.renderItems();

        return {
            creditsEarned,
            briquettesSold,
            platesSold,
            acidCellsSold,
            totalPowerProduced: this.lastTotalPowerProduced,
            totalPowerConsumed: this.lastTotalPowerConsumed,
            hasPower: this.lastHasPower,
            hasPackagerStomped,
            hasSmelterFinished,
            hasRefineryFinished: false,
            activeShieldDomes: this.lastActiveShieldDomes,
        };
    }

    /**
     * Factorio / Satisfactory Conveyor Motion Engine:
     * - Każdy przedmiot ma pozycję `progress` (0.0 -> 1.0) na danym kafelku taśmy.
     * - Przemieszcza się płynnie z prędkością taśmy (Mk1 = 2 kafelki/s, Mk2 = 4.5 kafelka/s).
     * - Przy przejściu do kolejnego kafelka sprawdza:
     *     a) Czy cel to Baza Główna -> SPRZEDANO (+$$$)
     *     b) Czy cel to Silo -> ZAŁADOWANO DO MAGAZYNU
     *     c) Czy cel to Piec -> WSAD HUTNICZY
     *     d) Czy cel to kolejna taśma -> ZASADA ZATORU (BACKPRESSURE): jeśli kafelek zajęty, zatrzymuje się na końcu taśmy.
     */
    private updateConveyorMovement(
        dt: number,
        baseDepotRect: { x: number; y: number; width: number; height: number }
    ): { creditsEarned: number; briquettesSold: number; platesSold: number; acidCellsSold: number } {
        let creditsEarned = 0;
        let briquettesSold = 0;
        let platesSold = 0;
        let acidCellsSold = 0;

        const baseGXStart = Math.floor(baseDepotRect.x / 32);
        const baseGYStart = Math.floor(baseDepotRect.y / 32);
        const baseGXEnd = baseGXStart + 3;
        const baseGYEnd = baseGYStart + 3;

        // Przetwarzaj od końca do początku, aby unikać problemów przy splice
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            const currentBelt = this.getBuildingAt(item.gridX, item.gridY);

            // Jeśli taśma została zniszczona przez gracza
            if (!currentBelt || !this.isConveyor(currentBelt)) {
                this.items.splice(i, 1);
                continue;
            }

            const speed = currentBelt.type === 'conveyor_mk2' ? 4.5 : 2.0; // kafelki / sekundę
            item.progress += speed * dt;

            // Przedmiot dotarł do końca obecnego kafelka taśmy
            if (item.progress >= 1.0) {
                let { nextGX, nextGY } = this.getNextGridPos(item.gridX, item.gridY, currentBelt.direction);

                // Obsługa Splittera 50/50 naprzemiennego
                if (currentBelt.type === 'splitter') {
                    const toggle = !this.splitterToggle.get(currentBelt.id);
                    this.splitterToggle.set(currentBelt.id, toggle);
                    if (toggle) {
                        if (currentBelt.direction === 'E') nextGY += 1;
                        else if (currentBelt.direction === 'W') nextGY -= 1;
                        else if (currentBelt.direction === 'S') nextGX -= 1;
                        else if (currentBelt.direction === 'N') nextGX += 1;
                    }
                } else if (currentBelt.type === 'smart_splitter') {
                    // Inteligentny Rozdzielacz z Filtrem:
                    // Brykiety -> Lewy port
                    // Płyty i Ogniwa -> Prawy port
                    // Pył / Inne -> Środek (overflow prosto)
                    if (item.type === 'briquette') {
                        if (currentBelt.direction === 'E') nextGY -= 1;
                        else if (currentBelt.direction === 'W') nextGY += 1;
                        else if (currentBelt.direction === 'S') nextGX += 1;
                        else if (currentBelt.direction === 'N') nextGX -= 1;
                    } else if (item.type === 'plate' || item.type === 'acid_cell') {
                        if (currentBelt.direction === 'E') nextGY += 1;
                        else if (currentBelt.direction === 'W') nextGY -= 1;
                        else if (currentBelt.direction === 'S') nextGX -= 1;
                        else if (currentBelt.direction === 'N') nextGX += 1;
                    }
                } else if (currentBelt.type === 'underground_belt') {
                    // Transport podziemny: przeskakuje pod przeszkodami na odległość do 6 kafelków
                    let stepX = 0; let stepY = 0;
                    if (currentBelt.direction === 'E') stepX = 1;
                    else if (currentBelt.direction === 'W') stepX = -1;
                    else if (currentBelt.direction === 'S') stepY = 1;
                    else if (currentBelt.direction === 'N') stepY = -1;

                    for (let dist = 1; dist <= 6; dist++) {
                        const checkGX = item.gridX + stepX * dist;
                        const checkGY = item.gridY + stepY * dist;
                        const targetB = this.getBuildingAt(checkGX, checkGY);
                        if (targetB && targetB.type === 'underground_belt') {
                            nextGX = checkGX;
                            nextGY = checkGY;
                            break;
                        }
                    }
                }

                // 1. CEL: Wjazd do Bazy Głównej (Depot) przez dedykowany dok cargo (Cargo Receiving Bay)
                const isCargoBay =
                    (nextGX === baseGXStart + 1 && nextGY === baseGYStart && currentBelt.direction === 'S') ||
                    (nextGX === baseGXStart + 1 && nextGY === baseGYStart + 2 && currentBelt.direction === 'N') ||
                    (nextGX === baseGXStart && nextGY === baseGYStart + 1 && currentBelt.direction === 'E') ||
                    (nextGX === baseGXStart + 2 && nextGY === baseGYStart + 1 && currentBelt.direction === 'W');

                if (isCargoBay) {
                    creditsEarned += item.value;
                    if (item.type === 'plate') platesSold++;
                    else if (item.type === 'acid_cell') acidCellsSold++;
                    else briquettesSold++;

                    this.items.splice(i, 1);
                    continue;
                } else if (nextGX >= baseGXStart && nextGX < baseGXEnd && nextGY >= baseGYStart && nextGY < baseGYEnd) {
                    // Trafiono w litą ścianę bazy zamiast w wyznaczony dok -> zator na taśmie!
                    item.progress = 1.0;
                    continue;
                }

                const targetBuilding = this.getBuildingAt(nextGX, nextGY);

                // Sprawdź czy maszyna posiada fizyczny port wlotowy (INLET PORT)
                if (targetBuilding) {
                    const inPort = targetBuilding.getInputPort();
                    const isPortAligned = inPort
                        ? (nextGX === inPort.gx && nextGY === inPort.gy && currentBelt.direction === inPort.dir)
                        : true;

                    if (!isPortAligned) {
                        // Taśma trafia w ścianę maszyny, a nie w jej port wejściowy -> Zator na taśmie!
                        item.progress = 1.0;
                        continue;
                    }

                    // 2. CEL: Wjazd do Magazynu Zasobnikowego (Silo)
                    if (targetBuilding.type === 'silo') {
                        const queue = this.siloQueues.get(targetBuilding.id) ?? [];
                        if (queue.length < 100) {
                            queue.push(item.type);
                            this.siloQueues.set(targetBuilding.id, queue);
                            targetBuilding.inventoryCount = queue.length;
                            this.items.splice(i, 1);
                            continue;
                        } else {
                            item.progress = 1.0;
                            continue;
                        }
                    }

                    // 3. CEL: Wjazd do Prasy Urobku (Packager - prasuje pakiety pyłu w brykiety)
                    if (targetBuilding.type === 'packager') {
                        if (item.type === 'dust_bag') {
                            const hasRaw = this.packagerHasRaw.get(targetBuilding.id) ?? false;
                            if (!hasRaw) {
                                this.packagerHasRaw.set(targetBuilding.id, true);
                                this.items.splice(i, 1);
                                continue;
                            } else {
                                item.progress = 1.0;
                                continue;
                            }
                        } else {
                            item.progress = 1.0;
                            continue;
                        }
                    }

                    // 4. CEL: Wjazd do Pieca Hutniczego (Smelter - przetapia brykiety w płyty)
                    if (targetBuilding.type === 'smelter') {
                        if (item.type === 'briquette') {
                            const hasRaw = this.smelterHasBriquette.get(targetBuilding.id) ?? false;
                            if (!hasRaw) {
                                this.smelterHasBriquette.set(targetBuilding.id, true);
                                this.items.splice(i, 1);
                                continue;
                            } else {
                                item.progress = 1.0;
                                continue;
                            }
                        } else {
                            item.progress = 1.0;
                            continue;
                        }
                    }

                    // 5. CEL: Mielarka Urobku (AWESOME SINK - likwiduje zatory, 100% zwrotu wartości + premia kuponowa)
                    if (targetBuilding.type === 'awesome_sink') {
                        let value = 1.20;
                        if (item.type === 'briquette') {
                            value = 4.50;
                            briquettesSold++;
                        } else if (item.type === 'plate') {
                            value = 16.00;
                            platesSold++;
                        } else if (item.type === 'acid_cell') {
                            value = 45.00;
                            acidCellsSold++;
                        }

                        creditsEarned += value * 1.15; // +15% korporacyjny bonus za recykling w SINK
                        this.items.splice(i, 1);
                        continue;
                    }
                }

                // 4. CEL: Kolejny segment taśmociągu
                if (targetBuilding && this.isConveyor(targetBuilding)) {
                    // Zasada zatoru (Backpressure): sprawdź, czy kafelek docelowy nie jest już zajęty
                    const isTargetBlocked = this.items.some(
                        it => it !== item && it.gridX === nextGX && it.gridY === nextGY && it.progress < 0.5
                    );

                    if (isTargetBlocked) {
                        // Kafelek zablokowany -> zatrzymaj się na krawędzi i czekaj
                        item.progress = 1.0;
                    } else {
                        // Przejdź na kolejną taśmę
                        item.gridX = nextGX;
                        item.gridY = nextGY;
                        item.progress = 0.0;
                    }
                    continue;
                }

                // 5. Ślepy zaułek (koniec linii taśmy, puste pole, ściana)
                // Przedmiot zatrzymuje się na końcu bez znikania
                item.progress = 1.0;
            }
        }

        return { creditsEarned, briquettesSold, platesSold, acidCellsSold };
    }

    /**
     * Cykliczna symulacja maszyn fabrycznych (10 Hz):
     * - Energetyka i zasilanie
     * - Wypychanie urobku z Silo na taśmy wyjściowe
     * - Prasowanie w Packagerze
     * - Wytop w Smelterze
     */
    private tickMachines(): { hasPackagerStomped: boolean; hasSmelterFinished: boolean } {
        let hasPackagerStomped = false;
        let hasSmelterFinished = false;

        let totalPowerProduced = 10;
        let totalPowerConsumed = 0;
        const activeShieldDomes: ShieldDome[] = [];

        // 1. Kalkulacja sieci energetycznej
        for (const building of this.gridSystem.buildings.values()) {
            if (building.type === 'solar') {
                const weatherFactor = this.isAcidRainActive ? 0.3 : 1.0;
                totalPowerProduced += Math.round(50 * weatherFactor);
            } else if (building.type === 'geothermal') {
                const bWorldX = (building.gridX + building.widthTiles * 0.5) * 32;
                const bWorldY = (building.gridY + building.heightTiles * 0.5) * 32;
                const crater = this.craterGetter ? this.craterGetter(bWorldX, bWorldY) : null;
                if (crater && crater.isDiscovered) {
                    totalPowerProduced += crater.yieldKW; // Skalowana moc: +50 kW w Strefie 1, +80 kW w Strefie 2, +150 kW w Strefie 3
                } else if (this.hotCraterChecker && this.hotCraterChecker(bWorldX, bWorldY)) {
                    totalPowerProduced += 80;
                }
            } else if (building.type === 'packager') {
                totalPowerConsumed += 15;
            } else if (building.type === 'smelter') {
                totalPowerConsumed += 12;
            } else if (building.type === 'shield_pylon') {
                totalPowerConsumed += 25;
            } else if (building.type === 'dock') {
                totalPowerConsumed += 5;
            } else if (building.type === 'vacuum_turret') {
                totalPowerConsumed += 20;
            }
        }

        const hasPower = totalPowerProduced >= totalPowerConsumed;
        this.lastTotalPowerProduced = totalPowerProduced;
        this.lastTotalPowerConsumed = totalPowerConsumed;
        this.lastHasPower = hasPower;

        // 2. Pola siłowe tarczy
        for (const building of this.gridSystem.buildings.values()) {
            if (building.type === 'shield_pylon') {
                const cx = (building.gridX + 1) * 32;
                const cy = (building.gridY + 1) * 32;
                activeShieldDomes.push({
                    x: cx,
                    y: cy,
                    radius: 280,
                    active: hasPower,
                });
            }
        }
        this.lastActiveShieldDomes = activeShieldDomes;

        // 3. Maszyny produkcyjne
        for (const building of this.gridSystem.buildings.values()) {
            building.hasPower = hasPower;

            // SILO (Magazyn Zasobnikowy) - Zrzuca zbuforowany urobek na wychodzące taśmy!
            if (building.type === 'silo') {
                const queue = this.siloQueues.get(building.id) ?? [];
                let dust = this.siloDust.get(building.id) ?? 0;
                building.isWorking = queue.length > 0 || dust >= 5;

                // Sprawdź czy jest wolna taśma wyjściowa przy dedykowanym porcie OUTLET
                const outbound = this.getFreeOutboundConveyor(building);
                if (outbound) {
                    if (queue.length > 0) {
                        const itemType = queue.shift()!;
                        const val = itemType === 'acid_cell' ? 120 : (itemType === 'plate' ? 60 : (itemType === 'briquette' ? 15 : 5));
                        this.items.push({
                            id: `item_${Date.now()}_${Math.random()}`,
                            type: itemType,
                            gridX: outbound.gx,
                            gridY: outbound.gy,
                            progress: 0.0,
                            value: val,
                        });
                        building.inventoryCount = queue.length;
                    } else if (dust >= 5) {
                        // Pobierz 5 kg pyłu i wyemituj pakiet pyłu 'dust_bag' ($1.20)
                        dust -= 5;
                        this.siloDust.set(building.id, Number(dust.toFixed(2)));
                        (building as SiloBuilding).storedDust = Number(dust.toFixed(2));
                        this.items.push({
                            id: `dust_${Date.now()}_${Math.random()}`,
                            type: 'dust_bag',
                            gridX: outbound.gx,
                            gridY: outbound.gy,
                            progress: 0.0,
                            value: 1.20,
                        });
                    }
                }
            }

            // PACKAGER (Prasa Urobku) - gdy ma prąd oraz pakiet pyłu, wytwarza Brykiet ($4.50)
            else if (building.type === 'packager') {
                const hasRaw = this.packagerHasRaw.get(building.id) ?? false;
                const currentTicks = this.packagerProgress.get(building.id) ?? 0;
                building.isWorking = hasRaw && hasPower;

                if (hasRaw && hasPower) {
                    if (currentTicks >= 30) {
                        const outbound = this.getFreeOutboundConveyor(building);
                        if (outbound) {
                            this.packagerHasRaw.set(building.id, false);
                            this.packagerProgress.set(building.id, 0);
                            this.items.push({
                                id: `briquette_${Date.now()}_${Math.random()}`,
                                type: 'briquette',
                                gridX: outbound.gx,
                                gridY: outbound.gy,
                                progress: 0.0,
                                value: 4.50,
                            });
                            hasPackagerStomped = true;
                        }
                    } else {
                        this.packagerProgress.set(building.id, currentTicks + 1);
                    }
                } else {
                    this.packagerProgress.set(building.id, 0);
                }
            }

            // SMELTER (Piec Hutniczy) - przetapia brykiet w płytę kompozytową ($16.00)
            else if (building.type === 'smelter') {
                const hasRaw = this.smelterHasBriquette.get(building.id) ?? false;
                const currentTicks = this.smelterProgress.get(building.id) ?? 0;
                building.isWorking = hasRaw && hasPower;

                if (hasRaw && hasPower) {
                    building.processProgress = Math.min(1.0, currentTicks / 25);
                    if (currentTicks >= 25) {
                        const outbound = this.getFreeOutboundConveyor(building);
                        if (outbound) {
                            this.smelterHasBriquette.set(building.id, false);
                            this.smelterProgress.set(building.id, 0);
                            building.processProgress = 0;
                            hasSmelterFinished = true;

                            this.items.push({
                                id: `plate_${Date.now()}_${Math.random()}`,
                                type: 'plate',
                                gridX: outbound.gx,
                                gridY: outbound.gy,
                                progress: 0.0,
                                value: 16.00,
                            });
                        }
                    } else {
                        this.smelterProgress.set(building.id, currentTicks + 1);
                    }
                } else {
                    building.processProgress = 0;
                }
            }

            // VACUUM TURRET (Wieżyczka Zasysająca) - gdy ma zasilanie, generuje worki urobku na wyjściu
            else if (building.type === 'vacuum_turret') {
                building.isWorking = hasPower;
                if (hasPower) {
                    const turret = building as any;
                    if (turret.updateRotation) {
                        turret.updateRotation((turret.turretAngle ?? 0) + 0.15);
                    }
                    const currentTicks = (this.packagerProgress.get(building.id) ?? 0) + 1;
                    if (currentTicks >= 20) {
                        this.packagerProgress.set(building.id, 0);
                        const outbound = this.getFreeOutboundConveyor(building);
                        if (outbound) {
                            this.items.push({
                                id: `vacturret_${Date.now()}_${Math.random()}`,
                                type: 'dust_bag',
                                gridX: outbound.gx,
                                gridY: outbound.gy,
                                progress: 0.0,
                                value: 1.20,
                            });
                        }
                    } else {
                        this.packagerProgress.set(building.id, currentTicks);
                    }
                }
            }
        }

        return { hasPackagerStomped, hasSmelterFinished };
    }

    /**
     * Wyszukuje wolny taśmociąg wokół maszyny, który jest SKIEROWANY OD MASZYNY (Outbound).
     * Jeśli maszyna posiada fizyczny port wyjściowy (getOutputPort), weryfikuje dokładnie ten kafelek i kierunek.
     */
    private getFreeOutboundConveyor(machine: BuildingEntity): { building: BuildingEntity; gx: number; gy: number } | null {
        const outPort = machine.getOutputPort();
        if (outPort) {
            const b = this.getBuildingAt(outPort.outboundGX, outPort.outboundGY);
            if (b && this.isConveyor(b) && b.direction === outPort.dir) {
                const isBlocked = this.items.some(
                    it => it.gridX === outPort.outboundGX && it.gridY === outPort.outboundGY && it.progress < 0.4
                );
                if (!isBlocked) {
                    return { building: b, gx: outPort.outboundGX, gy: outPort.outboundGY };
                }
            }
            return null;
        }

        const bx = machine.gridX;
        const by = machine.gridY;
        const w = machine.widthTiles;
        const h = machine.heightTiles;

        const candidates: Array<{ gx: number; gy: number; requiredDir: Direction }> = [];

        // Krawędź Północna (y = by - 1) -> taśma musi iść w stronę 'N' (od maszyny)
        for (let x = bx; x < bx + w; x++) candidates.push({ gx: x, gy: by - 1, requiredDir: 'N' });
        // Krawędź Południowa (y = by + h) -> taśma musi iść w stronę 'S' (od maszyny)
        for (let x = bx; x < bx + w; x++) candidates.push({ gx: x, gy: by + h, requiredDir: 'S' });
        // Krawędź Zachodnia (x = bx - 1) -> taśma musi iść w stronę 'W' (od maszyny)
        for (let y = by; y < by + h; y++) candidates.push({ gx: bx - 1, gy: y, requiredDir: 'W' });
        // Krawędź Wschodnia (x = bx + w) -> taśma musi iść w stronę 'E' (od maszyny)
        for (let y = by; y < by + h; y++) candidates.push({ gx: bx + w, gy: y, requiredDir: 'E' });

        for (const c of candidates) {
            const b = this.getBuildingAt(c.gx, c.gy);
            if (b && this.isConveyor(b) && b.direction === c.requiredDir) {
                // Sprawdź czy taśma ma wolne miejsce na wlocie (progress < 0.4)
                const isBlocked = this.items.some(it => it.gridX === c.gx && it.gridY === c.gy && it.progress < 0.4);
                if (!isBlocked) {
                    return { building: b, gx: c.gx, gy: c.gy };
                }
            }
        }

        return null;
    }

    /**
     * Rysuje wszystkie płynące przedmioty na taśmach w 60 FPS:
     * - Interpoluje współrzędne (worldX, worldY) wzdłuż wektora kierunku taśmy.
     * - Rysuje pakiety pyłu, brykiety, płyty oraz ogniwa kwasowe.
     */
    public renderItems(): void {
        this.itemsGfx.clear();

        for (const item of this.items) {
            const belt = this.getBuildingAt(item.gridX, item.gridY);
            if (!belt) continue;

            const tileSize = 32;
            const x0 = item.gridX * tileSize;
            const y0 = item.gridY * tileSize;
            const prog = Math.max(0.0, Math.min(1.0, item.progress));

            let wx = x0 + 16;
            let wy = y0 + 16;

            if (belt.direction === 'E') {
                wx = x0 + prog * tileSize;
                wy = y0 + 16;
            } else if (belt.direction === 'W') {
                wx = (x0 + tileSize) - prog * tileSize;
                wy = y0 + 16;
            } else if (belt.direction === 'S') {
                wx = x0 + 16;
                wy = y0 + prog * tileSize;
            } else if (belt.direction === 'N') {
                wx = x0 + 16;
                wy = (y0 + tileSize) - prog * tileSize;
            }

            // Rysowanie konkretnego typu przedmiotu
            if (item.type === 'plate') {
                // Płyta Kompozytowa ($75) - lśniąca płytka tytanowa z obwódką cyan
                this.itemsGfx.roundRect(wx - 7, wy - 5, 14, 10, 2)
                    .fill({ color: 0x0284c7 })
                    .stroke({ width: 1.5, color: 0x38bdf8 });
                this.itemsGfx.rect(wx - 4, wy - 2, 8, 4)
                    .fill({ color: 0xbae6fd });
            } else if (item.type === 'acid_cell') {
                // Ogniwo Kwasowe ($180) - świecący zielony izotop
                this.itemsGfx.roundRect(wx - 6, wy - 6, 12, 12, 3)
                    .fill({ color: 0x14532d })
                    .stroke({ width: 1.5, color: 0x4ade80 });
                this.itemsGfx.circle(wx, wy, 2.5)
                    .fill({ color: 0x86efac });
            } else if (item.type === 'dust_bag') {
                // Pakiet Pyłu ($7.50) - szary zasobnik urobku ze złotą opaską
                this.itemsGfx.roundRect(wx - 5, wy - 5, 10, 10, 2)
                    .fill({ color: 0x334155 })
                    .stroke({ width: 1, color: 0xfacc15 });
                this.itemsGfx.circle(wx, wy, 2).fill({ color: 0x94a3b8 });
            } else {
                // Brykiet Bazaltowy ($22) - ciemny sprasowany blok ze złotą magmową żyłą
                this.itemsGfx.rect(wx - 6, wy - 6, 12, 12)
                    .fill({ color: 0x1e293b })
                    .stroke({ width: 1.5, color: 0xf59e0b });
                this.itemsGfx.rect(wx - 2, wy - 2, 4, 4)
                    .fill({ color: 0xfacc15 });
            }
        }
    }

    private isConveyor(b: BuildingEntity): boolean {
        return b.type === 'conveyor' || b.type === 'conveyor_mk2' || b.type === 'splitter' || b.type === 'smart_splitter' || b.type === 'merger' || b.type === 'underground_belt';
    }

    private getNextGridPos(gx: number, gy: number, dir: Direction): { nextGX: number; nextGY: number } {
        let nextGX = gx;
        let nextGY = gy;
        if (dir === 'N') nextGY -= 1;
        else if (dir === 'E') nextGX += 1;
        else if (dir === 'S') nextGY += 1;
        else if (dir === 'W') nextGX -= 1;
        return { nextGX, nextGY };
    }

    public getBuildingAt(gx: number, gy: number): BuildingEntity | null {
        if (gx < 0 || gy < 0 || gx >= this.gridSystem.cols || gy >= this.gridSystem.rows) return null;
        const id = this.gridSystem.getCell(gx, gy);
        if (!id || id === 'BASE_DEPOT') return null;
        return this.gridSystem.buildings.get(id) ?? null;
    }

    public destroy(): void {
        this.itemsGfx.destroy();
        this.itemsContainer.destroy({ children: true });
    }
}
