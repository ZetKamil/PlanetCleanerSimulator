import { Application, Container, Graphics, Text, TextStyle, Assets, Sprite } from 'pixi.js';
import { WorldViewport } from './WorldViewport';
import { PlayerEntity, type PlayerInput, getToolConeConfig } from './entities/PlayerEntity';
import { DirtSystem, type SweepResult } from './DirtSystem';
import { BaseDepot } from './entities/BaseDepot';
import { GridSystem } from './GridSystem';
import { SimulationLoop, type ShieldDome } from './SimulationLoop';
import { SweepBotEntity, type BotDropoffContext } from './entities/SweepBotEntity';
import { BotCleaningTool, type BotToolType } from './entities/BotCleaningTool';
import { MuleBotEntity } from './entities/MuleBotEntity';
import { OrbitalDropPodEntity } from './entities/OrbitalDropPodEntity';
import { BUILDING_CONFIGS, type BuildingType, type Direction } from './entities/BuildingEntity';
import { SiloBuilding } from './entities/buildings/ProductionBuildings';
import { NetworkSync } from './NetworkSync';
import { SectorManager } from './sectors/SectorManager';
import { ThermalCraterSystem } from './hazards/ThermalCraterSystem';
import { VeneraArchaeologySystem } from './archaeology/VeneraArchaeologySystem';
import { useGameStore, type InspectorTarget, type BotDropoffPolicy } from '../stores/useGameStore';
import { useAchievementStore } from '../stores/useAchievementStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { WorldConfig, getWorldConfig, setWorldConfig } from './world/WorldConfig';
import { WorldTerrainGenerator, GeneratedWorldTerrain } from './world/WorldTerrainGenerator';

import { SoundSystem } from './SoundSystem';
import { InputManager } from './input/InputManager';
import { AtmosphereManager } from './weather/AtmosphereManager';
import { ParticleFXManager } from './fx/ParticleFXManager';
import { getActivePlanet } from '../config/planets';

export interface ThrottledTickData {
    playerX: number;
    playerY: number;
    fps: number;
    gatheredDustBatch: number;
    totalCleanedKg: number;
    percentCleaned: number;
    isSweeping: boolean;
    isBackpackFull: boolean;
    simCreditsBatch: number;
    currentSectorId?: string;
    currentSectorClean?: number;
    currentSectorClaimed?: boolean;
    claimedSectorsCount?: number;
    sectorBonusPercent?: number;

    // Etap 10: Okienko Celu / Inspektor Celu
    inspectorTarget?: InspectorTarget;

    // Etap 11 & 12: Dron-Muł & Kopuły Ochronne
    muleStatus?: 'IDLE' | 'FLYING_TO_PLAYER' | 'EXTRACTING' | 'RETURNING' | 'UNLOADING';
    shieldDomesCount?: number;

    // Deszcz Kwasowy & Korozja Pancerza
    acidCorrosion?: number;
    isPlayerShielded?: boolean;
    isAcidBreach?: boolean;

    // Etap 9: Warunki Termiczne & Radar Minimapy
    playerTemperature?: number;
    playerOverheatPercent?: number;
    isInCrater?: boolean;
    isMeltdown?: boolean;
    playerRotation?: number;
    discoveredRelicsCount?: number;
    discoveredRelic?: { id: string; name: string; discoveredCount: number; totalCount: number };
    analyzedRelicsCount?: number;
    analyzedRelic?: { id: string; name: string; rewardCredits: number };
    relicsList?: Array<{ id: string; name: string; year: string; rewardCredits: number; isUncovered: boolean; isAnalyzed: boolean }>;
    conveyorCount?: number;
    powerProduced?: number;
    hasGeothermal?: boolean;
    minimapSectors?: Array<{ id: string; cx: number; cy: number; isClaimed: boolean; cleanPct: number }>;
    minimapCraters?: Array<{ x: number; y: number; radius: number }>;
    minimapGeysers?: Array<{ x: number; y: number; radius: number }>;
    minimapRelics?: Array<{ x: number; y: number; isUncovered: boolean; isAnalyzed: boolean }>;
    minimapBots?: Array<{ x: number; y: number }>;

    // Turbo-Glide [Shift] & Planetary Terraformation Index (PTI)
    boostEnergy?: number;
    isBoosting?: boolean;
    ptiPercent?: number;
    ptiStage?: string;

    // Etap 08: Silosy i Logistyka Sweep-Botów
    silosList?: Array<{ id: string; gridX: number; gridY: number; acceptsBots: boolean; storedDust: number; maxDustCapacity: number }>;
}

export interface GameEngineOptions {
    container: HTMLElement;
    worldWidth?: number;
    worldHeight?: number;
    brushRadius?: number;
    roomCode?: string;
    worldConfig?: Partial<WorldConfig>;
    getBackpackStatus?: () => { current: number; max: number; isFull: boolean };
    getShouldShowBaseGuide?: () => boolean;
    getBuildState?: () => {
        selectedBuilding: BuildingType | null;
        isBuildMode?: boolean;
        direction: Direction;
        canAfford: boolean;
        credits: number;
    };
    onBuildPlaced?: (building: BuildingType, cost: number) => void;
    onDepotUnload?: (bonusMultiplier: number) => { soldDust: number; earnedCredits: number };
    onEmptyBackpack?: () => number;
    onDeductPlayerDust?: (amount: number) => number;
    onThrottledTick?: (data: ThrottledTickData) => void;
    onNetworkStatus?: (status: { connected: boolean; memberCount: number; roomCode: string }) => void;
    onPipettePick?: (type: BuildingType | null, dir: Direction) => void;
    onMilestoneClean?: (percent: number) => void;
    onAltModeToggled?: (active: boolean) => void;
    onDevSweepToggled?: (active: boolean) => void;
    onPowerUpdate?: (produced: number, consumed: number) => void;
    onFactoryItemsSold?: (briquettes: number, plates: number, acidCells: number) => void;
    onAcidRainEvent?: (active: boolean, timer: number) => void;
    isPaused?: () => boolean;
    hasPerk?: (perkId: string) => boolean;
    getBotStats?: () => { speedLevel: number; brushLevel: number; capacityLevel: number };
    getBotPolicy?: () => BotDropoffPolicy;
}



interface FloatingTextPopup {
    container: Container;
    text: Text;
    subText?: Text;
    startX: number;
    startY: number;
    progress: number;
    duration: number;
}

export class GameEngine {
    public app: Application;
    public viewport!: WorldViewport;
    public player!: PlayerEntity;
    public dirtSystem!: DirtSystem;
    public baseDepot!: BaseDepot;
    public gridSystem!: GridSystem;
    public simulationLoop!: SimulationLoop;
    public bots: SweepBotEntity[] = [];
    public muleBot!: MuleBotEntity;
    public networkSync?: NetworkSync;
    public soundSystem: SoundSystem = new SoundSystem();

    public worldWidth: number = 6144;
    public worldHeight: number = 6144;
    public readonly tileSize: number = 32;
    public brushRadius: number = 15;
    public currentToolId: string = 'brush-starter';
    public roomCode?: string;
    public worldConfig: WorldConfig;
    public terrainGenerator!: WorldTerrainGenerator;
    public generatedTerrain?: GeneratedWorldTerrain;

    // Etap 11: Atmospheric Defense & Forcefields
    private shieldDomesGfx: Graphics;
    private shieldAnimTimer: number = 0;

    // Napowietrzne linie przesyłowe energii (Factorio / Satisfactory Power Cables)
    private powerCablesGfx: Graphics;
    public activeDropPod: OrbitalDropPodEntity | null = null;

    // Building placement grid (32px) - hidden in normal view, shown ONLY during building placement or Alt-Mode
    private buildingGridGfx: Graphics;

    // Etap 5: Alt-Mode
    public isAltMode: boolean = false;
    private screenShakeTimer: number = 0;

    // Dedykowane podsystemy pomocnicze (Single Responsibility Principle)
    public inputManager!: InputManager;
    public atmosphere!: AtmosphereManager;
    public fxManager!: ParticleFXManager;

    public sectorManager!: SectorManager;
    public thermalCraters!: ThermalCraterSystem;
    public archaeology!: VeneraArchaeologySystem;

    private pendingAnalyzedRelic?: { id: string; name: string; rewardCredits: number };
    private pendingDiscoveredRelic?: { id: string; name: string; discoveredCount: number; totalCount: number };
    private hasMeltdownThisTick: boolean = false;
    private hasAcidBreachThisTick: boolean = false;

    private container: HTMLElement;
    private isRunning: boolean = false;
    private onThrottledTick?: (data: ThrottledTickData) => void;
    private onDepotUnload?: (bonusMultiplier: number) => { soldDust: number; earnedCredits: number };
    private onEmptyBackpack?: () => number;
    private onDeductPlayerDust?: (amount: number) => number;
    private onNetworkStatus?: (status: { connected: boolean; memberCount: number; roomCode: string }) => void;
    private onPipettePick?: (type: BuildingType | null, dir: Direction) => void;
    private onMilestoneClean?: (percent: number) => void;
    private onAltModeToggled?: (active: boolean) => void;
    private onPowerUpdate?: (produced: number, consumed: number) => void;
    private onFactoryItemsSold?: (briquettes: number, plates: number, acidCells: number) => void;
    private onAcidRainEvent?: (active: boolean, timer: number) => void;
    private getBackpackStatus?: () => { current: number; max: number; isFull: boolean };
    private getShouldShowBaseGuide?: () => boolean;
    private getBuildState?: () => {
        selectedBuilding: BuildingType | null;
        isBuildMode?: boolean;
        direction: Direction;
        canAfford: boolean;
        credits: number;
    };
    private onBuildPlaced?: (building: BuildingType, cost: number) => void;

    private pendingGatheredDust: number = 0;
    private pendingSimCredits: number = 0;
    private isBackpackFull: boolean = false;
    private getIsPaused?: () => boolean;
    private hasPerk?: (perkId: string) => boolean;
    private getBotStats?: () => { speedLevel: number; brushLevel: number; capacityLevel: number };
    private getBotPolicy?: () => BotDropoffPolicy;

    // Layers inside viewport.container
    public groundLayer: Container;
    public dirtLayer: Container;
    public structuresLayer: Container;
    public entitiesLayer: Container;
    public effectsLayer: Container;

    // Visual indicators & effects
    private cursorBrushIndicator: Graphics;
    private playerBrushIndicator: Graphics;

    // Rhombic Sector tracking & celebration effects
    private cleanedRhombusSectors: Set<string> = new Set();
    private rhombusCompletionAnims: Array<{ cx: number; cy: number; w: number; h: number; progress: number; duration: number }> = [];
    private rhombusEffectGfx: Graphics;
    private floatingPopups: FloatingTextPopup[] = [];

    // Previous sweep positions for gap-free segment interpolation
    private lastPlayerSweepPos: { x: number; y: number } | null = null;
    private lastCursorSweepPos: { x: number; y: number } | null = null;
    private isCurrentlySweeping: boolean = false;
    public isDevSweepMode: boolean = false;
    private onDevSweepToggled?: (active: boolean) => void;

    // Base Depot boundary cache
    private baseDepotRect!: { x: number; y: number; width: number; height: number };

    // Throttling for UI updates (Rule 2: max 10 Hz)
    private throttledTimer: number = 0;
    private readonly throttleInterval: number = 0.1;

    // Window resize & cruise control listeners
    private boundOnResize: () => void;
    private boundOnToggleCruise: (e: Event) => void;

    constructor(options: GameEngineOptions) {
        this.container = options.container;
        this.worldConfig = options.worldConfig ? setWorldConfig(options.worldConfig) : getWorldConfig();
        if (options.worldWidth) this.worldWidth = options.worldWidth;
        else this.worldWidth = this.worldConfig.worldWidth;
        if (options.worldHeight) this.worldHeight = options.worldHeight;
        else this.worldHeight = this.worldConfig.worldHeight;
        if (options.brushRadius) this.brushRadius = options.brushRadius;
        this.roomCode = options.roomCode;
        this.onNetworkStatus = options.onNetworkStatus;
        this.onPipettePick = options.onPipettePick;
        this.onMilestoneClean = options.onMilestoneClean;
        this.onAltModeToggled = options.onAltModeToggled;
        this.onDevSweepToggled = options.onDevSweepToggled;
        this.onPowerUpdate = options.onPowerUpdate;
        this.onFactoryItemsSold = options.onFactoryItemsSold;
        this.onAcidRainEvent = options.onAcidRainEvent;
        this.getBackpackStatus = options.getBackpackStatus;
        this.getShouldShowBaseGuide = options.getShouldShowBaseGuide;
        this.getBuildState = options.getBuildState;
        this.onBuildPlaced = options.onBuildPlaced;
        this.onDepotUnload = options.onDepotUnload;
        this.onEmptyBackpack = options.onEmptyBackpack;
        this.onDeductPlayerDust = options.onDeductPlayerDust;
        this.onThrottledTick = options.onThrottledTick;
        this.getIsPaused = options.isPaused;
        this.hasPerk = options.hasPerk;
        this.getBotStats = options.getBotStats;
        this.getBotPolicy = options.getBotPolicy;

        this.app = new Application();

        this.groundLayer = new Container();
        this.dirtLayer = new Container();
        this.structuresLayer = new Container();
        this.entitiesLayer = new Container();
        this.effectsLayer = new Container();

        this.cursorBrushIndicator = new Graphics();
        this.playerBrushIndicator = new Graphics();
        this.rhombusEffectGfx = new Graphics();
        this.shieldDomesGfx = new Graphics();
        this.powerCablesGfx = new Graphics();
        this.buildingGridGfx = new Graphics();
        this.buildingGridGfx.visible = false; // Hidden in normal view!

        this.boundOnResize = this.handleResize.bind(this);
        this.boundOnToggleCruise = (e: Event) => {
            const custom = e as CustomEvent<{ active?: boolean }>;
            this.toggleCruiseControl(custom.detail?.active);
        };
    }

    public async init(): Promise<void> {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        await this.app.init({
            width,
            height,
            backgroundColor: 0x1E222A,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true,
        });

        this.container.appendChild(this.app.canvas);

        // Setup Viewport
        this.viewport = new WorldViewport({
            screenWidth: width,
            screenHeight: height,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            initialZoom: 1.0,
            minZoom: 0.5,
            maxZoom: 2.0,
        });

        this.app.stage.addChild(this.viewport.container);

        // Layers order
        this.viewport.container.addChild(this.groundLayer);
        this.viewport.container.addChild(this.dirtLayer);
        this.viewport.container.addChild(this.structuresLayer);
        this.viewport.container.addChild(this.entitiesLayer);
        this.viewport.container.addChild(this.effectsLayer);

        // Initialize ThermalCraterSystem (Strefy Termiczne i Kratery)
        this.thermalCraters = new ThermalCraterSystem(this.soundSystem);

        // Initialize VeneraArchaeologySystem (Relikty i Wraki Sond Venera)
        this.archaeology = new VeneraArchaeologySystem(this.soundSystem);
        this.structuresLayer.addChild(this.archaeology.container);

        // Render Ground & Grid (Generuje teren, kratery oraz losuje znajdźki)
        await this.renderGroundAndGrid();
        this.groundLayer.addChild(this.thermalCraters.container);

        // Initialize SectorManager (Sektory 512px jako samodzielne obiekty z bonusem 10%)
        this.sectorManager = new SectorManager({
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            sectorSize: 512,
        });
        this.structuresLayer.addChild(this.sectorManager.container);

        // Base Depot calculation (3x3 tiles = 96x96 px, snapped to 32px grid)
        const depotSize = this.tileSize * 3;
        const depotX = Math.floor(((this.worldWidth - depotSize) / 2) / this.tileSize) * this.tileSize;
        const depotY = Math.floor(((this.worldHeight - depotSize) / 2) / this.tileSize) * this.tileSize;
        this.baseDepotRect = { x: depotX, y: depotY, width: depotSize, height: depotSize };

        // Mount Base Depot
        this.baseDepot = new BaseDepot({ x: depotX, y: depotY, size: depotSize });
        this.structuresLayer.addChild(this.baseDepot.container);

        // Initialize GridSystem (Krok 3.1)
        this.gridSystem = new GridSystem({
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            tileSize: this.tileSize,
            baseDepotRect: this.baseDepotRect,
        });
        this.structuresLayer.addChild(this.gridSystem.container);
        this.effectsLayer.addChild(this.gridSystem.ghostContainer);

        // Initialize SimulationLoop (Krok 3.3)
        this.simulationLoop = new SimulationLoop(this.gridSystem);
        this.structuresLayer.addChild(this.simulationLoop.itemsContainer);

        // Geothermal Power placement & power validation checkers (aktywny krater z wrzącą lawą)
        this.gridSystem.hotCraterChecker = (wx, wy) => this.thermalCraters.hasActiveHotCrater(wx, wy);
        this.simulationLoop.hotCraterChecker = (wx, wy) => this.thermalCraters.hasActiveHotCrater(wx, wy);
        this.simulationLoop.craterGetter = (wx, wy) => this.thermalCraters.getCraterAt(wx, wy);

        // Initialize DirtSystem (Step 1.3)
        this.dirtSystem = new DirtSystem({
            app: this.app,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            cellSize: 2,
            baseDepotRect: this.baseDepotRect,
            onDustCleaned: (worldX, worldY) => {
                this.sectorManager?.notifyDustCleanedAt(worldX, worldY);
            },
        });
        this.dirtSystem.init(this.dirtLayer);

        // Spawn Player directly in front of / inside Base Depot
        const spawnX = depotX + depotSize / 2;
        const spawnY = depotY + depotSize / 2;
        this.player = new PlayerEntity(spawnX, spawnY, this.worldWidth, this.worldHeight);
        this.entitiesLayer.addChild(this.player.container);
        this.sectorManager.updatePlayerSectorTelemetry({ x: spawnX, y: spawnY }, this.dirtSystem);

        // Flota robotów Sweep-Bot odblokowuje się od Tieru 2 (Faza Przemysłowa)
        // Gracz zaczyna solo, jak w Factorio / Moon Sweeper

        // Spawn Mule Transport Drone (Etap 12)
        this.muleBot = new MuleBotEntity(depotX + 48, depotY + 48);
        this.entitiesLayer.addChild(this.muleBot.container);

        // Setup Brush Indicators & Special Effects
        this.structuresLayer.addChild(this.shieldDomesGfx);
        this.structuresLayer.addChild(this.powerCablesGfx);
        this.effectsLayer.addChild(this.playerBrushIndicator);
        this.effectsLayer.addChild(this.cursorBrushIndicator);
        this.effectsLayer.addChild(this.rhombusEffectGfx);

        // Initialize dedicated helper subsystems (OOP God-Object decoupling)
        this.fxManager = new ParticleFXManager(this.effectsLayer);
        const planetConfig = getActivePlanet();
        this.atmosphere = new AtmosphereManager({
            effectsLayer: this.effectsLayer,
            soundSystem: this.soundSystem,
            onAcidRainEvent: this.onAcidRainEvent,
            cycleInterval: planetConfig.weatherHazard.intervalSeconds,
            stormDuration: planetConfig.weatherHazard.durationSeconds,
        });
        this.inputManager = new InputManager({
            container: this.container,
            viewport: this.viewport,
            onPipette: () => this.handlePipette(),
            onToggleCruiseControl: () => this.toggleCruiseControl(),
            onToggleAltMode: () => this.toggleAltMode(),
            onToggleDevSweep: () => this.toggleDevSweepMode(),
            onCallMule: () => this.callMuleBot(),
            onCallOrbitalPod: () => this.callOrbitalDropPod(),
            onToggleDebug: () => window.dispatchEvent(new CustomEvent('venus-toggle-debug')),
            onLeftMouseDown: (pos) => this.handleLeftMouseDown(pos),
            onRightClick: (pos) => this.handleContextMenu(pos),
            onRightMouseDrag: (pos) => this.handleRightMouseDrag(pos),
            onMouseUp: (pos) => this.handleMouseUp(pos),
            isModalOpen: () => this.getIsPaused ? this.getIsPaused() : false,
        });

        // Snap camera immediately
        this.viewport.follow(spawnX, spawnY, true);

        // Initialize Multiplayer NetworkSync (Krok 4.1 - 4.4)
        if (this.roomCode) {
            this.networkSync = new NetworkSync({
                roomCode: this.roomCode,
                dirtSystem: this.dirtSystem,
                gridSystem: this.gridSystem,
                container: this.entitiesLayer,
                onMemberCountChange: (count) => {
                    this.onNetworkStatus?.({
                        connected: true,
                        memberCount: count,
                        roomCode: this.roomCode!,
                    });
                },
                onConnectionChange: (connected) => {
                    this.onNetworkStatus?.({
                        connected,
                        memberCount: this.networkSync ? this.networkSync.remotePlayers.size + 1 : 1,
                        roomCode: this.roomCode!,
                    });
                },
            });
            await this.networkSync.connect();
        }

        // Register window resize & cruise control listeners (keyboard/mouse handled by inputManager)
        window.addEventListener('resize', this.boundOnResize);
        window.addEventListener('venus-toggle-cruise', this.boundOnToggleCruise);

        // Start Ticker
        this.isRunning = true;
        this.app.ticker.add(this.update, this);
    }

    public spawnSweepBot(dockPos?: { x: number; y: number }, botId?: string): SweepBotEntity {
        const id = botId ?? `sweep_bot_${this.bots.length + 1}_${Date.now()}`;
        const spawnX = dockPos ? dockPos.x : (this.worldWidth / 2 - 40 + (Math.random() - 0.5) * 80);
        const spawnY = dockPos ? dockPos.y : (this.worldHeight / 2 - 40 + (Math.random() - 0.5) * 80);

        const stats = this.getBotStats?.() ?? { speedLevel: 1, brushLevel: 1, capacityLevel: 1 };
        const speed = stats.speedLevel === 1 ? 90 : (stats.speedLevel === 2 ? 135 : 180);
        const cap = stats.capacityLevel === 1 ? 15 : (stats.capacityLevel === 2 ? 35 : 80);
        const toolType: BotToolType = stats.brushLevel === 1 ? 'brush' : (stats.brushLevel === 2 ? 'broom' : 'vacuum');

        const bot = new SweepBotEntity({
            id,
            x: spawnX,
            y: spawnY,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            dockPosition: dockPos ?? { x: this.worldWidth / 2, y: this.worldHeight / 2 },
            toolType,
            speed,
            capacity: cap,
        });
        this.bots.push(bot);
        this.entitiesLayer.addChild(bot.container);
        this.soundSystem.playCleanDing(2);
        return bot;
    }

    public syncBotStats(): void {
        const stats = this.getBotStats?.() ?? { speedLevel: 1, brushLevel: 1, capacityLevel: 1 };
        const speed = stats.speedLevel === 1 ? 90 : (stats.speedLevel === 2 ? 135 : 180);
        const cap = stats.capacityLevel === 1 ? 15 : (stats.capacityLevel === 2 ? 35 : 80);
        const toolType: BotToolType = stats.brushLevel === 1 ? 'brush' : (stats.brushLevel === 2 ? 'broom' : 'vacuum');

        for (const bot of this.bots) {
            bot.setSpeed(speed);
            bot.setCapacity(cap);
            if (bot.tool.type !== toolType) {
                bot.equipTool(new BotCleaningTool({ type: toolType }));
            }
        }
    }

    public setSiloAcceptsBots(siloId: string, acceptsBots: boolean): void {
        for (const b of this.gridSystem.buildings.values()) {
            if (b.id === siloId && b.type === 'silo') {
                (b as SiloBuilding).acceptsBots = acceptsBots;
                break;
            }
        }
    }

    public getActiveSilosList(): Array<{ id: string; gridX: number; gridY: number; x: number; y: number; acceptsBots: boolean; storedDust: number; maxDustCapacity: number }> {
        const list = [];
        for (const b of this.gridSystem.buildings.values()) {
            if (b.type === 'silo') {
                const s = b as SiloBuilding;
                list.push({
                    id: s.id,
                    gridX: s.gridX,
                    gridY: s.gridY,
                    x: (s.gridX + 1) * this.tileSize,
                    y: (s.gridY + 1) * this.tileSize,
                    acceptsBots: s.acceptsBots ?? true,
                    storedDust: this.simulationLoop.getSiloDust(s.id),
                    maxDustCapacity: s.maxDustCapacity,
                });
            }
        }
        return list;
    }

    private async renderGroundAndGrid(): Promise<void> {
        // 1. Procedural 4-Layer Planetary Surface Generator
        this.terrainGenerator = new WorldTerrainGenerator(this.worldConfig);
        this.generatedTerrain = this.terrainGenerator.generate(this.groundLayer);
        this.thermalCraters.setCraters(this.generatedTerrain.craters);
        this.archaeology.setRelics(this.generatedTerrain.relics);

        const W = this.worldWidth;
        const H = this.worldHeight;

        // 1. Building Placement Precision Grid (32px / 128px) - Czyste podłoże Wenus
        this.buildingGridGfx.clear();
        this.buildingGridGfx.label = 'building-grid-overlay';
        this.buildingGridGfx.visible = false; // Domyślnie ukryta, włączana w trybie Alt lub przy stawianiu budynków

        const gridStep = this.tileSize; // 32px
        const majorStep = this.tileSize * 4; // 128px

        for (let x = 0; x <= W; x += gridStep) {
            const isMajor = (x % majorStep === 0);
            this.buildingGridGfx.moveTo(x, 0).lineTo(x, H).stroke({
                width: isMajor ? 1.5 : 1,
                color: isMajor ? 0x374050 : 0x2A303C,
                alpha: isMajor ? 0.65 : 0.45,
            });
        }
        for (let y = 0; y <= H; y += gridStep) {
            const isMajor = (y % majorStep === 0);
            this.buildingGridGfx.moveTo(0, y).lineTo(W, y).stroke({
                width: isMajor ? 1.5 : 1,
                color: isMajor ? 0x374050 : 0x2A303C,
                alpha: isMajor ? 0.65 : 0.45,
            });
        }
        this.groundLayer.addChild(this.buildingGridGfx);

        // 2. Boundary Hazard Perimeter (Map Borders & Warning Corners)
        const perimeterGfx = new Graphics();
        perimeterGfx.label = 'ground-perimeter-overlay';

        perimeterGfx.rect(0, 0, this.worldWidth, this.worldHeight)
            .stroke({ width: 6, color: 0xea580c, alpha: 0.85 });

        const cornerSize = 48;
        const corners = [
            { x: 0, y: 0, dx: 1, dy: 1 },
            { x: this.worldWidth, y: 0, dx: -1, dy: 1 },
            { x: 0, y: this.worldHeight, dx: 1, dy: -1 },
            { x: this.worldWidth, y: this.worldHeight, dx: -1, dy: -1 },
        ];

        for (const c of corners) {
            perimeterGfx.moveTo(c.x, c.y).lineTo(c.x + c.dx * cornerSize, c.y).stroke({ width: 8, color: 0xfacc15, alpha: 0.9 });
            perimeterGfx.moveTo(c.x, c.y).lineTo(c.x, c.y + c.dy * cornerSize).stroke({ width: 8, color: 0xfacc15, alpha: 0.9 });
        }

        this.groundLayer.addChild(perimeterGfx);
    }

    /**
     * Reconfigures world generation parameters dynamically (seed, dimensions, layers, craters toggle).
     */
    public reconfigureWorld(newConfig: Partial<WorldConfig>): void {
        this.worldConfig = setWorldConfig(newConfig);

        // Remove previous procedural terrain container
        const oldTerrain = this.groundLayer.children.find(c => c.label === 'procedural-terrain-container');
        if (oldTerrain) {
            this.groundLayer.removeChild(oldTerrain);
            oldTerrain.destroy({ children: true });
        }

        // Re-run terrain generator
        this.terrainGenerator = new WorldTerrainGenerator(this.worldConfig);
        this.generatedTerrain = this.terrainGenerator.generate(this.groundLayer);
        this.thermalCraters.setCraters(this.generatedTerrain.craters);
        this.archaeology.setRelics(this.generatedTerrain.relics);
    }

    private update(): void {
        if (!this.isRunning) return;
        if (this.getIsPaused && this.getIsPaused()) {
            this.soundSystem.setVacuumSound(false);
            this.soundSystem.setBoostSound(false);
            return;
        }

        const dt = this.app.ticker.deltaMS / 1000;

        // 1. Process movement input via InputManager
        const input = this.inputManager.getMovementInput();
        this.player.setSpeedMultiplier(1.0);

        // 2. Mouse world position via InputManager
        const mouseWorldPos = this.inputManager.getMouseWorldPos();

        // 3. Update player & Base Guide Arrow (Etap 5 Onboarding)
        const showBaseArrow = this.getShouldShowBaseGuide ? this.getShouldShowBaseGuide() : false;
        if (showBaseArrow) {
            this.player.setGuideTarget({
                x: this.baseDepotRect.x + this.baseDepotRect.width / 2,
                y: this.baseDepotRect.y + this.baseDepotRect.height / 2,
            });
        } else {
            this.player.setGuideTarget(null);
        }

        this.player.update(dt, input, mouseWorldPos);

        // ASMR Tread Marks: Łazik zostawia zanikający ślad gąsienic na podłożu
        const isMoving = Math.abs(this.player.currentLinearSpeed) > 15;
        if (isMoving) {
            this.fxManager.spawnTreadMark(this.player.x, this.player.y, this.player.rotation, this.player.isBoosting);
        }

        // 4. Update camera
        const playerPos = this.player.getPosition();
        this.viewport.follow(playerPos.x, playerPos.y);
        this.viewport.update(dt);

        // 5. Update Base Depot & Player Docking
        const isPlayerInDepot = this.baseDepot.isPlayerInZone(playerPos.x, playerPos.y, this.player.radius);
        this.baseDepot.update(dt, isPlayerInDepot);

        if (isPlayerInDepot && this.onDepotUnload) {
            const backpack = this.getBackpackStatus?.();
            if (backpack && backpack.current > 0) {
                const bonusMult = this.sectorManager.getTotalBonusMultiplier();
                const result = this.onDepotUnload(bonusMult);
                if (result.earnedCredits > 0) {
                    this.baseDepot.triggerUnloadFeedback(result.earnedCredits);
                    this.spawnParticles(this.baseDepot.x + this.baseDepot.size / 2, this.baseDepot.y + this.baseDepot.size / 2, 10);
                    this.addFloatingPopup(`+$${result.earnedCredits.toFixed(2)}`, `SPRZEDANO ${result.soldDust.toFixed(1)} KG PYŁU`, this.baseDepot.x + this.baseDepot.size / 2, this.baseDepot.y + 10, '#10b981');
                    this.soundSystem.playDepotUnload();
                }
            }
        }

        // 5.5. Player Interaction with Outpost Silos (Zrzucanie się do SILO)
        for (const building of this.gridSystem.buildings.values()) {
            if (building.type === 'silo') {
                const silo = building as SiloBuilding;
                const cx = (silo.gridX + 1) * this.tileSize;
                const cy = (silo.gridY + 1) * this.tileSize;
                const dist = Math.hypot(playerPos.x - cx, playerPos.y - cy);

                if (dist <= 72) {
                    const backpack = this.getBackpackStatus?.();
                    if (backpack && backpack.current > 0) {
                        const isEPressed = !!this.inputManager.keys['KeyE'];
                        const isSpacePressed = !!this.inputManager.keys['Space'];
                        const isQuickDump = isEPressed || isSpacePressed;
                        const toUnload = isQuickDump ? backpack.current : Math.min(backpack.current, 45 * dt);

                        if (toUnload > 0) {
                            const actualDeposited = this.simulationLoop.depositDustIntoSilo(silo.id, toUnload);
                            if (actualDeposited > 0) {
                                this.onDeductPlayerDust?.(actualDeposited);
                                silo.isUnloading = true;
                                this.spawnParticles(cx, cy, isQuickDump ? 18 : 3);
                                if (isQuickDump || Math.random() < 0.12) {
                                    this.soundSystem.playDepotUnload();
                                    this.addFloatingPopup('📦 ZRZUCONO DO SILO!', `+${actualDeposited.toFixed(1)} kg pyłu`, cx, cy, '#38bdf8');
                                }
                            }
                        }
                    }
                } else {
                    silo.isUnloading = false;
                }
            }
        }

        // 6. Update GridSystem & Ghost Preview (Krok 3.1 & 6.1)
        const buildState = this.getBuildState?.();
        const isBuilding = !!buildState?.selectedBuilding;
        this.buildingGridGfx.visible = isBuilding || this.isAltMode;

        if (this.inputManager.isDraggingConveyor && this.inputManager.dragStartPos && buildState?.selectedBuilding === 'conveyor') {
            const currentGrid = this.gridSystem.worldToGrid(mouseWorldPos.x, mouseWorldPos.y);
            const path = this.gridSystem.getDragPath(this.inputManager.dragStartPos.gx, this.inputManager.dragStartPos.gy, currentGrid.gx, currentGrid.gy);
            this.gridSystem.updateDragGhost(path, 'conveyor', buildState.credits);
        } else if (buildState?.selectedBuilding) {
            this.gridSystem.updateGhost(
                mouseWorldPos,
                buildState.selectedBuilding,
                buildState.direction,
                buildState.canAfford,
            );
        } else {
            this.gridSystem.ghostContainer.visible = false;
        }

        // 7. Update SimulationLoop (Krok 3.3 & Etap 5, 10, 11)
        const simResult = this.simulationLoop.update(dt, this.baseDepotRect);
        if (simResult.creditsEarned > 0) {
            const bonusMult = this.sectorManager.getTotalBonusMultiplier();
            const boostedCredits = Number((simResult.creditsEarned * bonusMult).toFixed(2));
            this.pendingSimCredits += boostedCredits;
            this.baseDepot.triggerUnloadFeedback(boostedCredits);
            this.soundSystem.playDepotUnload();
        }

        if (simResult.briquettesSold > 0 || simResult.platesSold > 0 || simResult.acidCellsSold > 0) {
            this.onFactoryItemsSold?.(simResult.briquettesSold, simResult.platesSold, simResult.acidCellsSold);
        }

        if (simResult.hasPackagerStomped) {
            this.soundSystem.playPackagerStomp();
            this.screenShakeTimer = 0.15;
            this.spawnParticles(this.baseDepotRect.x + 48, this.baseDepotRect.y + 48, 8);
        }

        if (simResult.hasSmelterFinished) {
            this.soundSystem.playCleanDing(3);
            this.spawnCelebrationParticles(this.baseDepotRect.x + 48, this.baseDepotRect.y + 48, 12);
        }

        this.onPowerUpdate?.(simResult.totalPowerProduced, simResult.totalPowerConsumed);

        // Update Alt-Mode
        this.gridSystem.updateAltMode(this.isAltMode, simResult.hasPower, this.simulationLoop);

        // Etap 11: Render Shield Domes & Check Forcefield Protection
        const isPlayerInShield = simResult.activeShieldDomes.some(
            d => d.active && Math.hypot(playerPos.x - d.x, playerPos.y - d.y) <= d.radius
        );
        this.renderShieldDomes(simResult.activeShieldDomes, dt);

        // Screen Shake
        if (this.screenShakeTimer > 0) {
            this.screenShakeTimer -= dt;
            const shake = (this.screenShakeTimer / 0.15) * 3;
            this.viewport.container.x += (Math.random() - 0.5) * shake;
            this.viewport.container.y += (Math.random() - 0.5) * shake;
        }

        // Clean Milestone Check ("Ding!" feedback)
        const milestone = this.dirtSystem.checkMilestone();
        if (milestone !== null) {
            this.soundSystem.playCleanDing(Math.ceil(milestone / 25));
            this.spawnCelebrationParticles(playerPos.x, playerPos.y, 35);
            this.onMilestoneClean?.(milestone);
        }

        // AtmosphereManager: Acid Rain Environmental Event (Shield Pylon deflects acid!)
        const hasAcidPerk = this.hasPerk?.('vega_acid_neutralizer') ?? false;
        const atmoState = this.atmosphere.update(dt, playerPos, simResult.activeShieldDomes, this.baseDepotRect, hasAcidPerk);
        this.player.setSpeedMultiplier(atmoState.speedMultiplier);

        if (atmoState.isHullBreached) {
            this.hasAcidBreachThisTick = true;
            const depotCenter = {
                x: this.baseDepotRect.x + this.baseDepotRect.width / 2,
                y: this.baseDepotRect.y + this.baseDepotRect.height / 2,
            };
            this.player.teleportTo(depotCenter.x, depotCenter.y);
            this.viewport.follow(depotCenter.x, depotCenter.y, true);
            this.soundSystem.playOverheatDeath();
            this.spawnCelebrationParticles(depotCenter.x, depotCenter.y, 40);
        }

        // Thermal Crater Simulation (Etap 9 & Etap 11 Shield Immunity: parzące kaldery z lawą i energią geotermalną +80 kW)
        const hasHeatPerk = this.hasPerk?.('venera_titanium_insulation') ?? false;
        const thermal = this.thermalCraters.update(dt, playerPos, isPlayerInShield, this.dirtSystem, hasHeatPerk);
        if (this.thermalCraters.newlyDiscoveredCrater) {
            const discCrater = this.thermalCraters.newlyDiscoveredCrater;
            this.thermalCraters.newlyDiscoveredCrater = null;
            const typeStr = discCrater.hasLava ? 'MAGMOWY' : 'BAZALTOWY';
            const store = useGameStore();
            store.showBanner(
                `🌋 ODKRYTO KRATER ${typeStr}: ${discCrater.name.toUpperCase()} (+${discCrater.yieldKW} kW)!`,
                'success',
                4000
            );
            this.soundSystem.playGeothermalDiscovery();
            this.spawnCelebrationParticles(discCrater.x, discCrater.y, 45);
            this.addFloatingPopup(
                '🌋 ODKRYTO KRATER!',
                `${discCrater.name} (+${discCrater.yieldKW} kW)`,
                discCrater.x,
                discCrater.y,
                discCrater.hasLava ? '#f59e0b' : '#38bdf8'
            );
            const achievementStore = useAchievementStore();
            achievementStore.trackProgress('crater_discovery', 1);
        }
        if (thermal.isMeltdown) {
            this.hasMeltdownThisTick = true;
            // Respawn player at Base Depot
            const depotCenter = {
                x: this.baseDepotRect.x + this.baseDepotRect.width / 2,
                y: this.baseDepotRect.y + this.baseDepotRect.height / 2,
            };
            this.player.teleportTo(depotCenter.x, depotCenter.y);
            this.viewport.follow(depotCenter.x, depotCenter.y, true);
            this.spawnCelebrationParticles(depotCenter.x, depotCenter.y, 40);
        }

        // Venera Relics & Archaeology (Wariant A: Pełne odkurzenie natychmiast zabezpiecza i bada sondę)
        const archEvents = this.archaeology.update(dt, playerPos, this.dirtSystem);
        for (const archEvent of archEvents) {
            if (archEvent.type === 'DISCOVERED') {
                const discCount = archEvent.discoveredCount ?? this.archaeology.getDiscoveredCount();
                const totCount = archEvent.totalCount ?? this.archaeology.relics.length;
                this.pendingDiscoveredRelic = {
                    id: archEvent.relic.id,
                    name: archEvent.relic.name,
                    discoveredCount: discCount,
                    totalCount: totCount,
                };
                this.pendingAnalyzedRelic = {
                    id: archEvent.relic.id,
                    name: archEvent.relic.name,
                    rewardCredits: archEvent.relic.rewardCredits,
                };
                // Gotówka naukowa od razu trafia do portfela gracza
                this.pendingSimCredits += archEvent.relic.rewardCredits;
                this.spawnCelebrationParticles(archEvent.relic.x, archEvent.relic.y, 45);
                this.addFloatingPopup(
                    `+$${archEvent.relic.rewardCredits} CR`,
                    `ODKRYTO I ZBADANO: ${archEvent.relic.name.toUpperCase()}`,
                    archEvent.relic.x,
                    archEvent.relic.y,
                    '#10b981'
                );
            }
        }

        // 8. Update Sweep-Bots (Krok 3.2 & Etap 08 - Roomba Sector AI & Dropoff Logistics)
        const botPolicy: BotDropoffPolicy = this.getBotPolicy?.() ?? 'silos_first';
        const activeSilos = this.getActiveSilosList();
        const dropoffContext: BotDropoffContext = {
            policy: botPolicy,
            silos: activeSilos,
            basePos: { x: this.baseDepotRect.x + 48, y: this.baseDepotRect.y + 48 },
        };

        for (const bot of this.bots) {
            const botRes = bot.update(dt, this.dirtSystem, this.sectorManager, dropoffContext);
            if (botRes.unloadedDust > 0) {
                const bonusMult = this.sectorManager.getTotalBonusMultiplier();
                const aphroditeMult = this.hasPerk?.('aphrodite_market_uplink') ? 1.15 : 1.0;
                // Dust sale price: $0.10/kg base value
                const boosted = Number((botRes.unloadedDust * 0.10 * bonusMult * aphroditeMult).toFixed(2));
                this.pendingSimCredits += boosted;
                this.baseDepot.triggerUnloadFeedback(boosted);
            } else if (botRes.unloadedToSilo) {
                const { siloId, amount, x, y } = botRes.unloadedToSilo;
                this.simulationLoop.depositDustIntoSilo(siloId, amount);
                this.soundSystem.playDepotUnload();
                this.spawnParticles(x, y, 14);
                this.addFloatingPopup(
                    `+${amount.toFixed(1)} kg Pyłu`,
                    'ROZŁADUNEK W SILOSIE (ZASILANIE TAŚM)',
                    x,
                    y,
                    '#38bdf8'
                );
            }
        }

        // 8.5. Update Mule Transport Drone (Etap 12)
        if (this.muleBot) {
            const currentBackpack = this.getBackpackStatus?.();
            const muleRes = this.muleBot.update(
                dt,
                playerPos,
                currentBackpack ? currentBackpack.current : 0,
                () => this.onEmptyBackpack ? this.onEmptyBackpack() : 0,
            );
            if (muleRes.unloadedDust > 0) {
                const bonusMult = this.sectorManager.getTotalBonusMultiplier();
                const aphroditeMult = this.hasPerk?.('aphrodite_market_uplink') ? 1.15 : 1.0;
                // Dust sale price: $0.10/kg base value
                const earned = Number((muleRes.unloadedDust * 0.10 * bonusMult * aphroditeMult).toFixed(2));
                this.pendingSimCredits += earned;
                this.baseDepot.triggerUnloadFeedback(earned);
                this.soundSystem.playDepotUnload();
                this.spawnCelebrationParticles(this.baseDepotRect.x + 48, this.baseDepotRect.y + 48, 20);
                this.addFloatingPopup(`+$${earned.toFixed(2)}`, `DRON-MUŁ ROZŁADOWAŁ ${muleRes.unloadedDust.toFixed(1)} KG`, this.baseDepotRect.x + 48, this.baseDepotRect.y + 48);
            }
        }

        // 8.6. Update Orbital Drop-Pod
        if (this.activeDropPod) {
            const currentBackpack = this.getBackpackStatus?.();
            const carried = currentBackpack ? currentBackpack.current : 0;
            const podRes = this.activeDropPod.update(dt, playerPos.x, playerPos.y, carried);

            if (podRes.extractedKg > 0) {
                if (this.onDeductPlayerDust) {
                    this.onDeductPlayerDust(podRes.extractedKg);
                }
                if (podRes.creditsEarned > 0) {
                    this.pendingSimCredits += podRes.creditsEarned;
                    this.soundSystem.playDepotUnload();
                }
            }

            if (podRes.isFinished) {
                this.entitiesLayer.removeChild(this.activeDropPod.container);
                this.activeDropPod.destroy();
                this.activeDropPod = null;
            }
        }

        // Render overhead power transmission lines
        this.renderPowerCables();

        // 9. Sweeping Logic (Only if not placing a building)
        if (!buildState?.selectedBuilding) {
            this.processSweeping(dt, mouseWorldPos);
        } else {
            this.isCurrentlySweeping = false;
            this.player.isSweeping = false;
            this.cursorBrushIndicator.clear();
            this.playerBrushIndicator.clear();
        }

        // 10. Update particle effects & Rhombus celebrations
        this.fxManager.update(dt);
        this.updateRhombusEffects(dt);
        this.updateFloatingPopups(dt);

        // 11. Update Network Sync (Krok 4.2 & 4.3)
        if (this.networkSync) {
            this.networkSync.update(dt, {
                x: playerPos.x,
                y: playerPos.y,
                rotation: this.player.rotation,
            });
        }

        // 12. Throttled UI State notification & Sector check (Rule 2: max 10 Hz)
        this.throttledTimer += dt;
        if (this.throttledTimer >= this.throttleInterval) {
            this.throttledTimer = 0;

            // 1. Live player sector telemetry for HUD
            this.sectorManager.updatePlayerSectorTelemetry(playerPos, this.dirtSystem);

            // 2. Real-time sector completion evaluation (fires at moment of completion anywhere on map!)
            const claimEvents = this.sectorManager.evaluatePendingSectors(this.dirtSystem);
            for (const claimEvent of claimEvents) {
                const sector = claimEvent.sector;
                this.rhombusCompletionAnims.push({
                    cx: sector.cx,
                    cy: sector.cy,
                    w: sector.size,
                    h: sector.size,
                    progress: 0,
                    duration: 1.8,
                });
                this.soundSystem.playCleanDing(2);
                this.pendingSimCredits += claimEvent.creditsAward;
                this.addFloatingPopup(`+$${claimEvent.creditsAward.toFixed(2)}`, 'SEKTOR OCZYSZCZONY (+10% BONUS)', sector.cx, sector.cy);
                this.spawnCelebrationParticles(sector.cx, sector.cy, 35);
            }

            const sectorStats = this.sectorManager.getStats(playerPos);

            if (this.onThrottledTick) {
                const stats = this.dirtSystem.getCleaningStats();
                const relicsAnalyzed = this.archaeology ? this.archaeology.getAnalyzedCount() : 0;
                const ptiRaw = (stats.percentCleaned * 0.4) + (sectorStats.claimedSectorsCount * 1.5) + (relicsAnalyzed * 5.0);
                const ptiPercent = Math.min(100, Math.max(0, Number(ptiRaw.toFixed(2))));

                let ptiStage = 'ETAP I: TOKSYCZNY PYŁ';
                if (ptiPercent >= 75) ptiStage = 'ETAP IV: BŁĘKITNA STRATOSFERA';
                else if (ptiPercent >= 50) ptiStage = 'ETAP III: CHŁODZENIE KORONY';
                else if (ptiPercent >= 25) ptiStage = 'ETAP II: KRYSTALIZACJA BAZALTU';

                this.onThrottledTick({
                    playerX: playerPos.x,
                    playerY: playerPos.y,
                    fps: Math.round(this.app.ticker.FPS),
                    gatheredDustBatch: Number(this.pendingGatheredDust.toFixed(3)),
                    totalCleanedKg: stats.cleanedKg,
                    percentCleaned: stats.percentCleaned,
                    isSweeping: this.isCurrentlySweeping,
                    isBackpackFull: this.isBackpackFull,
                    simCreditsBatch: Number(this.pendingSimCredits.toFixed(2)),
                    currentSectorId: sectorStats.activeSectorId,
                    currentSectorClean: sectorStats.activeSectorCleanPct,
                    currentSectorClaimed: sectorStats.activeSectorClaimed,
                    claimedSectorsCount: sectorStats.claimedSectorsCount,
                    sectorBonusPercent: sectorStats.sectorBonusPercent,

                    // Turbo-Glide [Shift] & PTI
                    boostEnergy: this.player.boostEnergy,
                    isBoosting: this.player.isBoosting,
                    ptiPercent,
                    ptiStage,

                    // Etap 10: Okienko Celu / Inspektor Celu
                    inspectorTarget: this.getTargetInspection(),

                    // Etap 11 & 12: Dron-Muł & Tarcze Ochronne
                    muleStatus: this.muleBot ? this.muleBot.state : 'IDLE',
                    shieldDomesCount: simResult.activeShieldDomes.filter(d => d.active).length,

                    // Deszcz Kwasowy & Korozja Pancerza
                    acidCorrosion: atmoState.corrosionPercent,
                    isPlayerShielded: atmoState.isPlayerShielded,
                    isAcidBreach: this.hasAcidBreachThisTick,

                    // Etap 9: Warunki termiczne & Radar Minimapy
                    playerTemperature: thermal.temperature,
                    playerOverheatPercent: thermal.overheatPercent,
                    isInCrater: thermal.isInCrater,
                    isMeltdown: this.hasMeltdownThisTick,
                    playerRotation: this.player.rotation,
                    discoveredRelicsCount: this.archaeology.getDiscoveredCount(),
                    discoveredRelic: this.pendingDiscoveredRelic,
                    analyzedRelicsCount: this.archaeology.getAnalyzedCount(),
                    analyzedRelic: this.pendingAnalyzedRelic,
                    relicsList: this.archaeology.relics.map(r => ({
                        id: r.id,
                        name: r.name,
                        year: r.year,
                        rewardCredits: r.rewardCredits,
                        isUncovered: r.isUncovered,
                        isAnalyzed: r.isAnalyzed,
                    })),
                    conveyorCount: Array.from(this.gridSystem.buildings.values()).filter(b => b.type === 'conveyor').length,
                    powerProduced: simResult.totalPowerProduced,
                    hasGeothermal: Array.from(this.gridSystem.buildings.values()).some(b => b.type === 'geothermal'),
                    minimapSectors: Array.from(this.sectorManager.sectors.values()).map(s => ({
                        id: s.id,
                        cx: s.cx,
                        cy: s.cy,
                        isClaimed: s.isClaimed,
                        cleanPct: s.cleanPercentage,
                    })),
                    minimapCraters: this.thermalCraters.craters
                        .filter(c => c.isDiscovered)
                        .map(c => ({
                            x: c.x,
                            y: c.y,
                            radius: c.radius,
                            hasLava: c.hasLava,
                            name: c.name,
                            isDiscovered: c.isDiscovered,
                        })),
                    minimapGeysers: [],
                    minimapRelics: this.archaeology.relics
                        .filter(r => r.isUncovered || r.isAnalyzed)
                        .map(r => ({ x: r.x, y: r.y, isUncovered: r.isUncovered, isAnalyzed: r.isAnalyzed })),
                    minimapBots: this.bots.map(b => ({ x: b.x, y: b.y })),
                    silosList: activeSilos.map(s => ({
                        id: s.id,
                        gridX: s.gridX,
                        gridY: s.gridY,
                        acceptsBots: s.acceptsBots,
                        storedDust: s.storedDust,
                        maxDustCapacity: s.maxDustCapacity,
                    })),
                });
                this.pendingGatheredDust = 0;
                this.pendingSimCredits = 0;
                this.pendingAnalyzedRelic = undefined;
                this.pendingDiscoveredRelic = undefined;
                this.hasMeltdownThisTick = false;
                this.hasAcidBreachThisTick = false;
            }
        }
    }

    private updateRhombusEffects(dt: number): void {
        if (this.rhombusCompletionAnims.length === 0) {
            this.rhombusEffectGfx.clear();
            return;
        }

        this.rhombusEffectGfx.clear();
        for (let i = this.rhombusCompletionAnims.length - 1; i >= 0; i--) {
            const anim = this.rhombusCompletionAnims[i];
            anim.progress += dt / (anim.duration || 1.8);
            if (anim.progress >= 1.0) {
                this.rhombusCompletionAnims.splice(i, 1);
                continue;
            }

            // High-tech purified boundary: luminous cyan perimeter + gold corner brackets
            // Slowly fades to 0 so no colorful frame remains to distract the player
            const alpha = Math.max(0, 1.0 - anim.progress);
            const scale = 1.0 + anim.progress * 0.04;
            const hw = (anim.w / 2) * scale;
            const hh = (anim.h / 2) * scale;

            // 1. Cyan boundary
            this.rhombusEffectGfx.moveTo(anim.cx, anim.cy - hh)
                .lineTo(anim.cx + hw, anim.cy)
                .lineTo(anim.cx, anim.cy + hh)
                .lineTo(anim.cx - hw, anim.cy)
                .closePath()
                .stroke({ width: 3.5, color: 0x38bdf8, alpha: alpha * 0.9 });

            // 2. Corner tech accents (the 4 gold vertices)
            const accent = 28 * scale;
            // Top vertex
            this.rhombusEffectGfx.moveTo(anim.cx - accent, anim.cy - hh + accent)
                .lineTo(anim.cx, anim.cy - hh)
                .lineTo(anim.cx + accent, anim.cy - hh + accent)
                .stroke({ width: 4.5, color: 0xfbbf24, alpha });
            // Bottom vertex
            this.rhombusEffectGfx.moveTo(anim.cx - accent, anim.cy + hh - accent)
                .lineTo(anim.cx, anim.cy + hh)
                .lineTo(anim.cx + accent, anim.cy + hh - accent)
                .stroke({ width: 4.5, color: 0xfbbf24, alpha });
            // Left vertex
            this.rhombusEffectGfx.moveTo(anim.cx - hw + accent, anim.cy - accent)
                .lineTo(anim.cx - hw, anim.cy)
                .lineTo(anim.cx - hw + accent, anim.cy + accent)
                .stroke({ width: 4.5, color: 0xfbbf24, alpha });
            // Right vertex
            this.rhombusEffectGfx.moveTo(anim.cx + hw - accent, anim.cy - accent)
                .lineTo(anim.cx + hw, anim.cy)
                .lineTo(anim.cx + hw - accent, anim.cy + accent)
                .stroke({ width: 4.5, color: 0xfbbf24, alpha });

            // 3. Faint golden soft pulse
            this.rhombusEffectGfx.moveTo(anim.cx, anim.cy - hh * 1.01)
                .lineTo(anim.cx + hw * 1.01, anim.cy)
                .lineTo(anim.cx, anim.cy + hh * 1.01)
                .lineTo(anim.cx - hw * 1.01, anim.cy)
                .closePath()
                .stroke({ width: 1.5, color: 0xfacc15, alpha: alpha * 0.35 });
        }
    }

    public addFloatingPopup(title: string, subtitle: string | undefined, x: number, y: number, color: string = '#38bdf8'): void {
        const popupContainer = new Container();
        popupContainer.x = x;
        popupContainer.y = y;

        const titleStyle = new TextStyle({
            fontFamily: 'monospace, "Segoe UI", sans-serif',
            fontSize: 24,
            fontWeight: 'bold',
            fill: color,
            stroke: { color: '#090d16', width: 4 },
            dropShadow: {
                alpha: 0.9,
                angle: Math.PI / 4,
                blur: 4,
                color: '#000000',
                distance: 2,
            },
        });

        const titleText = new Text({
            text: title,
            style: titleStyle,
        });
        titleText.anchor.set(0.5, 0.5);
        popupContainer.addChild(titleText);

        let subText: Text | undefined;
        if (subtitle) {
            const subStyle = new TextStyle({
                fontFamily: 'monospace, sans-serif',
                fontSize: 12,
                fontWeight: 'bold',
                fill: '#fbbf24',
                stroke: { color: '#000000', width: 3 },
            });
            subText = new Text({
                text: subtitle,
                style: subStyle,
            });
            subText.anchor.set(0.5, -1.3);
            popupContainer.addChild(subText);
        }

        this.effectsLayer.addChild(popupContainer);

        this.floatingPopups.push({
            container: popupContainer,
            text: titleText,
            subText,
            startX: x,
            startY: y,
            progress: 0,
            duration: 1.8,
        });
    }

    private updateFloatingPopups(dt: number): void {
        for (let i = this.floatingPopups.length - 1; i >= 0; i--) {
            const popup = this.floatingPopups[i];
            popup.progress += dt / popup.duration;

            if (popup.progress >= 1.0) {
                popup.container.destroy({ children: true });
                this.floatingPopups.splice(i, 1);
                continue;
            }

            // Smooth upward floating movement
            const floatY = popup.startY - (popup.progress * 60);
            popup.container.y = floatY;

            // Bounce scale in first 20%
            let scale = 1.0;
            if (popup.progress < 0.15) {
                scale = 0.6 + (popup.progress / 0.15) * 0.45; // 0.6 -> 1.05
            } else if (popup.progress < 0.3) {
                scale = 1.05 - ((popup.progress - 0.15) / 0.15) * 0.05; // 1.05 -> 1.0
            }
            popup.container.scale.set(scale);

            // Smooth alpha fade out in last 45%
            let alpha = 1.0;
            if (popup.progress > 0.55) {
                alpha = (1.0 - popup.progress) / 0.45;
            }
            popup.container.alpha = Math.max(0, Math.min(1, alpha));
        }
    }

    public getTargetInspection(): InspectorTarget {
        const mouseWorldPos = this.inputManager.getMouseWorldPos();
        const mx = mouseWorldPos.x;
        const my = mouseWorldPos.y;
        const isMouseInWorld = mx >= 0 && mx <= this.worldWidth && my >= 0 && my <= this.worldHeight;

        if (isMouseInWorld) {
            // 1. Relics (within hover distance)
            for (const relic of this.archaeology.relics) {
                const dist = Math.hypot(mx - relic.x, my - relic.y);
                if (dist <= 48) {
                    return {
                        type: 'relic',
                        id: relic.id,
                        title: relic.name.toUpperCase(),
                        subtitle: `${relic.year} • Historyczny Wrak Badawczy Wenus`,
                        source: 'cursor',
                        cleanPct: (relic.isAnalyzed || relic.isUncovered) ? 100 : 0,
                        isClaimed: relic.isAnalyzed || relic.isUncovered,
                        statusBadge: (relic.isAnalyzed || relic.isUncovered) ? '✨ ZBADANA & ODZYSKANA' : 'ZASYPANA PYŁEM',
                        accentColor: (relic.isAnalyzed || relic.isUncovered) ? 'emerald' : 'amber',
                        bonusText: (relic.isAnalyzed || relic.isUncovered) ? `Odebrano nagrodę: +$${relic.rewardCredits}` : `Wartość badań: +$${relic.rewardCredits}`,
                        extraDetails: (relic.isAnalyzed || relic.isUncovered) ? 'Dane telemetryczne i schemat technologiczny zarchiwizowane.' : 'Odkurz pył wokół sondy (lub wyślij roboty), aby ją automatycznie odzyskać.',
                    };
                }
            }

            // 2. Thermal Craters (within crater radius + rim tolerance)
            for (const crater of this.thermalCraters.craters) {
                const dist = Math.hypot(mx - crater.x, my - crater.y);
                if (dist <= crater.radius + 36) {
                    if (!crater.isDiscovered) {
                        return {
                            type: 'crater',
                            id: crater.id,
                            title: 'ZASYPANY KRATER WULKANICZNY',
                            subtitle: `Wykryto formację geologiczną: ${crater.name}`,
                            source: 'cursor',
                            cleanPct: Math.round(crater.cleanPct),
                            statusBadge: `⏳ ZASYPANY: ${Math.round(crater.cleanPct)}% / 65%`,
                            accentColor: 'amber',
                            bonusText: 'Wymaga odsłonięcia (zbierz pył z powierzchni krateru)',
                            extraDetails: 'Oczyść zalegający pył wulkaniczny (min. 65%), aby odsłonić krater na radarze i odblokować montaż Generatora Geotermalnego [8] (+80 kW).',
                        };
                    }
                    if (crater.hasLava) {
                        return {
                            type: 'crater',
                            id: crater.id,
                            title: crater.name.toUpperCase(),
                            subtitle: `Aktywna Kaldera Magmowa [Promień: ${crater.radius}m • Potencjał: +${crater.yieldKW} kW]`,
                            source: 'cursor',
                            cleanPct: 100,
                            temperature: crater.peakTemp,
                            statusBadge: '🔥 ODSŁONIĘTA MAGMA (+80 kW)',
                            accentColor: 'rose',
                            bonusText: `Temperatura: +${crater.peakTemp}°C • Zasilanie: +${crater.yieldKW} kW`,
                            extraDetails: 'Wrzące jezioro magmowe odsłonięte spod pyłu. Gotowe pod montaż Generatora Geotermalnego [8] (+80 kW). Uwaga na nagrzewanie!',
                        };
                    } else {
                        return {
                            type: 'crater',
                            id: crater.id,
                            title: crater.name.toUpperCase(),
                            subtitle: `Wygasły Krater Bazaltowy [Promień: ${crater.radius}m • Potencjał: +${crater.yieldKW} kW]`,
                            source: 'cursor',
                            cleanPct: 100,
                            temperature: 460,
                            statusBadge: '⚡ ODSŁONIĘTY KRATER (+80 kW)',
                            accentColor: 'emerald',
                            bonusText: `Temperatura otoczenia: 460°C • Zasilanie: +${crater.yieldKW} kW`,
                            extraDetails: 'Głęboka formacja bazaltowa odsłonięta spod pyłu. Bezpieczne miejsce montażu Generatora Geotermalnego [8] (+80 kW z głębin Wenus).',
                        };
                    }
                }
            }

            // 3. Base Depot
            const b = this.baseDepotRect;
            if (b && mx >= b.x && mx <= b.x + b.width && my >= b.y && my <= b.y + b.height) {
                return {
                    type: 'depot',
                    title: 'GŁÓWNY TERMINAL BAZY (DEPOT)',
                    subtitle: 'Strefa Logistyczna Alpha',
                    source: 'cursor',
                    cleanPct: 100,
                    isClaimed: true,
                    statusBadge: 'STREFA BEZPIECZNA',
                    accentColor: 'cyan',
                    bonusText: `Mnożnik skupu: +${this.sectorManager.getClaimedCount() * 10}%`,
                    extraDetails: 'Wjedź tutaj, aby automatycznie sprzedać zebrany pył i schłodzić silnik.',
                };
            }

            // 3.5. Mule Transport Drone (Etap 12)
            if (this.muleBot) {
                const distMule = Math.hypot(mx - this.muleBot.x, my - this.muleBot.y);
                if (distMule <= 32) {
                    return {
                        type: 'bot',
                        id: 'MULE-BOT-01',
                        title: 'DRON-MUŁ TRANSPORTOWY MK-1',
                        subtitle: `Status: ${this.muleBot.state} • Ładunek: ${this.muleBot.carriedDustKg.toFixed(1)} / ${this.muleBot.capacity} kg`,
                        source: 'cursor',
                        cleanPct: 100,
                        statusBadge: this.muleBot.state === 'IDLE' ? 'W BAZIE [WCIŚNIJ G]' : `STATUS: ${this.muleBot.state}`,
                        accentColor: 'cyan',
                        bonusText: 'Autonomiczny transport urobku z plecaka gracza do Bazy',
                        extraDetails: 'Wciśnij [G] w dowolnym miejscu mapy, aby przyzwać drona do opróżnienia plecaka!',
                    };
                }
            }

            // 4. Factory Buildings (Etap 10 & 11)
            const gridPos = this.gridSystem.worldToGrid(mx, my);
            const building = this.gridSystem.getBuildingAt(gridPos.gx, gridPos.gy);
            if (building) {
                const cfg = BUILDING_CONFIGS[building.type];
                let extra = 'Automatyczny element infrastruktury logistycznej bazy.';
                let bonus = cfg ? `Koszt: $${cfg.cost} • Moc: ${cfg.powerUsage} kW` : undefined;

                if (building.type === 'smelter') {
                    const hasRaw = this.simulationLoop.getSmelterHasRaw(building.id);
                    const progress = Math.round(this.simulationLoop.getSmelterProgress(building.id) * 100);
                    bonus = `Wsad: ${hasRaw ? 'Brykiet w toku' : 'Brak brykietu'} • Wytapianie: ${progress}%`;
                    extra = 'Przetapia sprasowane brykiety w wysokowartościowe Płyty Kompozytowe ($60/szt.).';
                } else if (building.type === 'silo') {
                    const count = this.simulationLoop.getSiloCount(building.id);
                    const dust = this.simulationLoop.getSiloDust(building.id);
                    bonus = `Pył: ${dust.toFixed(1)} / 300 kg • Towar: ${count} / 100 szt.`;
                    extra = 'Magazyn polowy i bufor: Zbliż się lub naciśnij [E], aby zrzucić urobek z odkurzacza!';
                } else if (building.type === 'conveyor_mk2') {
                    bonus = 'Przepustowość: 5 pól/s (2.5x szybszy od Mk1)';
                    extra = 'Szybki taśmociąg przemysłowy do wydajnych linii produkcyjnych.';
                } else if (building.type === 'geothermal') {
                    const bWorldX = (building.gridX + building.widthTiles * 0.5) * this.tileSize;
                    const bWorldY = (building.gridY + building.heightTiles * 0.5) * this.tileSize;
                    const onHotCrater = this.thermalCraters.hasActiveHotCrater(bWorldX, bWorldY);
                    if (onHotCrater) {
                        bonus = '⚡ Aktywny: +80 kW • Podłączony do kaldery magmowej';
                        extra = 'Generator wykorzystuje geotermalny żar lawy do stałego zasilania bazy.';
                    } else {
                        bonus = '⚠️ NIEAKTYWNY (0 kW) • Brak wrzącej lawy pod spodem!';
                        extra = 'Ten generator nie stoi na gorącym kraterze magmowym i nie produkuje energii!';
                    }
                } else if (building.type === 'shield_pylon') {
                    bonus = 'Zużycie: 25 kW • Zasięg Tarczy: 280 m';
                    extra = 'Generuje pole siłowe chroniące przed kwasem siarkowym i przegrzaniem termicznym.';
                } else if (building.type === 'pipe') {
                    const hasFluid = (building as any).hasFluid;
                    bonus = hasFluid ? 'Ciecz: Kwas Siarkowy (Ciśnienie 100%)' : 'Rurociąg Pusty (Brak ciśnienia)';
                    extra = 'Hermetyczna linia przesyłowa łącząca Ekstraktory z Rafinerią Chemiczną.';
                } else if (building.type === 'acid_pump') {
                    const isExtracting = (building as any).isExtracting;
                    bonus = isExtracting ? 'Ekstrakcja Kwasu: 50 L/s (Aktywna)' : 'Brak zasilania lub brak gejzeru w zasięgu';
                    extra = 'Wydobywa ciekły kwas siarkowy z gejzerów i wtłacza go do sieci rurociągów.';
                } else if (building.type === 'acid_refinery') {
                    const hasAcid = this.simulationLoop.getRefineryHasAcid(building.id);
                    const progress = Math.round(this.simulationLoop.getRefineryProgress(building.id) * 100);
                    bonus = `Wsad: ${hasAcid ? 'Kwas w reaktorze' : 'Brak kwasu'} • Synteza: ${progress}%`;
                    extra = 'Zaawansowana rafineria chemiczna syntetyzująca Ogniwa Kwasowe ($120/szt.).';
                }

                return {
                    type: 'building',
                    title: cfg ? cfg.name.toUpperCase() : building.type.toUpperCase(),
                    subtitle: `Koordynaty Fabryki: [${building.gridX}, ${building.gridY}]`,
                    source: 'cursor',
                    cleanPct: 100,
                    statusBadge: 'INFRASTRUKTURA LOGISTYCZNA',
                    accentColor: building.type === 'shield_pylon' ? 'cyan' : (building.type === 'geothermal' || building.type === 'smelter' ? 'amber' : 'emerald'),
                    bonusText: bonus,
                    extraDetails: extra,
                };
            }

            // 5. Rhombus Sector under cursor
            const cursorSector = this.sectorManager.getSectorAt(mx, my);
            if (cursorSector) {
                const cleanPct = cursorSector.isClaimed
                    ? 100
                    : this.dirtSystem.getRhombusCleanPercentage(cursorSector.cx, cursorSector.cy, cursorSector.size, cursorSector.size);

                let dirtBadge = cursorSector.isClaimed ? '✨ OCZYSZCZONY (+10% BONUS)' : `W TRAKCIE (${cleanPct.toFixed(1)}%)`;
                let dirtDesc = cursorSector.isClaimed ? 'Sektor w pełni oczyszczony z pyłu wenusjańskiego.' : 'Oczyść min. 96% pyłu, aby automatycznie wyczyścić cały sektor!';
                let accentColor: 'cyan' | 'amber' | 'rose' | 'emerald' | 'purple' = cursorSector.isClaimed ? 'cyan' : 'amber';

                return {
                    type: 'sector',
                    id: cursorSector.id,
                    title: `SEKTOR ${cursorSector.id}`,
                    subtitle: `Rąb Sektorowy 512px [U: ${cursorSector.u}, V: ${cursorSector.v}]`,
                    source: 'cursor',
                    cleanPct: Number(cleanPct.toFixed(1)),
                    isClaimed: cursorSector.isClaimed,
                    statusBadge: dirtBadge,
                    accentColor,
                    bonusText: cursorSector.isClaimed ? 'Stały bonus: +10% do skupu surowców' : 'Nagroda za oczyszczenie: $10.00 + 10% bonus',
                    extraDetails: dirtDesc,
                };
            }
        }

        // Fallback: Player's current standing sector
        const playerPos = this.player.getPosition();
        const playerSector = this.sectorManager.getSectorAt(playerPos.x, playerPos.y);
        if (playerSector) {
            return {
                type: 'sector',
                id: playerSector.id,
                title: `SEKTOR ${playerSector.id}`,
                subtitle: 'Aktualna pozycja Twojego łazika',
                source: 'player',
                cleanPct: Number(playerSector.cleanPercentage.toFixed(1)),
                isClaimed: playerSector.isClaimed,
                statusBadge: playerSector.isClaimed ? '✨ OCZYSZCZONY (+10% BONUS)' : `W TRAKCIE (${playerSector.cleanPercentage.toFixed(1)}%)`,
                accentColor: playerSector.isClaimed ? 'cyan' : 'amber',
                bonusText: playerSector.isClaimed ? 'Stały bonus: +10% do skupu surowców' : 'Nagroda za oczyszczenie: $10.00 + 10% bonus',
                extraDetails: playerSector.isClaimed ? 'Sektor w pełni oczyszczony z pyłu wenusjańskiego.' : 'Oczyść min. 96% pyłu, aby automatycznie wyczyścić cały sektor!',
            };
        }

        return {
            type: 'terrain',
            title: 'POWIERZCHNIA WENUS',
            subtitle: 'Pustynia Wulkaniczna',
            source: 'player',
            statusBadge: 'NIEZBADANY TEREN',
            accentColor: 'amber',
            extraDetails: 'Użyj odkurzacza lub robotów, aby zbierać popiół.',
        };
    }

    private processSweeping(dt: number, mouseWorldPos: { x: number; y: number }): void {
        const sweepFromSpace = !!this.inputManager.keys['Space'];
        const sweepFromMouse = this.inputManager.isMouseDown;
        const wantsToSweep = sweepFromSpace || sweepFromMouse;

        const backpack = this.getBackpackStatus?.();
        this.isBackpackFull = backpack?.isFull ?? false;

        const canGather = !this.isBackpackFull;
        this.isCurrentlySweeping = wantsToSweep && canGather;
        this.player.isSweeping = this.isCurrentlySweeping;

        // ETAP 1: Fizyczny punkt ssania przed przednim lemieszem łazika (nozzle hitbox)
        const frontBrush = this.player.getFrontBrushPosition(this.brushRadius);
        let sweptKgThisTick = 0;

        if (this.isDevSweepMode) {
            // =========================================================================
            // TRYB DEWELOPERSKI [F9]: Stary system czyszczenia kursorem myszy i wokół auta
            // =========================================================================
            if (sweepFromSpace && canGather) {
                let result: SweepResult;
                if (this.lastPlayerSweepPos) {
                    result = this.dirtSystem.sweepSegment(
                        this.lastPlayerSweepPos.x,
                        this.lastPlayerSweepPos.y,
                        frontBrush.x,
                        frontBrush.y,
                        this.brushRadius,
                    );
                } else {
                    result = this.dirtSystem.sweepPoint(frontBrush.x, frontBrush.y, this.brushRadius);
                }

                this.lastPlayerSweepPos = { x: frontBrush.x, y: frontBrush.y };

                if (result.slagCrackedCount > 0) {
                    this.soundSystem.playSlagCrunch();
                    this.fxManager.spawnSlagRockChips(frontBrush.x, frontBrush.y, 6);
                    const rubbleKg = result.slagCrackedCount * this.dirtSystem.kgPerCell * 0.5;
                    sweptKgThisTick += rubbleKg;
                    this.pendingGatheredDust += rubbleKg;
                }

                if (result.cleanedCount > 0) {
                    sweptKgThisTick += result.cleanedKg;
                    this.pendingGatheredDust += result.cleanedKg;
                    this.fxManager.spawnSuctionVortex(frontBrush.x, frontBrush.y, 5);
                    if (result.slagCleanedCount > 0) {
                        this.fxManager.spawnSlagRockChips(frontBrush.x, frontBrush.y, 3);
                    }
                    this.networkSync?.queueSweepPoint(frontBrush.x, frontBrush.y, this.brushRadius);
                }
            } else {
                this.lastPlayerSweepPos = null;
            }

            if (sweepFromMouse && canGather) {
                let result: SweepResult;
                if (this.lastCursorSweepPos) {
                    result = this.dirtSystem.sweepSegment(
                        this.lastCursorSweepPos.x,
                        this.lastCursorSweepPos.y,
                        mouseWorldPos.x,
                        mouseWorldPos.y,
                        this.brushRadius,
                    );
                } else {
                    result = this.dirtSystem.sweepPoint(mouseWorldPos.x, mouseWorldPos.y, this.brushRadius);
                }

                this.lastCursorSweepPos = { x: mouseWorldPos.x, y: mouseWorldPos.y };

                if (result.slagCrackedCount > 0) {
                    this.soundSystem.playSlagCrunch();
                    this.fxManager.spawnSlagRockChips(mouseWorldPos.x, mouseWorldPos.y, 6);
                    const rubbleKg = result.slagCrackedCount * this.dirtSystem.kgPerCell * 0.5;
                    sweptKgThisTick += rubbleKg;
                    this.pendingGatheredDust += rubbleKg;
                }

                if (result.cleanedCount > 0) {
                    sweptKgThisTick += result.cleanedKg;
                    this.pendingGatheredDust += result.cleanedKg;
                    this.fxManager.spawnSuctionVortex(mouseWorldPos.x, mouseWorldPos.y, 5);
                    if (result.slagCleanedCount > 0) {
                        this.fxManager.spawnSlagRockChips(mouseWorldPos.x, mouseWorldPos.y, 3);
                    }
                    this.networkSync?.queueSweepPoint(mouseWorldPos.x, mouseWorldPos.y, this.brushRadius);
                }
            } else {
                this.lastCursorSweepPos = null;
            }
        } else {
            // =========================================================================
            // TRYB NORMALNY: Naturalny kształt zbierania pyłu (Stożek Próżniowy + Lemiesz)
            // =========================================================================
            this.lastCursorSweepPos = null;

            if (wantsToSweep && canGather) {
                const config = getToolConeConfig(this.currentToolId);

                // 1. Czyszczenie pełnego trójkątnego stożka od zderzaka do końca promienia
                const sweepRes = this.dirtSystem.sweepCone(
                    this.player.x,
                    this.player.y,
                    this.player.rotation,
                    config.reachDistance,
                    config.endRadius
                );

                // 2. Jeśli Mega-Harvester, czyści dodatkowo szeroki pas tuż przed lemieszem
                let bladeRes: SweepResult | null = null;
                if (config.hasBladeBar && config.bladeWidth) {
                    bladeRes = this.dirtSystem.sweepBladeBar(
                        this.player.x,
                        this.player.y,
                        this.player.rotation,
                        config.bladeWidth,
                        18
                    );
                }

                const totalCleanedCount = sweepRes.cleanedCount + (bladeRes?.cleanedCount ?? 0);
                const totalCleanedKg = sweepRes.cleanedKg + (bladeRes?.cleanedKg ?? 0);
                const totalSlagCracked = sweepRes.slagCrackedCount + (bladeRes?.slagCrackedCount ?? 0);
                const totalSlagCleaned = sweepRes.slagCleanedCount + (bladeRes?.slagCleanedCount ?? 0);

                this.lastPlayerSweepPos = { x: frontBrush.x, y: frontBrush.y };

                // 1. Kruszenie bazaltu (Pass 1)
                if (totalSlagCracked > 0) {
                    this.soundSystem.playSlagCrunch();
                    this.fxManager.spawnSlagRockChips(frontBrush.x, frontBrush.y, 6);
                    const rubbleKg = totalSlagCracked * this.dirtSystem.kgPerCell * 0.5;
                    sweptKgThisTick += rubbleKg;
                    this.pendingGatheredDust += rubbleKg;
                }

                // 2. Zassanie pyłu i oczyszczenie podłoża
                if (totalCleanedCount > 0) {
                    sweptKgThisTick += totalCleanedKg;
                    this.pendingGatheredDust += totalCleanedKg;
                    this.fxManager.spawnSuctionVortex(frontBrush.x, frontBrush.y, 5);
                    if (totalSlagCleaned > 0) {
                        this.fxManager.spawnSlagRockChips(frontBrush.x, frontBrush.y, 3);
                    }
                    this.networkSync?.queueSweepPoint(frontBrush.x, frontBrush.y, config.endRadius);
                }
            } else {
                this.lastPlayerSweepPos = null;
            }
        }

        // Dynamiczna modulacja dźwięku turbiny próżniowej oraz silników turbo
        if (this.isCurrentlySweeping) {
            this.soundSystem.setVacuumSound(true);
            this.soundSystem.updateVacuumPitch(sweptKgThisTick / dt);
        } else {
            this.soundSystem.setVacuumSound(false);
            this.soundSystem.updateVacuumPitch(0);
        }
        this.soundSystem.setBoostSound(this.player.isBoosting);

        this.renderBrushIndicators(frontBrush, mouseWorldPos, sweepFromSpace, sweepFromMouse);
    }

    private renderBrushIndicators(
        frontBrush: { x: number; y: number },
        mouseWorldPos: { x: number; y: number },
        isSpaceSweeping: boolean,
        isMouseSweeping: boolean,
    ): void {
        this.playerBrushIndicator.clear();
        this.cursorBrushIndicator.clear();

        if (this.isDevSweepMode) {
            // Pomocniczy wskaźnik przed pojazdem w trybie deweloperskim
            let playerBrushColor = 0xf59e0b;
            let playerBrushAlpha = 0.35;

            if (this.isBackpackFull && isSpaceSweeping) {
                playerBrushColor = 0xef4444;
                playerBrushAlpha = 0.95;
            } else if (isSpaceSweeping) {
                playerBrushColor = 0x38bdf8;
                playerBrushAlpha = 0.85;
            }

            this.playerBrushIndicator.circle(frontBrush.x, frontBrush.y, this.brushRadius)
                .stroke({ width: 1.5, color: playerBrushColor, alpha: playerBrushAlpha });

            if (isSpaceSweeping) {
                const fillCol = this.isBackpackFull ? 0xef4444 : 0x38bdf8;
                this.playerBrushIndicator.circle(frontBrush.x, frontBrush.y, this.brushRadius)
                    .fill({ color: fillCol, alpha: 0.2 });
            }

            // Pomocniczy wskaźnik pod kursorem myszy w trybie deweloperskim
            let cursorColor = 0xf97316;
            let cursorAlpha = 0.4;

            if (this.isBackpackFull && isMouseSweeping) {
                cursorColor = 0xef4444;
                cursorAlpha = 0.95;
            } else if (isMouseSweeping) {
                cursorColor = 0x38bdf8;
                cursorAlpha = 0.9;
            }

            this.cursorBrushIndicator.circle(mouseWorldPos.x, mouseWorldPos.y, this.brushRadius)
                .stroke({ width: 1.5, color: cursorColor, alpha: cursorAlpha });

            if (isMouseSweeping) {
                const fillCol = this.isBackpackFull ? 0xef4444 : 0x38bdf8;
                this.cursorBrushIndicator.circle(mouseWorldPos.x, mouseWorldPos.y, this.brushRadius)
                    .fill({ color: fillCol, alpha: 0.2 });
            }
        } else if (this.isAltMode) {
            // =========================================================================
            // TRYB ALT-MODE (Taktyczny Podgląd Hitboxów):
            // Pokazuj okrąg fizycznego zasięgu lemiesza WYŁĄCZNIE po wciśnięciu [Alt]
            // =========================================================================
            const config = getToolConeConfig(this.currentToolId);
            const isSweeping = this.isCurrentlySweeping;
            const strokeColor = this.isBackpackFull ? 0xef4444 : 0x38bdf8;
            const strokeAlpha = isSweeping ? 0.45 : 0.25;

            // Rysuj obrys zasięgu lemiesza tylko w trybie taktycznym z Altem
            this.playerBrushIndicator.circle(frontBrush.x, frontBrush.y, config.endRadius)
                .stroke({ width: 1.2, color: strokeColor, alpha: strokeAlpha });

            if (isSweeping) {
                const fillColor = this.isBackpackFull ? 0xef4444 : 0x38bdf8;
                this.playerBrushIndicator.circle(frontBrush.x, frontBrush.y, config.endRadius)
                    .fill({ color: fillColor, alpha: 0.1 });
            }
        }
        // W normalnej rozgrywce (bez [Alt] i bez [F9]) wskaźniki są całkowicie czyste - brak sztucznych okręgów!
    }

    public spawnParticles(x: number, y: number, count: number): void {
        this.fxManager.spawnDustParticles(x, y, count);
    }

    public setBrushRadius(radius: number, toolId?: string): void {
        this.brushRadius = radius;
        if (toolId) {
            this.currentToolId = toolId;
        }
        if (toolId && this.player) {
            this.player.setTool(toolId);
        }
    }

    public callMuleBot(): boolean {
        if (!this.muleBot) return false;
        const launched = this.muleBot.launchToPlayer();
        if (launched) {
            this.soundSystem.playCleanDing(1);
        }
        return launched;
    }

    public callOrbitalDropPod(): boolean {
        if (this.activeDropPod && this.activeDropPod.state !== 'DONE') {
            this.addFloatingPopup('⚠️ KASPUŁA W TOKU', 'Kapsuła orbitalna już realizuje misję!', this.player.x, this.player.y, '#f59e0b');
            return false;
        }

        const baseDist = Math.hypot(this.player.x - this.baseDepotRect.x, this.player.y - this.baseDepotRect.y);
        if (baseDist < 500) {
            this.addFloatingPopup('⚠️ ZA BLISKO BAZY', 'W pobliżu Bazy korzystaj ze stanowiska rozładunku!', this.player.x, this.player.y, '#f59e0b');
            return false;
        }

        const buildState = this.getBuildState?.();
        if (buildState && buildState.credits < 50) {
            this.addFloatingPopup('⚠️ BRAK ŚRODKÓW', 'Wezwanie zrzutu orbitalnego kosztuje $50.00!', this.player.x, this.player.y, '#ef4444');
            return false;
        }

        this.pendingSimCredits -= 50;
        this.soundSystem.playCleanDing(2);
        this.addFloatingPopup('🚀 WEZWANO ZRZUT ORBITALNY', '-$50.00 CR (LĄDOWANIE)', this.player.x, this.player.y, '#38bdf8');

        const landX = this.player.x + 35;
        const landY = this.player.y - 20;
        this.activeDropPod = new OrbitalDropPodEntity(landX, landY);
        this.entitiesLayer.addChild(this.activeDropPod.container);
        return true;
    }

    private renderPowerCables(): void {
        this.powerCablesGfx.clear();
        const powerSources: { x: number; y: number }[] = [];

        // 1. Zbieramy główne źródła zasilania (słupy, solary, geotermia, baza)
        for (const b of this.gridSystem.buildings.values()) {
            if (b.type === 'power_pylon' || b.type === 'solar' || b.type === 'geothermal') {
                powerSources.push({
                    x: (b.gridX + b.widthTiles * 0.5) * this.tileSize,
                    y: (b.gridY + b.heightTiles * 0.5) * this.tileSize,
                });
            }
        }

        // Dodaj Centralną Rafinerię (Base Depot) jako główną stację transformatorową
        const baseCenter = {
            x: this.baseDepotRect.x + this.baseDepotRect.width / 2,
            y: this.baseDepotRect.y + 10,
        };
        powerSources.push(baseCenter);

        // Funkcja pomocnicza do rysowania wiszącego, grubego kabla z cieniem i rdzeniem (Catenary Sagging)
        const drawHangingCable = (p1: { x: number; y: number }, p2: { x: number; y: number }, maxSag: number = 22) => {
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const midX = (p1.x + p2.x) / 2;
            const sag = Math.min(maxSag, 6 + dist / 12);
            const midY = (p1.y + p2.y) / 2 + sag;

            // A. Miękki cień kabla na gruncie (uniesiony nad ziemię: x: +6px, y: +10px)
            this.powerCablesGfx.moveTo(p1.x + 6, p1.y + 10)
                .quadraticCurveTo(midX + 6, midY + 10, p2.x + 6, p2.y + 10)
                .stroke({ width: 3.0, color: 0x000000, alpha: 0.35 });

            // B. Gruby komiksowy pancerz gumowy
            this.powerCablesGfx.moveTo(p1.x, p1.y)
                .quadraticCurveTo(midX, midY, p2.x, p2.y)
                .stroke({ width: 2.8, color: 0x0a0a10, alpha: 0.95 });

            // C. Grafitowy rdzeń / odbłysk światła
            this.powerCablesGfx.moveTo(p1.x, p1.y)
                .quadraticCurveTo(midX, midY, p2.x, p2.y)
                .stroke({ width: 1.0, color: 0x3f3f46, alpha: 0.70 });
        };

        // 2. Magistrala szkieletowa: połączenia między słupami i źródłami zasilania
        const maxBackboneDist = 360;
        for (let i = 0; i < powerSources.length; i++) {
            for (let j = i + 1; j < powerSources.length; j++) {
                const p1 = powerSources[i];
                const p2 = powerSources[j];
                const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                if (dist <= maxBackboneDist) {
                    drawHangingCable(p1, p2, 24);
                }
            }
        }

        // 3. Połączenia bezpośrednie do maszyn produkcyjnych (Prasa, Piec, Silos, Doki, Rafineria, Działa)
        const maxMachineDist = 280;
        for (const b of this.gridSystem.buildings.values()) {
            if (b.type === 'packager' || b.type === 'smelter' || b.type === 'silo' || b.type === 'awesome_sink' || b.type === 'vacuum_turret' || b.type === 'dock' || b.type === 'shield_pylon' || b.type === 'acid_pump' || b.type === 'acid_refinery') {
                const machSocket = {
                    x: (b.gridX + b.widthTiles * 0.5) * this.tileSize,
                    y: b.gridY * this.tileSize + 4,
                };

                // Znajdź najbliższe źródło zasilania
                let nearestSrc: { x: number; y: number } | null = null;
                let minDist = maxMachineDist;

                for (const src of powerSources) {
                    const d = Math.hypot(src.x - machSocket.x, src.y - machSocket.y);
                    if (d < minDist) {
                        minDist = d;
                        nearestSrc = src;
                    }
                }

                if (nearestSrc) {
                    drawHangingCable(nearestSrc, machSocket, 18);

                    // Gniazdo przyłączeniowe (Terminal Socket) na maszynie
                    this.powerCablesGfx.circle(machSocket.x, machSocket.y, 3.5)
                        .fill({ color: 0x18181b })
                        .stroke({ width: 1.5, color: 0xfacc15 });

                    // Mikro-iskra elektryczna
                    const sparkCycle = Math.sin(Date.now() * 0.005 + b.gridX * 3);
                    if (sparkCycle > 0.92) {
                        this.powerCablesGfx.circle(machSocket.x, machSocket.y, 2)
                            .fill({ color: 0xffffff });
                        this.powerCablesGfx.moveTo(machSocket.x - 3, machSocket.y).lineTo(machSocket.x + 3, machSocket.y)
                            .stroke({ width: 1, color: 0xfacc15 });
                        this.powerCablesGfx.moveTo(machSocket.x, machSocket.y - 3).lineTo(machSocket.x, machSocket.y + 3)
                            .stroke({ width: 1, color: 0xfacc15 });
                    }
                }
            }
        }
    }

    private handleLeftMouseDown(pos: { x: number; y: number }): void {
        const buildState = this.getBuildState?.();
        if (buildState?.selectedBuilding === 'conveyor') {
            const { gx, gy } = this.gridSystem.worldToGrid(pos.x, pos.y);
            this.inputManager.startConveyorDrag(gx, gy);
            return;
        } else if (buildState?.selectedBuilding) {
            const { gx, gy, canPlace } = this.gridSystem.updateGhost(
                pos,
                buildState.selectedBuilding,
                buildState.direction,
                buildState.canAfford,
            );

            if (canPlace) {
                const config = BUILDING_CONFIGS[buildState.selectedBuilding];
                const placed = this.gridSystem.placeBuilding(
                    buildState.selectedBuilding,
                    gx,
                    gy,
                    buildState.direction,
                );
                if (placed) {
                    this.soundSystem.playBuildingPlace();
                    this.onBuildPlaced?.(buildState.selectedBuilding, config.cost);
                    this.spawnParticles((gx + 0.5) * this.tileSize, (gy + 0.5) * this.tileSize, 8);
                    this.networkSync?.broadcastBuildingPlaced(
                        buildState.selectedBuilding,
                        gx,
                        gy,
                        buildState.direction,
                    );
                }
            } else {
                const config = BUILDING_CONFIGS[buildState.selectedBuilding];
                if (!buildState.canAfford) {
                    this.soundSystem.playCleanDing(0);
                    this.addFloatingPopup('BRAK KREDYTÓW!', `Wymagane $${config.cost} CC na montaż!`, pos.x, pos.y, '#f87171');
                } else if (buildState.selectedBuilding === 'geothermal') {
                    const worldX = (gx + 1) * this.tileSize;
                    const worldY = (gy + 1) * this.tileSize;
                    const crater = this.thermalCraters.getCraterAt(worldX, worldY, 64);
                    this.soundSystem.playCleanDing(0);
                    if (!crater) {
                        this.addFloatingPopup('WYMAGA KRATERU!', 'Generator Geotermalny (+80 kW) można postawić tylko na kraterze!', pos.x, pos.y, '#f59e0b');
                    } else if (!crater.isDiscovered) {
                        this.addFloatingPopup('KRATER ZASYPANY PYŁEM!', `Oczyść pył z centrum krateru (${Math.round(crater.cleanPct)}% / 65%), aby umożliwić montaż!`, pos.x, pos.y, '#fbbf24');
                    } else {
                        this.addFloatingPopup('MIEJSCE ZAJĘTE!', 'To pole jest zajęte przez inną strukturę.', pos.x, pos.y, '#ef4444');
                    }
                }
            }
            return;
        }

        // Interakcja ze strukturami poza trybem budowania (np. Przełączanie silosów)
        const { gx, gy } = this.gridSystem.worldToGrid(pos.x, pos.y);
        const clickedBuilding = this.gridSystem.getBuildingAt(gx, gy);
        if (clickedBuilding && clickedBuilding.type === 'silo') {
            const silo = clickedBuilding as SiloBuilding;
            silo.acceptsBots = !silo.acceptsBots;
            this.soundSystem.playCleanDing(silo.acceptsBots ? 2 : 0);
            this.addFloatingPopup(
                silo.acceptsBots ? '🤖 PRZYJMUJE ZRZUTY BOTÓW' : '🚫 ZRZUTY WYŁĄCZONE',
                silo.acceptsBots ? 'Sweep-Boty mogą zrzucać urobek do tego silosu' : 'Sweep-Boty ignorują ten silos',
                (silo.gridX + 1) * this.tileSize,
                (silo.gridY + 1) * this.tileSize,
                silo.acceptsBots ? '#38bdf8' : '#f87171'
            );
            return;
        }
    }

    private handleContextMenu(pos: { x: number; y: number }): void {
        const buildState = this.getBuildState?.();
        // SAFEGUARD: Only demolish buildings if in BUILD mode or if a building is selected!
        // In CLEAN mode, right click NEVER accidentally removes player's buildings!
        if (buildState && !buildState.isBuildMode && !buildState.selectedBuilding) {
            return;
        }

        const { gx, gy } = this.gridSystem.worldToGrid(pos.x, pos.y);
        const building = this.gridSystem.getBuildingAt(gx, gy);
        if (building) {
            const config = BUILDING_CONFIGS[building.type];
            const costRefund = config?.cost ?? 0;
            const removed = this.gridSystem.removeBuilding(gx, gy);
            if (removed) {
                if (costRefund > 0) {
                    this.pendingSimCredits += costRefund;
                    this.addFloatingPopup(`+$${costRefund}`, `DEMONTAŻ: ${config.name}`, (gx + 0.5) * this.tileSize, (gy + 0.5) * this.tileSize, '#34d399');
                }
                this.soundSystem.playBuildingPlace();
                this.spawnParticles((gx + 0.5) * this.tileSize, (gy + 0.5) * this.tileSize, 8);
                this.networkSync?.broadcastBuildingRemoved(gx, gy);
            }
        }
    }

    private handleRightMouseDrag(pos: { x: number; y: number }): void {
        this.handleContextMenu(pos);
    }

    private handleMouseUp(pos: { x: number; y: number }): void {
        this.lastCursorSweepPos = null;

        // Finish Drag-to-build if conveyor was active (Krok 6.1)
        if (this.inputManager.isDraggingConveyor && this.inputManager.dragStartPos) {
            const buildState = this.getBuildState?.();
            const currentGrid = this.gridSystem.worldToGrid(pos.x, pos.y);
            const path = this.gridSystem.getDragPath(this.inputManager.dragStartPos.gx, this.inputManager.dragStartPos.gy, currentGrid.gx, currentGrid.gy);

            let placedAny = false;
            for (const node of path) {
                if (this.gridSystem.canPlace('conveyor', node.gx, node.gy)) {
                    const cost = BUILDING_CONFIGS['conveyor'].cost;
                    if ((buildState?.credits ?? 0) >= cost) {
                        const placed = this.gridSystem.placeBuilding('conveyor', node.gx, node.gy, node.dir);
                        if (placed) {
                            placedAny = true;
                            this.onBuildPlaced?.('conveyor', cost);
                            this.spawnParticles((node.gx + 0.5) * this.tileSize, (node.gy + 0.5) * this.tileSize, 4);
                            this.networkSync?.broadcastBuildingPlaced('conveyor', node.gx, node.gy, node.dir);
                        }
                    }
                }
            }

            if (placedAny) {
                this.soundSystem.playBuildingPlace();
            }

            this.inputManager.endConveyorDrag();
            this.gridSystem.ghostContainer.visible = false;
        }
    }

    public toggleAltMode(): void {
        this.isAltMode = !this.isAltMode;
        this.gridSystem.updateAltMode(this.isAltMode, true, this.simulationLoop);
        this.sectorManager?.setAltMode(this.isAltMode);
        const isBuilding = !!this.getBuildState?.()?.selectedBuilding;
        this.buildingGridGfx.visible = isBuilding || this.isAltMode;
        this.onAltModeToggled?.(this.isAltMode);
    }

    public toggleDevSweepMode(): void {
        this.isDevSweepMode = !this.isDevSweepMode;
        this.onDevSweepToggled?.(this.isDevSweepMode);
        console.log(`[GameEngine] DEV SWEEP MODE [F9]: ${this.isDevSweepMode ? 'ON' : 'OFF'}`);
    }

    public toggleCruiseControl(forceState?: boolean): boolean {
        const playerStore = usePlayerStore();
        const newState = playerStore.toggleCruiseControl(forceState);
        this.player.cruiseControl = newState;
        return newState;
    }

    public handlePipette(): void {
        const mouseWorldPos = this.inputManager.getMouseWorldPos();
        const { gx, gy } = this.gridSystem.worldToGrid(mouseWorldPos.x, mouseWorldPos.y);
        const b = this.gridSystem.getBuildingAt(gx, gy);
        if (b) {
            this.soundSystem.playBuildingPlace();
            this.onPipettePick?.(b.type, b.direction);
        } else {
            this.onPipettePick?.(null, 'E');
        }
    }

    private renderShieldDomes(domes: ShieldDome[], dt: number): void {
        this.shieldDomesGfx.clear();
        if (domes.length === 0) return;

        this.shieldAnimTimer += dt * 2.0;

        for (const dome of domes) {
            if (!dome.active) continue;

            const pulse = Math.sin(this.shieldAnimTimer) * 0.04;
            // High-tech translucent forcefield bubble
            this.shieldDomesGfx.circle(dome.x, dome.y, dome.radius)
                .fill({ color: 0x06b6d4, alpha: 0.12 + pulse })
                .stroke({ width: 2.5, color: 0x38bdf8, alpha: 0.65 + pulse * 2 });

            // Inner harmonic ripple
            const innerRadius = (dome.radius * 0.6) + Math.sin(this.shieldAnimTimer * 1.5) * 15;
            this.shieldDomesGfx.circle(dome.x, dome.y, innerRadius)
                .stroke({ width: 1.2, color: 0x67e8f9, alpha: 0.35 + pulse });

            // Outer electrostatic edge
            this.shieldDomesGfx.circle(dome.x, dome.y, dome.radius + 4)
                .stroke({ width: 1, color: 0x0284c7, alpha: 0.4 });
        }
    }

    public spawnCelebrationParticles(x: number, y: number, count: number = 35): void {
        this.fxManager.spawnCelebrationParticles(x, y, count);
    }

    private handleResize(): void {
        if (!this.app.renderer) return;
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        this.app.renderer.resize(width, height);
        this.viewport.resize(width, height);
    }

    public destroy(): void {
        this.isRunning = false;

        window.removeEventListener('resize', this.boundOnResize);
        window.removeEventListener('venus-toggle-cruise', this.boundOnToggleCruise);

        this.inputManager?.destroy();
        this.atmosphere?.destroy();
        this.fxManager?.destroy();

        this.app.ticker.remove(this.update, this);

        if (this.networkSync) {
            this.networkSync.destroy();
        }

        for (const bot of this.bots) bot.destroy();
        this.bots = [];

        if (this.muleBot) {
            this.muleBot.destroy();
        }

        for (const popup of this.floatingPopups) popup.container.destroy({ children: true });
        this.floatingPopups = [];

        this.cursorBrushIndicator.destroy();
        this.playerBrushIndicator.destroy();
        this.rhombusEffectGfx.destroy();
        this.shieldDomesGfx.destroy();
        this.powerCablesGfx.destroy();
        if (this.activeDropPod) {
            this.activeDropPod.destroy();
            this.activeDropPod = null;
        }
        this.sectorManager.destroy();
        this.thermalCraters.destroy();
        this.archaeology.destroy();
        this.baseDepot.destroy();
        this.gridSystem.destroy();
        this.simulationLoop.destroy();
        this.dirtSystem.destroy();
        this.player.destroy();
        this.app.destroy(true, { children: true, texture: true });
    }
}
