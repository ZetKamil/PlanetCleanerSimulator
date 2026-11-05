/**
 * Configuration schema for the procedural Venus world generator.
 * Provides fine-grained control over world dimensions, seed, terrain layers,
 * rock formations, bedrock biome coverage, and thermal crater distribution.
 * Colors and textures are sampled directly from the designer's background.jpg.
 */

export interface WorldRingConfig {
    /** Zone 0: Safe Oasis radius in pixels around Base Depot (0 to safeRadius) */
    safeRadius: number;
    /** Zone 1: Extinct Terraces / Cold Basalt Pits boundary (safeRadius to extinctRadius) */
    extinctRadius: number;
    /** Zone 2: Active Vents & Small Calderas boundary (extinctRadius to activeRadius) */
    activeRadius: number;
    /** Beyond activeRadius: Zone 3 Hellish Magma Abysses (Megakaldery) */
}

export interface TerrainSandConfig {
    /** Primary base color of the rich terracotta/copper basalt desert sand */
    baseColor: number;
    /** Secondary lighter warm dune crest color */
    duneColor: number;
    /** Darker depression/shadow dune color */
    duneShadowColor: number;
    /** Frequency scale of desert sand drifts */
    duneScale: number;
}

export interface TerrainPebbleConfig {
    /** Whether pebbles and boulders are rendered */
    enabled: boolean;
    /** Density: average number of pebble clusters per 1000x1000 pixel area */
    clusterDensity: number;
    /** Minimum and maximum stones per cluster */
    minClusterSize: number;
    maxClusterSize: number;
    /** Palette of warm Venusian rock tones (ochre, amber, golden-brown) */
    colors: number[];
    /** Top directional sun highlight */
    highlightColor: number;
    /** Bottom drop shadow color and alpha for 3D depth */
    shadowColor: number;
    shadowAlpha: number;
    /** Shadow offset vector in pixels (simulating directional Venusian sunlight) */
    shadowOffsetX: number;
    shadowOffsetY: number;
}

export interface TerrainBedrockConfig {
    /** Whether dark volcanic bedrock biomes are generated */
    enabled: boolean;
    /** Noise threshold for bedrock appearance (0.0 to 1.0; e.g. 0.58 gives ~25-30% coverage) */
    coverageThreshold: number;
    /** Macro scale of continental volcanic rock formations */
    noiseScale: number;
    /** Number of fractal noise octaves */
    octaves: number;
    /** Colors from deep basalt core to outer volcanic rim */
    coreColor: number;
    bedrockColor: number;
    shelfColor: number;
    /** Safe radius around Base Depot where dark rock is suppressed */
    baseSafeRadius: number;
}

export interface TerrainCraterConfig {
    /**
     * Master toggle for craters and volcanoes.
     * When false, ALL craters vanish completely from the surface and geothermal plants produce 0 kW!
     */
    enabled: boolean;
    /** Desired number of procedural craters in the world */
    minCount: number;
    maxCount: number;
    /** Radius boundaries for generated craters */
    minRadius: number;
    maxRadius: number;
    /** Minimum spatial distance between any two craters (in pixels) */
    minDistance: number;
    /** Safe radius around Base Depot where craters are prohibited */
    baseSafeRadius: number;
    /** Ratio of craters that have active molten lava (+80 kW geothermal power & heat) vs cold basalt pits */
    lavaRatio: number;
    /** Default thermal parameters for hot lava calderas */
    defaultPeakTemp: number;
    defaultHeatRate: number;
    defaultCoolingRate: number;
    /** Radiating magma fissures (veins) extending from calderas into surrounding basalt */
    fissuresEnabled: boolean;
    minFissuresPerCaldera: number;
    maxFissuresPerCaldera: number;
}

export interface WorldConfig {
    /** World width in pixels (e.g. 6144) */
    worldWidth: number;
    /** World height in pixels (e.g. 6144) */
    worldHeight: number;
    /** Deterministic PRNG seed */
    seed: number;

    /** 4-Ring Radial Danger & Progression Gradient (Valheim/Factorio Model) */
    rings: WorldRingConfig;
    /** Layer 1: Base Basalt Sand Plain */
    sand: TerrainSandConfig;
    /** Layer 2: Yellow/Gold Pebbles & Boulders (giving 3D depth) */
    pebbles: TerrainPebbleConfig;
    /** Layer 3: Dark Volcanic Rock / Bedrock Biomes */
    bedrock: TerrainBedrockConfig;
    /** Layer 4: Procedural Craters & Volcanoes (ONLY on dark rock) */
    craters: TerrainCraterConfig;
}

/**
 * Standard default configuration matching the designer's background.jpg aesthetic:
 * Rich warm copper-terracotta sand, deep basalt formations, and distinct hot vs cold craters.
 */
export const DEFAULT_WORLD_CONFIG: WorldConfig = {
    worldWidth: 6144,
    worldHeight: 6144,
    seed: 42,

    // 4-Ring Radial Danger & Progression Gradient (Valheim/Factorio Model)
    rings: {
        safeRadius: 750,       // Zone 0: Safe golden sand oasis around Base Depot (0-750px)
        extinctRadius: 1750,   // Zone 1: Transitional basalt shelves, cold pits (+50 kW), relics (750-1750px)
        activeRadius: 2650,    // Zone 2: Solid bedrock, active vents & small calderas (+80 kW, moderate heat) (1750-2650px)
        // Beyond activeRadius (> 2650px): Zone 3 Hellish Megacalderas (+150 kW, extreme 950°C heat, magma fissures)
    },

    // Layer 1: Base basalt sand (Ciemny Bazalt Wulkaniczny)
    sand: {
        baseColor: 0x1E222A,       // Głęboki grafitowo-bazaltowy czysty teren
        duneColor: 0x262B35,       // Ciemne grzbiety bazaltowe
        duneShadowColor: 0x171A20, // Głębokie cienie bazaltowe
        duneScale: 0.0016,
    },

    // Layer 2: Natural angular rock shards and boulders (Odcienie bazaltu z jasną krawędzią)
    pebbles: {
        enabled: true,
        clusterDensity: 24,
        minClusterSize: 2,
        maxClusterSize: 6,
        colors: [
            0x14171D,              // Głęboki bazalt
            0x2D333F,              // Grafitowy odłamek skalny
            0x1A1E26,              // Ciemny łupek
            0x242933,              // Bazalt wulkaniczny
        ],
        highlightColor: 0x434C5E,  // Jasna krawędź od góry-lewej
        shadowColor: 0x000000,
        shadowAlpha: 0.55,
        shadowOffsetX: 2,
        shadowOffsetY: 4,
    },

    // Layer 3: Dark volcanic bedrock (organic plateaus from background.jpg)
    bedrock: {
        enabled: true,
        coverageThreshold: 0.56,
        noiseScale: 0.0009,
        octaves: 3,
        coreColor: 0x201a18,       // Deepest basalt plateau core
        bedrockColor: 0x2e2522,    // Solid volcanic rock
        shelfColor: 0x42342c,      // Transitional rocky shelf
        baseSafeRadius: 750,
    },

    // Layer 4: Craters & Volcanoes (with glowing magma fissures)
    craters: {
        enabled: true,
        minCount: 18,
        maxCount: 26,
        minRadius: 50,
        maxRadius: 210,
        minDistance: 320,
        baseSafeRadius: 750,
        lavaRatio: 0.65,           // Zróżnicowane radialnie według pierścieni (strefa 1: 0% lawy, strefa 2: małe kominki, strefa 3: megakaldery)
        defaultPeakTemp: 890,
        defaultHeatRate: 0.20,
        defaultCoolingRate: 0.25,
        fissuresEnabled: true,
        minFissuresPerCaldera: 4,
        maxFissuresPerCaldera: 7,
    },
};

/**
 * Active runtime world configuration singleton.
 */
let activeWorldConfig: WorldConfig = JSON.parse(JSON.stringify(DEFAULT_WORLD_CONFIG));

export function getWorldConfig(): WorldConfig {
    return activeWorldConfig;
}

export function setWorldConfig(newConfig: Partial<WorldConfig>): WorldConfig {
    activeWorldConfig = {
        ...activeWorldConfig,
        ...newConfig,
        rings: { ...activeWorldConfig.rings, ...newConfig.rings },
        sand: { ...activeWorldConfig.sand, ...newConfig.sand },
        pebbles: { ...activeWorldConfig.pebbles, ...newConfig.pebbles },
        bedrock: { ...activeWorldConfig.bedrock, ...newConfig.bedrock },
        craters: { ...activeWorldConfig.craters, ...newConfig.craters },
    };
    return activeWorldConfig;
}

export function resetWorldConfig(): WorldConfig {
    activeWorldConfig = JSON.parse(JSON.stringify(DEFAULT_WORLD_CONFIG));
    return activeWorldConfig;
}
