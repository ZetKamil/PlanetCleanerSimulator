import { Container, Graphics } from 'pixi.js';
import { PRNG } from './PRNG';
import { SimplexNoise } from './SimplexNoise';
import { WorldConfig, getWorldConfig } from './WorldConfig';
import { ThermalCrater, ThermalCraterConfig } from '../hazards/ThermalCraterSystem';
import { VeneraRelic, VENERA_RELIC_TEMPLATES } from '../archaeology/VeneraArchaeologySystem';

export interface GeneratedWorldTerrain {
    container: Container;
    groundGraphics: Graphics;
    craters: ThermalCrater[];
    relics: VeneraRelic[];
    isBedrock(x: number, y: number): boolean;
    getBedrockDensity(x: number, y: number): number;
}

/**
 * 4-Layer Procedural Terrain Generator for Venus:
 * - Layer 1: Base Basalt Sand Plain (rich warm copper-terracotta desert matching background.jpg, without baked holes or lava)
 * - Layer 2: Yellow/Gold Pebbles & Boulders (giving 3D tactile depth via directional drop shadows)
 * - Layer 3: Dark Volcanic Rock Zones (organic Simplex noise bedrock biomes)
 * - Layer 4: Procedural Craters & Volcanoes:
 *     - HOT CALDERAS: Molten glowing lava lakes emitting high thermal hazard.
 *     - COLD BASALT PITS: Extinguished deep rocky hollows with ZERO lava and ZERO heat hazard.
 */
export class WorldTerrainGenerator {
    private config: WorldConfig;
    private prng: PRNG;
    private bedrockNoise: SimplexNoise;
    private duneNoise: SimplexNoise;
    private detailNoise: SimplexNoise;

    constructor(config?: WorldConfig) {
        this.config = config ?? getWorldConfig();
        this.prng = new PRNG(this.config.seed);
        this.bedrockNoise = new SimplexNoise(this.config.seed + 101);
        this.duneNoise = new SimplexNoise(this.config.seed + 202);
        this.detailNoise = new SimplexNoise(this.config.seed + 303);
    }

    /**
     * Checks whether point (x, y) is located on Layer 3 dark volcanic bedrock.
     */
    public isBedrock(x: number, y: number): boolean {
        if (!this.config.bedrock.enabled) return false;
        return this.getBedrockDensity(x, y) >= this.config.bedrock.coverageThreshold;
    }

    /**
     * Returns normalized bedrock density [0.0 - 1.0] at (x, y).
     * Implements the 4-Ring Radial Danger & Progression Gradient (Valheim/Factorio model):
     * - Zone 0 (0 to safeRadius ~750px): 100% pure terracotta sand oasis (density = 0).
     * - Zone 1 (750 to 1750px): Transitional rocky shelves and sparse basalt islands.
     * - Zone 2 (1750 to 2650px): Solid volcanic bedrock biomes.
     * - Zone 3 (> 2650px): Massive deep core basalt continents extending to the world perimeter.
     */
    public getBedrockDensity(x: number, y: number): number {
        const centerX = this.config.worldWidth / 2;
        const centerY = this.config.worldHeight / 2;
        const distFromCenter = Math.hypot(x - centerX, y - centerY);

        const safeRadius = this.config.rings.safeRadius;
        if (distFromCenter < safeRadius) {
            return 0; // Strefa 0: Czysta oaza piaskowa bez skał bazaltowych
        }

        // Simplex fractal noise
        const n = this.bedrockNoise.fbm(
            x * this.config.bedrock.noiseScale,
            y * this.config.bedrock.noiseScale,
            this.config.bedrock.octaves
        );

        // Base noise normalized to [0, 1]
        const baseDensity = (n + 1) * 0.5;

        // Radial factor: increases smoothly from safeRadius (0.0) up to world boundary (1.0)
        // Outer rim has much denser, contiguous basalt continents
        const maxDist = Math.hypot(centerX, centerY);
        const radialProgress = Math.min(1, Math.max(0, (distFromCenter - safeRadius) / (maxDist - safeRadius)));

        // Modulate density: closer to center, density is lower (more sparse islands/shelves)
        // At outer rim, density is high (massive solid basalt continents)
        const densityMultiplier = 0.52 + (radialProgress * 0.76);
        let density = baseDensity * densityMultiplier;

        // Smooth transition at boundary of safe zone (750 to 950 px)
        if (distFromCenter < safeRadius + 200) {
            const t = (distFromCenter - safeRadius) / 200;
            density *= t;
        }

        return Math.max(0, Math.min(1, density));
    }

    /**
     * Executes the generation pipeline and renders Layers 1, 2, 3 into a persistent Graphics container,
     * and produces Layer 4 ThermalCrater objects.
     */
    public generate(parentContainer?: Container): GeneratedWorldTerrain {
        this.prng.reset();

        const terrainContainer = new Container();
        terrainContainer.label = 'procedural-terrain-container';

        const groundGfx = new Graphics();
        terrainContainer.addChild(groundGfx);

        // 1. Layer 1: Base Basalt Sand Plain (Rich warm copper/terracotta desert from background.jpg)
        this.renderLayer1Sand(groundGfx);

        // 2. Layer 3: Dark Volcanic Rock Zones (Smooth organic Marching Squares basalt plateaus)
        if (this.config.bedrock.enabled) {
            this.renderLayer3Bedrock(groundGfx);
        }

        // 3. Layer 4: Procedural Craters & Volcanoes (both Hot Calderas with Magma Fissures and Cold Basalt Pits)
        const craters = this.generateLayer4Craters();

        // 4. Ambient Thermal Heat Glow in ground layer around hot calderas
        for (const crater of craters) {
            if (crater.hasLava) {
                groundGfx.circle(crater.x, crater.y, crater.radius * 1.85)
                    .fill({ color: 0xea580c, alpha: 0.09 });
                groundGfx.circle(crater.x, crater.y, crater.radius * 1.30)
                    .fill({ color: 0xf97316, alpha: 0.07 });
            }
        }

        // 5. Layer 2: Natural Angular Rock Shards & Boulders (with 3D directional drop shadows)
        if (this.config.pebbles.enabled) {
            this.renderLayer2Pebbles(groundGfx);
        }

        // 6. Procedural Venera & Historical Relics (Fixed count, dispersed across planet)
        const relics = this.generateRelics(craters);

        if (parentContainer) {
            parentContainer.addChildAt(terrainContainer, 0);
        }

        return {
            container: terrainContainer,
            groundGraphics: groundGfx,
            craters,
            relics,
            isBedrock: (x, y) => this.isBedrock(x, y),
            getBedrockDensity: (x, y) => this.getBedrockDensity(x, y),
        };
    }

    /**
     * LAYER 1: Base Basalt Sand Plain.
     * Recreates the rich, vibrant copper-terracotta planetary desert of background.jpg:
     * - Deep warm terracotta base fill (#9e441c)
     * - Painterly broad atmospheric tonal clouds and sweeping dune bands
     * - Smooth ambient lighting without blocky steps
     */
    private renderLayer1Sand(gfx: Graphics): void {
        const W = this.config.worldWidth;
        const H = this.config.worldHeight;

        // 1. Base uniform rich copper desert fill (sampled directly from background.jpg)
        gfx.rect(0, 0, W, H).fill({ color: this.config.sand.baseColor });

        // 2. Broad painterly atmospheric cloud washes (simulating dense Venusian atmosphere & elevation)
        const washCount = 16;
        for (let i = 0; i < washCount; i++) {
            const wx = this.prng.range(100, W - 100);
            const wy = this.prng.range(100, H - 100);
            const wr = this.prng.range(350, 750);
            const isWarm = this.prng.next() > 0.45;
            const washColor = isWarm ? this.config.sand.duneColor : this.config.sand.duneShadowColor;
            const washAlpha = 0.06 + this.prng.next() * 0.05;
            gfx.circle(wx, wy, wr).fill({ color: washColor, alpha: washAlpha });
        }

        // 3. Smooth sweeping wind-blown dune bands (angled along prevailing ~35° Venus winds)
        const windAngle = 0.62;
        const cosW = Math.cos(windAngle);
        const sinW = Math.sin(windAngle);
        const perpX = -sinW;
        const perpY = cosW;

        // Draw smooth diagonal dune ribbons across the map
        const ribbonSpacing = 160;
        const diagExtent = W + H;
        for (let d = -H; d < diagExtent; d += ribbonSpacing) {
            const startX = d * cosW;
            const startY = d * sinW;
            const ribbonPoints: number[] = [];
            const steps = 30;
            const len = Math.max(W, H) * 1.5;

            for (let s = 0; s <= steps; s++) {
                const t = (s / steps) * len;
                const baseX = startX + t * perpX;
                const baseY = startY + t * perpY;

                // Organic wave displacement from dune noise
                const wave = this.duneNoise.noise2D(baseX * 0.0012, baseY * 0.0012) * 55;
                const px = baseX + cosW * wave;
                const py = baseY + sinW * wave;
                ribbonPoints.push(px, py);
            }

            if (ribbonPoints.length >= 4) {
                gfx.moveTo(ribbonPoints[0], ribbonPoints[1]);
                for (let i = 2; i < ribbonPoints.length; i += 2) {
                    gfx.lineTo(ribbonPoints[i], ribbonPoints[i + 1]);
                }
                gfx.stroke({
                    width: 38,
                    color: this.config.sand.duneColor,
                    alpha: 0.08,
                });
            }
        }
    }

    /**
     * LAYER 3: Dark Volcanic Rock Zones (Bedrock Biomes).
     * Procedural organic basalt plateaus generated using sub-pixel Marching Squares.
     * Produces smooth, painterly vector curves (NO square pixel staircases!), perfectly matching
     * the dark basalt plateaus from background.jpg.
     */
    private renderLayer3Bedrock(gfx: Graphics): void {
        const W = this.config.worldWidth;
        const H = this.config.worldHeight;
        const S = 24; // Sub-pixel sampling step for silky smooth organic contours
        const cols = Math.ceil(W / S);
        const rows = Math.ceil(H / S);
        const threshold = this.config.bedrock.coverageThreshold;

        // 1. Precompute density field grid for fast, gapless interpolation
        const grid: number[][] = [];
        for (let r = 0; r <= rows; r++) {
            grid[r] = [];
            const y = Math.min(H, r * S);
            for (let c = 0; c <= cols; c++) {
                const x = Math.min(W, c * S);
                grid[r][c] = this.getBedrockDensity(x, y);
            }
        }

        // 2. Marching Squares contour renderer with linear edge interpolation
        const renderMarchingTier = (
            isoVal: number,
            color: number,
            alpha: number,
            drawEdgeStroke: boolean = false
        ) => {
            for (let r = 0; r < rows; r++) {
                const y = r * S;
                const yNext = Math.min(H, (r + 1) * S);
                const cellH = yNext - y;

                for (let c = 0; c < cols; c++) {
                    const x = c * S;
                    const xNext = Math.min(W, (c + 1) * S);
                    const cellW = xNext - x;

                    const v0 = grid[r][c];         // Top-Left
                    const v1 = grid[r][c + 1];     // Top-Right
                    const v2 = grid[r + 1][c + 1]; // Bottom-Right
                    const v3 = grid[r + 1][c];     // Bottom-Left

                    const code = (v0 >= isoVal ? 1 : 0)
                        | (v1 >= isoVal ? 2 : 0)
                        | (v2 >= isoVal ? 4 : 0)
                        | (v3 >= isoVal ? 8 : 0);

                    if (code === 0) continue;

                    // Fully solid cell
                    if (code === 15) {
                        gfx.rect(x, y, cellW, cellH).fill({ color, alpha });
                        continue;
                    }

                    // Linear interpolation on cell edges
                    const t01 = (v1 !== v0) ? (isoVal - v0) / (v1 - v0) : 0.5;
                    const t12 = (v2 !== v1) ? (isoVal - v1) / (v2 - v1) : 0.5;
                    const t32 = (v2 !== v3) ? (isoVal - v3) / (v2 - v3) : 0.5;
                    const t03 = (v3 !== v0) ? (isoVal - v0) / (v3 - v0) : 0.5;

                    const e0 = { x: x + Math.max(0, Math.min(1, t01)) * cellW, y };
                    const e1 = { x: xNext, y: y + Math.max(0, Math.min(1, t12)) * cellH };
                    const e2 = { x: x + Math.max(0, Math.min(1, t32)) * cellW, y: yNext };
                    const e3 = { x, y: y + Math.max(0, Math.min(1, t03)) * cellH };

                    const TL = { x, y };
                    const TR = { x: xNext, y };
                    const BR = { x: xNext, y: yNext };
                    const BL = { x, y: yNext };

                    const drawPoly = (pts: { x: number; y: number }[]) => {
                        const flat: number[] = [];
                        for (const p of pts) flat.push(p.x, p.y);
                        gfx.poly(flat, true).fill({ color, alpha });
                    };

                    const drawStrokeLine = (pA: { x: number; y: number }, pB: { x: number; y: number }) => {
                        if (drawEdgeStroke) {
                            gfx.moveTo(pA.x, pA.y).lineTo(pB.x, pB.y)
                                .stroke({ width: 2.2, color: 0x160e0a, alpha: 0.62 });
                        }
                    };

                    switch (code) {
                        case 1: // TL
                            drawPoly([TL, e0, e3]);
                            drawStrokeLine(e0, e3);
                            break;
                        case 2: // TR
                            drawPoly([TR, e1, e0]);
                            drawStrokeLine(e1, e0);
                            break;
                        case 3: // TL + TR
                            drawPoly([TL, TR, e1, e3]);
                            drawStrokeLine(e1, e3);
                            break;
                        case 4: // BR
                            drawPoly([BR, e2, e1]);
                            drawStrokeLine(e2, e1);
                            break;
                        case 5: // TL + BR (saddle)
                            drawPoly([TL, e0, e3]);
                            drawPoly([BR, e2, e1]);
                            drawStrokeLine(e0, e3);
                            drawStrokeLine(e2, e1);
                            break;
                        case 6: // TR + BR
                            drawPoly([TR, BR, e2, e0]);
                            drawStrokeLine(e2, e0);
                            break;
                        case 7: // TL + TR + BR
                            drawPoly([TL, TR, BR, e2, e3]);
                            drawStrokeLine(e2, e3);
                            break;
                        case 8: // BL
                            drawPoly([BL, e3, e2]);
                            drawStrokeLine(e3, e2);
                            break;
                        case 9: // TL + BL
                            drawPoly([TL, e0, e2, BL]);
                            drawStrokeLine(e0, e2);
                            break;
                        case 10: // TR + BL (saddle)
                            drawPoly([TR, e1, e0]);
                            drawPoly([BL, e3, e2]);
                            drawStrokeLine(e1, e0);
                            drawStrokeLine(e3, e2);
                            break;
                        case 11: // TL + TR + BL
                            drawPoly([TL, TR, e1, e2, BL]);
                            drawStrokeLine(e1, e2);
                            break;
                        case 12: // BR + BL
                            drawPoly([e1, BR, BL, e3]);
                            drawStrokeLine(e1, e3);
                            break;
                        case 13: // TL + BR + BL
                            drawPoly([TL, e0, e1, BR, BL]);
                            drawStrokeLine(e0, e1);
                            break;
                        case 14: // TR + BR + BL
                            drawPoly([e0, TR, BR, BL, e3]);
                            drawStrokeLine(e0, e3);
                            break;
                    }
                }
            }
        };

        // Tier 1: Outer transitional basalt shelf (with dark natural edge stroke)
        renderMarchingTier(threshold, this.config.bedrock.shelfColor, 0.88, true);

        // Tier 2: Solid volcanic bedrock
        renderMarchingTier(threshold + 0.08, this.config.bedrock.bedrockColor, 0.94, false);

        // Tier 3: Deepest basalt core plateau
        renderMarchingTier(threshold + 0.18, this.config.bedrock.coreColor, 0.98, false);

        // 3. Natural eroded edge stipples & micro basalt gravel along the plateau margins
        // Matching the stippling texture seen on the edges of the dark rock in background.jpg
        for (let r = 0; r < rows; r += 2) {
            for (let c = 0; c < cols; c += 2) {
                const val = grid[r][c];
                // Points sitting right on the transition zone
                if (val >= threshold - 0.04 && val <= threshold + 0.08) {
                    const gx = c * S + (this.detailNoise.noise2D(c * 0.1, r * 0.1) * S * 0.5);
                    const gy = r * S + (this.detailNoise.noise2D(r * 0.1, c * 0.1) * S * 0.5);
                    const dotRadius = 1.5 + Math.abs(this.detailNoise.noise2D(gx * 0.05, gy * 0.05)) * 2.5;
                    gfx.circle(gx, gy, dotRadius).fill({ color: 0x1a120e, alpha: 0.55 });
                }
            }
        }
    }

    /**
     * LAYER 2: Natural Angular Rock Shards & Boulders.
     * Scattered polygonal stones with directional drop shadows providing tactile 3D depth,
     * faithfully reproducing the slate and terracotta rock chips from background.jpg.
     */
    private renderLayer2Pebbles(gfx: Graphics): void {
        const W = this.config.worldWidth;
        const H = this.config.worldHeight;
        const areaRatio = (W * H) / (1000 * 1000);
        const totalClusters = Math.floor(this.config.pebbles.clusterDensity * areaRatio);

        const centerX = W / 2;
        const centerY = H / 2;
        const depotSafeRadius = 240;

        for (let c = 0; c < totalClusters; c++) {
            const clusterX = this.prng.range(60, W - 60);
            const clusterY = this.prng.range(60, H - 60);

            // Avoid cluttering inside depot building
            if (Math.hypot(clusterX - centerX, clusterY - centerY) < depotSafeRadius) {
                continue;
            }

            const stonesInCluster = this.prng.int(
                this.config.pebbles.minClusterSize,
                this.config.pebbles.maxClusterSize
            );

            for (let s = 0; s < stonesInCluster; s++) {
                const offsetX = (s === 0) ? 0 : this.prng.range(-38, 38);
                const offsetY = (s === 0) ? 0 : this.prng.range(-30, 30);
                const px = clusterX + offsetX;
                const py = clusterY + offsetY;

                if (px < 20 || px > W - 20 || py < 20 || py > H - 20) continue;

                // Base stone radius: 3px (pebble chip) to 16px (boulder)
                const baseRadius = this.prng.range(3, 16);
                const vertexCount = this.prng.int(3, 6); // Triangular shard to hexagon

                const angles: number[] = [];
                for (let v = 0; v < vertexCount; v++) {
                    angles.push((v / vertexCount) * Math.PI * 2 + this.prng.range(-0.32, 0.32));
                }
                angles.sort((a, b) => a - b);

                const polyPoints: number[] = [];
                const shadowPoints: number[] = [];
                const sx = this.config.pebbles.shadowOffsetX;
                const sy = this.config.pebbles.shadowOffsetY;

                for (let v = 0; v < vertexCount; v++) {
                    const rad = baseRadius * this.prng.range(0.72, 1.28);
                    const vx = px + Math.cos(angles[v]) * rad;
                    const vy = py + Math.sin(angles[v]) * (rad * 0.82); // Perspective tilt
                    polyPoints.push(vx, vy);
                    shadowPoints.push(vx + sx, vy + sy);
                }

                const color = this.prng.choice(this.config.pebbles.colors);

                // 1. Directional drop shadow (simulating overhead sunlight)
                gfx.poly(shadowPoints, true).fill({
                    color: this.config.pebbles.shadowColor,
                    alpha: this.config.pebbles.shadowAlpha,
                });

                // 2. Main angular stone body facet
                gfx.poly(polyPoints, true).fill({ color, alpha: 1.0 });

                // 3. Top-edge highlight facet (light catching the northern/NW facet)
                if (baseRadius > 5 && polyPoints.length >= 6) {
                    gfx.moveTo(polyPoints[0], polyPoints[1])
                        .lineTo(polyPoints[2], polyPoints[3])
                        .stroke({
                            width: 1.2,
                            color: this.config.pebbles.highlightColor,
                            alpha: 0.65,
                        });
                }
            }
        }
    }

    /**
     * LAYER 4: Procedural Craters & Volcanoes.
     * Generates a Valheim-style 4-Ring Radial Danger & Reward Gradient:
     * - Zone 0 (0-750px): 100% safe golden sand oasis around Base Depot (0 craters).
     * - Zone 1 (750-1750px): 100% Cold Basalt Pits (+50 kW geothermal yield, ZERO lava, ZERO heat hazard).
     * - Zone 2 (1750-2650px): Active Vents & Small Calderas (+80 kW yield, moderate heat 680-760°C, 3-4 fissures).
     * - Zone 3 (>2650px): Giant Megacalderas (+150 kW supercharged yield, extreme heat 900-960°C, extensive fissures).
     */
    public generateLayer4Craters(): ThermalCrater[] {
        if (!this.config.craters.enabled) {
            return [];
        }

        const W = this.config.worldWidth;
        const H = this.config.worldHeight;
        const centerX = W / 2;
        const centerY = H / 2;
        const maxRadius = Math.min(W, H) / 2 - 200; // ~2872 px

        const targetCount = this.prng.int(
            this.config.craters.minCount,
            this.config.craters.maxCount
        );

        const craters: ThermalCrater[] = [];
        const maxAttempts = targetCount * 90;
        let attempts = 0;

        const coldPitNames = [
            'Niecka Danilova',
            'Zapadlisko Meitner',
            'Lej Ganis Chasma',
            'Niecka Golubkina',
            'Lej Sejsmiczny Baltis Vallis',
            'Niecka Impaktowa Aphrodite',
            'Zapadlisko Sedna',
            'Niecka Eistla',
        ];

        const activeVentNames = [
            'Komin Lawowy Sif Mons',
            'Otwór Termiczny Theia',
            'Kocioł Diana Chasma',
            'Komin Lawowy Gula',
            'Otwór Termiczny Sacajawea',
            'Kocioł Wulkaniczny Colette',
            'Komin Magmowy Lakshmi',
            'Otwór Lawowy Atalanta',
        ];

        const megaCalderaNames = [
            'Megakaldera Maat Mons',
            'Kocioł Piekielny Cleopatra',
            'Megakaldera Ishtar Terra',
            'Megakaldera Mead',
            'Otchłań Magmowa Maxwell Montes',
            'Megakaldera Ovda Regio',
            'Wulkaniczna Czeluść Artemis',
            'Megakaldera Beta Regio',
        ];

        const extinctR = this.config.rings.extinctRadius; // 1750 px
        const activeR = this.config.rings.activeRadius;   // 2650 px

        while (craters.length < targetCount && attempts < maxAttempts) {
            attempts++;

            // Uniform polar coordinate sampling across concentric rings
            const angle = this.prng.range(0, Math.PI * 2);
            const dist = this.prng.range(this.config.rings.safeRadius + 60, maxRadius);
            const x = Math.round(centerX + Math.cos(angle) * dist);
            const y = Math.round(centerY + Math.sin(angle) * dist);

            const margin = 180;
            if (x < margin || x > W - margin || y < margin || y > H - margin) {
                continue;
            }

            // Constraint 1: MUST be located on Layer 3 Dark Volcanic Bedrock!
            if (!this.isBedrock(x, y)) {
                continue;
            }

            // Constraint 2: Minimum spatial distance from already placed craters
            let tooClose = false;
            for (const existing of craters) {
                const d = Math.hypot(x - existing.x, y - existing.y);
                if (d < this.config.craters.minDistance) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            // =========================================================================
            // 4-RING RADIAL DANGER & REWARD CLASSIFICATION (VALHEIM MODEL)
            // =========================================================================
            let type: 'caldera' | 'pit';
            let hasLava: boolean;
            let radius: number;
            let peakTemp: number;
            let heatRate: number;
            let yieldKW: number;
            let name: string;
            let description: string;

            if (dist < extinctR) {
                // ZONE 1: EXTINCT BASALT TERRACES (750 - 1750 px)
                // 100% Safe Cold Pits (+50 kW geothermal heat, ZERO lava, ZERO heat hazard)
                type = 'pit';
                hasLava = false;
                radius = this.prng.range(50, 95);
                peakTemp = 460;
                heatRate = 0.0;
                yieldKW = 50;
                name = coldPitNames[craters.length % coldPitNames.length];
                description = 'Wygasła niecka bazaltowa w strefie przejściowej. Brak powierzchniowej lawy, bezpieczne głębinowe ciepło (+50 kW).';
            } else if (dist < activeR) {
                // ZONE 2: ACTIVE VENTS & SMALL CALDERAS (1750 - 2650 px)
                // Moderate active calderas (+80 kW yield, moderate heat ~720°C, 3-4 fissures)
                type = 'caldera';
                hasLava = true;
                radius = this.prng.range(55, 95);
                peakTemp = this.prng.int(680, 760);
                heatRate = 0.16;
                yieldKW = 80;
                name = activeVentNames[craters.length % activeVentNames.length];
                description = 'Aktywny komin wulkaniczny z odsłoniętą lawą. Umiarkowane ryzyko termiczne, stabilna moc geotermalna (+80 kW).';
            } else {
                // ZONE 3: HELLISH MAGMA ABYSSES (SKRAJ MAPY > 2650 px)
                // Giant boiling calderas (+150 kW supercharged yield, extreme heat 900-960°C, extensive fissures)
                type = 'caldera';
                hasLava = true;
                radius = this.prng.range(135, 215);
                peakTemp = this.prng.int(900, 960);
                heatRate = 0.24;
                yieldKW = 150;
                name = megaCalderaNames[craters.length % megaCalderaNames.length];
                description = 'Potężna megakaldera wulkaniczna na skraju świata! Ekstremalny żar 900°C+ i gigantyczny potencjał geotermalny (+150 kW)!';
            }

            const id = `CRATER-${String(craters.length + 1).padStart(2, '0')}`;

            const craterConfig: ThermalCraterConfig = {
                id,
                name,
                x,
                y,
                radius: Math.round(radius),
                hasLava,
                peakTemp,
                heatRate,
                coolingRate: this.config.craters.defaultCoolingRate,
                isVolcanicActive: true,
                type,
                description,
                yieldKW,
            };

            craters.push(new ThermalCrater(craterConfig));
        }

        return craters;
    }

    /**
     * Proceduralny generator reliktów i sond Venera / Vega.
     * Zasada projektowa: Mamy określoną, stałą ilość historycznych znajdziek (6).
     * Im większa mapa (np. 4096, 8192 px), tym szerzej są rozrzucone i trzeba ich dłużej szukać.
     * Znajdźki nie pojawiają się wewnątrz bazy ani we wrzącej lawie kraterów.
     */
    public generateRelics(existingCraters: ThermalCrater[] = []): VeneraRelic[] {
        const W = this.config.worldWidth;
        const H = this.config.worldHeight;
        const centerX = W / 2;
        const centerY = H / 2;
        const baseSafeRadius = 380;

        const relics: VeneraRelic[] = [];
        // Odstęp między znajdźkami skalowany wielkością świata
        const minDistance = Math.min(W, H) / 3.4;

        for (const template of VENERA_RELIC_TEMPLATES) {
            let placed = false;
            let attempts = 0;
            const maxAttempts = 150;

            while (!placed && attempts < maxAttempts) {
                attempts++;
                const margin = 160;
                const x = Math.round(this.prng.range(margin, W - margin));
                const y = Math.round(this.prng.range(margin, H - margin));

                // 1. Z dala od startowego Base Depot
                if (Math.hypot(x - centerX, y - centerY) < baseSafeRadius) {
                    continue;
                }

                // 2. Nie mogą wpaść do kaldery z wrzącą lawą (zniszczenie kapsuły!)
                let inLava = false;
                for (const cr of existingCraters) {
                    if (cr.hasLava && Math.hypot(x - cr.x, y - cr.y) < cr.radius + 40) {
                        inLava = true;
                        break;
                    }
                }
                if (inLava) continue;

                // 3. Odpowiedni dystans od pozostałych znajdziek
                const requiredDist = attempts > 70 ? minDistance * 0.55 : minDistance;
                let tooClose = false;
                for (const other of relics) {
                    if (Math.hypot(x - other.x, y - other.y) < requiredDist) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;

                relics.push({
                    ...template,
                    x,
                    y,
                    isUncovered: false,
                    isAnalyzed: false,
                });
                placed = true;
            }

            // Fallback w razie ciasnego rozmieszczenia
            if (!placed) {
                const angle = (relics.length / VENERA_RELIC_TEMPLATES.length) * Math.PI * 2;
                const dist = Math.min(W, H) * 0.35;
                relics.push({
                    ...template,
                    x: Math.round(centerX + Math.cos(angle) * dist),
                    y: Math.round(centerY + Math.sin(angle) * dist),
                    isUncovered: false,
                    isAnalyzed: false,
                });
            }
        }

        return relics;
    }
}
