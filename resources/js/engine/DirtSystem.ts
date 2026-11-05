import { Application, Container, Graphics, RenderTexture, Sprite } from 'pixi.js';
import { DirtMatrix } from '../core/dirt/DirtMatrix';

export interface DirtSystemOptions {
    app: Application;
    worldWidth: number;
    worldHeight: number;
    cellSize?: number; // 2px per cell = 1024x1024 logical matrix
    baseDepotRect?: { x: number; y: number; width: number; height: number };
    onDustCleaned?: (worldX: number, worldY: number, count: number) => void;
}

export interface SweepResult {
    cleanedCount: number;
    cleanedKg: number;
    slagCrackedCount: number;
    slagCleanedCount: number;
}

export class DirtSystem {
    private app: Application;
    public readonly worldWidth: number;
    public readonly worldHeight: number;
    public readonly cellSize: number;
    public readonly matrixWidth: number;
    public readonly matrixHeight: number;

    // Logical Headless Matrix (Uint8Array)
    public readonly logicalMatrix: DirtMatrix;
    private _matrix: Uint8Array;
    public totalDirtyCells: number = 0;
    public cleanedCells: number = 0;
    public cleanedKg: number = 0;

    // Weight factor: 1 cell (2x2 px) ~ 0.0006 kg of Venus dust (~1.0 kg/s sweep rate with starter brush)
    public readonly kgPerCell: number = 0.0006;

    // Fizyczne typy zanieczyszczeń (Popiół, Żużel, Szlam Kwasowy)
    public static readonly DIRT_CLEAN = 0;
    public static readonly DIRT_ASH = 1;
    public static readonly DIRT_SLAG = 2; // Spieczony Żużel Bazaltowy (nieuszkodzony - wymaga 2 przejazdów)
    public static readonly DIRT_ACID_SLIME = 3; // Lepki Szlam Kwasowy (spowalnia koła o 30%)
    public static readonly DIRT_SLAG_CRACKED = 4; // Rozkruszony żużel (po 1. przejeździe - gotowy do zebrania)

    // PixiJS visual representation
    public renderTexture!: RenderTexture;
    public dirtSprite!: Sprite;
    public shadowSprite!: Sprite;
    private eraseContainer: Container;
    private eraseBrush: Graphics;

    private baseDepotRect?: { x: number; y: number; width: number; height: number };
    public onDustCleaned?: (worldX: number, worldY: number, count: number) => void;

    constructor(options: DirtSystemOptions) {
        this.app = options.app;
        this.worldWidth = options.worldWidth;
        this.worldHeight = options.worldHeight;
        this.cellSize = options.cellSize ?? 2;
        this.baseDepotRect = options.baseDepotRect;
        this.onDustCleaned = options.onDustCleaned;

        this.matrixWidth = Math.floor(this.worldWidth / this.cellSize);
        this.matrixHeight = Math.floor(this.worldHeight / this.cellSize);
        this.logicalMatrix = new DirtMatrix({
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            cellSize: this.cellSize,
            baseDepotRect: this.baseDepotRect,
            onDustCleaned: this.onDustCleaned,
        });
        this._matrix = this.logicalMatrix.getMatrix();

        // Erase container wrapping child Graphics with blendMode 'erase' (Required in PixiJS v8 to cut transparent holes into RenderTexture)
        this.eraseContainer = new Container();
        this.eraseBrush = new Graphics();
        this.eraseBrush.blendMode = 'erase';
        this.eraseContainer.addChild(this.eraseBrush);
    }

    /**
     * Bezpieczne metody dostępowe do matrycy logicznej (OOP Encapsulation)
     */
    public getCell(cellX: number, cellY: number): number {
        if (cellX < 0 || cellX >= this.matrixWidth || cellY < 0 || cellY >= this.matrixHeight) return 0;
        return this._matrix[cellY * this.matrixWidth + cellX];
    }

    public setCell(cellX: number, cellY: number, value: number): void {
        if (cellX >= 0 && cellX < this.matrixWidth && cellY >= 0 && cellY < this.matrixHeight) {
            this._matrix[cellY * this.matrixWidth + cellX] = value;
        }
    }

    public isCellDirty(cellX: number, cellY: number): boolean {
        return this.getCell(cellX, cellY) > 0;
    }

    public getDirtTypeAt(worldX: number, worldY: number): number {
        const cx = Math.floor(worldX / this.cellSize);
        const cy = Math.floor(worldY / this.cellSize);
        return this.getCell(cx, cy);
    }

    public fillLogicalCircle(worldX: number, worldY: number, radius: number, type: number): void {
        const centerCellX = Math.floor(worldX / this.cellSize);
        const centerCellY = Math.floor(worldY / this.cellSize);
        const rCells = Math.ceil(radius / this.cellSize);
        const r2 = rCells * rCells;

        const minCellY = Math.max(0, centerCellY - rCells);
        const maxCellY = Math.min(this.matrixHeight - 1, centerCellY + rCells);
        const minCellX = Math.max(0, centerCellX - rCells);
        const maxCellX = Math.min(this.matrixWidth - 1, centerCellX + rCells);

        for (let cy = minCellY; cy <= maxCellY; cy++) {
            const dy = cy - centerCellY;
            const dy2 = dy * dy;
            const rowOffset = cy * this.matrixWidth;
            for (let cx = minCellX; cx <= maxCellX; cx++) {
                const dx = cx - centerCellX;
                if (dx * dx + dy2 <= r2) {
                    this._matrix[rowOffset + cx] = type;
                }
            }
        }
    }

    public getRawMatrix(): Uint8Array {
        return this._matrix;
    }

    public init(parentContainer: Container): void {
        // 1. Create full-resolution 2048x2048 RenderTexture
        this.renderTexture = RenderTexture.create({
            width: this.worldWidth,
            height: this.worldHeight,
            resolution: 1,
        });

        // 3D Cliff / Rim Effect: Cień krawędzi uskoku pyłu (przesunięty o x: +3, y: +4, ciemny brązowo-czarny)
        this.shadowSprite = new Sprite(this.renderTexture);
        this.shadowSprite.x = 3;
        this.shadowSprite.y = 4;
        this.shadowSprite.tint = 0x26231C;
        this.shadowSprite.alpha = 0.90;
        parentContainer.addChild(this.shadowSprite);

        this.dirtSprite = new Sprite(this.renderTexture);
        parentContainer.addChild(this.dirtSprite);

        // 2. Initialize Logical Matrix (1 = dirty everywhere, single uniform dust)
        this._matrix.fill(DirtSystem.DIRT_ASH);
        this.totalDirtyCells = this._matrix.length;

        // 3. Render initial procedural Venus volcanic dust layer into RenderTexture
        const initialDust = new Graphics();

        // Nieprzezroczysta skorupa siarkowo-popielata (alpha 0.98, kolor 0xB8B096)
        initialDust.rect(0, 0, this.worldWidth, this.worldHeight)
            .fill({ color: 0xB8B096, alpha: 0.98 });

        // Deterministic pseudo-random number generator
        const rng = (seed: number) => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };
        let seed = 42;

        // Warstwa 1: Drobne żółtawe wykwity siarki (0xD4C685, alpha 0.35)
        for (let i = 0; i < 450; i++) {
            const px = rng(seed++) * this.worldWidth;
            const py = rng(seed++) * this.worldHeight;
            const radius = 20 + rng(seed++) * 60;
            initialDust.circle(px, py, radius).fill({ color: 0xD4C685, alpha: 0.35 });
        }

        // Warstwa 2: Ciemniejsze kraterki i ziarna mineralne (0x8F8872, alpha 0.40)
        for (let i = 0; i < 750; i++) {
            const px = rng(seed++) * this.worldWidth;
            const py = rng(seed++) * this.worldHeight;
            const radius = 3 + rng(seed++) * 14;
            initialDust.circle(px, py, radius).fill({ color: 0x8F8872, alpha: 0.40 });
        }

        this.app.renderer.render({
            container: initialDust,
            target: this.renderTexture,
            clear: true,
        });
        initialDust.destroy();

        // 4. Clear Base Depot Area (Base is sterile / clean from the start)
        if (this.baseDepotRect) {
            this.clearDepotArea(
                this.baseDepotRect.x,
                this.baseDepotRect.y,
                this.baseDepotRect.width,
                this.baseDepotRect.height,
            );
        }
    }

    private clearDepotArea(x: number, y: number, width: number, height: number): void {
        // Clear visually via eraseContainer child (cuts transparent alpha hole into renderTexture)
        this.eraseBrush.clear();
        this.eraseBrush.rect(x, y, width, height).fill({ color: 0xffffff });

        this.app.renderer.render({
            container: this.eraseContainer,
            target: this.renderTexture,
            clear: false,
        });
        this.eraseBrush.clear();

        // Clear in matrix
        const minCellX = Math.max(0, Math.floor(x / this.cellSize));
        const maxCellX = Math.min(this.matrixWidth - 1, Math.floor((x + width) / this.cellSize));
        const minCellY = Math.max(0, Math.floor(y / this.cellSize));
        const maxCellY = Math.min(this.matrixHeight - 1, Math.floor((y + height) / this.cellSize));

        let clearedInDepot = 0;
        for (let cy = minCellY; cy <= maxCellY; cy++) {
            const rowOffset = cy * this.matrixWidth;
            for (let cx = minCellX; cx <= maxCellX; cx++) {
                const idx = rowOffset + cx;
                if (this._matrix[idx] > 0) {
                    this._matrix[idx] = 0;
                    clearedInDepot++;
                }
            }
        }

        this.totalDirtyCells -= clearedInDepot;
    }

    /**
     * Completely auto-purges 100% of the dust within a 512px rhombus sector upon reaching >= 96%
     * Eliminates the annoying "last 0.5% dirt speck" problem completely.
     */
    public clearRhombus(cx: number, cy: number, w: number, h: number): number {
        const halfW = w / 2;
        const halfH = h / 2;
        const margin = 3;

        // 1. Clear on GPU RenderTexture via eraseContainer (True Alpha Erase)
        this.eraseBrush.clear();
        this.eraseBrush.poly([
            { x: cx, y: cy - halfH - margin },
            { x: cx + halfW + margin, y: cy },
            { x: cx, y: cy + halfH + margin },
            { x: cx - halfW - margin, y: cy },
        ]).fill({ color: 0xffffff });

        this.app.renderer.render({
            container: this.eraseContainer,
            target: this.renderTexture,
            clear: false,
        });
        this.eraseBrush.clear();

        // 2. Clear in logical matrix
        const minCellX = Math.max(0, Math.floor((cx - halfW) / this.cellSize));
        const maxCellX = Math.min(this.matrixWidth - 1, Math.ceil((cx + halfW) / this.cellSize));
        const minCellY = Math.max(0, Math.floor((cy - halfH) / this.cellSize));
        const maxCellY = Math.min(this.matrixHeight - 1, Math.ceil((cy + halfH) / this.cellSize));

        let newlyCleared = 0;
        for (let cyIdx = minCellY; cyIdx <= maxCellY; cyIdx++) {
            const worldY = cyIdx * this.cellSize;
            const dy = Math.abs(worldY - cy);
            if (dy > halfH + margin) continue;
            const normY = dy / halfH;
            const rowOffset = cyIdx * this.matrixWidth;

            for (let cxIdx = minCellX; cxIdx <= maxCellX; cxIdx++) {
                const worldX = cxIdx * this.cellSize;
                const dx = Math.abs(worldX - cx);
                if (dx / halfW + normY <= 1.02) {
                    const idx = rowOffset + cxIdx;
                    if (this._matrix[idx] > 0) {
                        this._matrix[idx] = 0;
                        newlyCleared++;
                    }
                }
            }
        }

        const clearedKg = newlyCleared * this.kgPerCell;
        this.cleanedCells += newlyCleared;
        this.cleanedKg += clearedKg;
        this.totalDirtyCells = Math.max(0, this.totalDirtyCells - newlyCleared);

        return newlyCleared;
    }

    /**
     * Erases dust at a single point with a given radius.
     */
    public sweepPoint(worldX: number, worldY: number, radius: number): SweepResult {
        this.eraseBrush.clear();

        const res = this.eraseLogicalCircle(worldX, worldY, radius);
        if (res.slagCracked > 0) {
            this.eraseBrush.circle(worldX, worldY, radius).fill({ color: 0xffffff, alpha: 0.50 });
        }
        if (res.cleanedCount > 0) {
            this.eraseBrush.circle(worldX, worldY, radius).fill({ color: 0xffffff, alpha: 1.0 });
        }

        this.app.renderer.render({
            container: this.eraseContainer,
            target: this.renderTexture,
            clear: false,
        });

        const cleanedKg = (res.cleanedCount + res.slagCleaned * 0.5) * this.kgPerCell;
        this.cleanedCells += res.cleanedCount;
        this.cleanedKg += cleanedKg;
        this.totalDirtyCells = Math.max(0, this.totalDirtyCells - res.cleanedCount);

        if (res.cleanedCount > 0) {
            this.onDustCleaned?.(worldX, worldY, res.cleanedCount);
        }

        return {
            cleanedCount: res.cleanedCount,
            cleanedKg,
            slagCrackedCount: res.slagCracked,
            slagCleanedCount: res.slagCleaned,
        };
    }

    /**
     * Czyści pełny trójkątny stożek przed łazikiem (brak pustych miejsc między autem a końcem promienia).
     */
    public sweepCone(
        originX: number,
        originY: number,
        angle: number,
        reachDistance: number,
        endRadius: number
    ): SweepResult {
        let totalCleaned = 0;
        let totalSlagCracked = 0;
        let totalSlagCleaned = 0;

        const startRadius = Math.max(10, endRadius * 0.35); // Szerokość przy samym zderzaku
        const steps = 5; // 5 nakładających się okręgów tworzy idealny, gładki stożek

        this.eraseBrush.clear();

        for (let i = 0; i <= steps; i++) {
            const t = i / steps; // od 0.0 (zderzak) do 1.0 (koniec stożka)
            const dist = 18 + t * reachDistance;
            const currentRadius = startRadius + t * (endRadius - startRadius);

            const sampleX = originX + Math.cos(angle) * dist;
            const sampleY = originY + Math.sin(angle) * dist;

            const res = this.eraseLogicalCircle(sampleX, sampleY, currentRadius);
            totalCleaned += res.cleanedCount;
            totalSlagCracked += res.slagCracked;
            totalSlagCleaned += res.slagCleaned;

            if (res.cleanedCount > 0 || res.slagCracked > 0) {
                this.eraseBrush.circle(sampleX, sampleY, currentRadius).fill({ color: 0xffffff, alpha: 1.0 });
            }
        }

        this.app.renderer.render({
            container: this.eraseContainer,
            target: this.renderTexture,
            clear: false,
        });

        const cleanedKg = (totalCleaned + totalSlagCleaned * 0.5) * this.kgPerCell;
        this.cleanedCells += totalCleaned;
        this.cleanedKg += cleanedKg;
        this.totalDirtyCells = Math.max(0, this.totalDirtyCells - totalCleaned);

        if (totalCleaned > 0) {
            const tipX = originX + Math.cos(angle) * (18 + reachDistance);
            const tipY = originY + Math.sin(angle) * (18 + reachDistance);
            this.onDustCleaned?.(tipX, tipY, totalCleaned);
        }

        return {
            cleanedCount: totalCleaned,
            cleanedKg,
            slagCrackedCount: totalSlagCracked,
            slagCleanedCount: totalSlagCleaned,
        };
    }

    /**
     * Czyści szeroki pas tuż przed lemieszem łazika (jak pług śnieżny / szeroka szczotka).
     */
    public sweepBladeBar(
        originX: number,
        originY: number,
        angle: number,
        bladeWidth: number,
        bladeThickness: number = 16
    ): SweepResult {
        let totalCleaned = 0;
        let totalSlagCracked = 0;
        let totalSlagCleaned = 0;

        // Punkt centralny lemiesza tuż przed pojazdem (22px od środka łazika)
        const centerX = originX + Math.cos(angle) * 22;
        const centerY = originY + Math.sin(angle) * 22;

        // Wektor prostopadły do kierunku jazdy (w lewo i w prawo wzdłuż zderzaka)
        const perpX = -Math.sin(angle);
        const perpY = Math.cos(angle);

        const halfWidth = bladeWidth * 0.5;
        const steps = 4; // Punkty wzdłuż szerokości lemiesza

        this.eraseBrush.clear();

        for (let i = -steps; i <= steps; i++) {
            const offset = (i / steps) * halfWidth;
            const sampleX = centerX + perpX * offset;
            const sampleY = centerY + perpY * offset;

            const res = this.eraseLogicalCircle(sampleX, sampleY, bladeThickness);
            totalCleaned += res.cleanedCount;
            totalSlagCracked += res.slagCracked;
            totalSlagCleaned += res.slagCleaned;

            if (res.cleanedCount > 0 || res.slagCracked > 0) {
                this.eraseBrush.circle(sampleX, sampleY, bladeThickness).fill({ color: 0xffffff, alpha: 1.0 });
            }
        }

        this.app.renderer.render({
            container: this.eraseContainer,
            target: this.renderTexture,
            clear: false,
        });

        const cleanedKg = (totalCleaned + totalSlagCleaned * 0.5) * this.kgPerCell;
        this.cleanedCells += totalCleaned;
        this.cleanedKg += cleanedKg;
        this.totalDirtyCells = Math.max(0, this.totalDirtyCells - totalCleaned);

        if (totalCleaned > 0) {
            this.onDustCleaned?.(centerX, centerY, totalCleaned);
        }

        return {
            cleanedCount: totalCleaned,
            cleanedKg,
            slagCrackedCount: totalSlagCracked,
            slagCleanedCount: totalSlagCleaned,
        };
    }

    /**
     * Smoothly erases dust along a continuous line/capsule between two positions.
     */
    public sweepSegment(x1: number, y1: number, x2: number, y2: number, radius: number): SweepResult {
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const stepSize = Math.max(1, radius * 0.5);
        const steps = Math.max(1, Math.ceil(dist / stepSize));

        let totalCleaned = 0;
        let totalSlagCracked = 0;
        let totalSlagCleaned = 0;

        this.eraseBrush.clear();

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;

            const res = this.eraseLogicalCircle(px, py, radius);
            totalCleaned += res.cleanedCount;
            totalSlagCracked += res.slagCracked;
            totalSlagCleaned += res.slagCleaned;

            if (res.cleanedCount > 0 || res.slagCracked > 0) {
                this.eraseBrush.circle(px, py, radius).fill({ color: 0xffffff, alpha: 1.0 });
            }
        }

        this.app.renderer.render({
            container: this.eraseContainer,
            target: this.renderTexture,
            clear: false,
        });

        // Żużel bazaltowy to ciężka skała mineralna (+50% bonusu masy urobku)
        const cleanedKg = (totalCleaned + totalSlagCleaned * 0.5) * this.kgPerCell;
        this.cleanedCells += totalCleaned;
        this.cleanedKg += cleanedKg;
        this.totalDirtyCells = Math.max(0, this.totalDirtyCells - totalCleaned);

        if (totalCleaned > 0) {
            this.onDustCleaned?.(x2, y2, totalCleaned);
        }

        return {
            cleanedCount: totalCleaned,
            cleanedKg,
            slagCrackedCount: totalSlagCracked,
            slagCleanedCount: totalSlagCleaned,
        };
    }

    /**
     * Updates Uint8Array matrix for a circle and returns count of newly cleaned cells.
     */
    private eraseLogicalCircle(worldX: number, worldY: number, radius: number): {
        cleanedCount: number;
        slagCracked: number;
        slagCleaned: number;
    } {
        const centerCellX = Math.floor(worldX / this.cellSize);
        const centerCellY = Math.floor(worldY / this.cellSize);
        const rCells = Math.ceil(radius / this.cellSize);
        const r2 = rCells * rCells;

        const minCellY = Math.max(0, centerCellY - rCells);
        const maxCellY = Math.min(this.matrixHeight - 1, centerCellY + rCells);
        const minCellX = Math.max(0, centerCellX - rCells);
        const maxCellX = Math.min(this.matrixWidth - 1, centerCellX + rCells);

        let newlyCleaned = 0;
        let slagCracked = 0;
        let slagCleaned = 0;

        for (let cy = minCellY; cy <= maxCellY; cy++) {
            const dy = cy - centerCellY;
            const dy2 = dy * dy;
            const rowOffset = cy * this.matrixWidth;

            for (let cx = minCellX; cx <= maxCellX; cx++) {
                const dx = cx - centerCellX;
                if (dx * dx + dy2 <= r2) {
                    const idx = rowOffset + cx;
                    const val = this._matrix[idx];
                    if (val > DirtSystem.DIRT_CLEAN) {
                        this._matrix[idx] = DirtSystem.DIRT_CLEAN;
                        newlyCleaned++;
                    }
                }
            }
        }

        return { cleanedCount: newlyCleaned, slagCracked, slagCleaned };
    }

    /**
     * Checks if a world coordinate is already cleaned.
     */
    public isClean(worldX: number, worldY: number): boolean {
        const cellX = Math.floor(worldX / this.cellSize);
        const cellY = Math.floor(worldY / this.cellSize);

        if (cellX < 0 || cellX >= this.matrixWidth || cellY < 0 || cellY >= this.matrixHeight) {
            return true;
        }

        return this._matrix[cellY * this.matrixWidth + cellX] === 0;
    }

    /**
     * Calculates the percentage of cleaned cells [0.0 - 100.0] within a circle.
     * Used to detect uncovering of buried geysers, relics, and geological anomalies.
     */
    public getCleanPercentageInCircle(centerX: number, centerY: number, radius: number): number {
        const r2 = radius * radius;
        const minX = Math.max(0, centerX - radius);
        const maxX = Math.min(this.worldWidth, centerX + radius);
        const minY = Math.max(0, centerY - radius);
        const maxY = Math.min(this.worldHeight, centerY + radius);

        const step = this.cellSize * 2; // Sample every 4px for maximum performance
        let total = 0;
        let clean = 0;

        for (let y = minY; y <= maxY; y += step) {
            const dy = y - centerY;
            const dy2 = dy * dy;
            const cy = Math.floor(y / this.cellSize);
            if (cy < 0 || cy >= this.matrixHeight) continue;
            const rowOffset = cy * this.matrixWidth;

            for (let x = minX; x <= maxX; x += step) {
                const dx = x - centerX;
                if (dx * dx + dy2 <= r2) {
                    const cx = Math.floor(x / this.cellSize);
                    if (cx >= 0 && cx < this.matrixWidth) {
                        total++;
                        if (this._matrix[rowOffset + cx] === 0) {
                            clean++;
                        }
                    }
                }
            }
        }

        return total > 0 ? (clean / total) * 100 : 100;
    }

    /**
     * Percentage and total clean stats.
     */
    public getCleaningStats(): {
        cleanedCells: number;
        totalDirtyCells: number;
        cleanedKg: number;
        percentCleaned: number;
    } {
        const percent = this.totalDirtyCells > 0
            ? Math.min(100, (this.cleanedCells / this.totalDirtyCells) * 100)
            : 100;

        return {
            cleanedCells: this.cleanedCells,
            totalDirtyCells: this.totalDirtyCells,
            cleanedKg: Number(this.cleanedKg.toFixed(2)),
            percentCleaned: Number(percent.toFixed(2)),
        };
    }

    private reachedMilestones: Set<number> = new Set();

    public checkMilestone(): number | null {
        const stats = this.getCleaningStats();
        const thresholds = [25, 50, 75, 90, 100];
        for (const t of thresholds) {
            if (stats.percentCleaned >= t && !this.reachedMilestones.has(t)) {
                this.reachedMilestones.add(t);
                return t;
            }
        }
        return null;
    }

    /**
     * Samples dirty cells in a radius for the Dirt Vision radar pulse [V]
     */
    public getDirtyPointsInRadius(
        centerX: number,
        centerY: number,
        radius: number,
        step: number = 16,
    ): Array<{ x: number; y: number }> {
        const results: Array<{ x: number; y: number }> = [];
        const r2 = radius * radius;
        const minX = Math.max(0, centerX - radius);
        const maxX = Math.min(this.worldWidth, centerX + radius);
        const minY = Math.max(0, centerY - radius);
        const maxY = Math.min(this.worldHeight, centerY + radius);

        for (let y = minY; y <= maxY; y += step) {
            const dy = y - centerY;
            const dy2 = dy * dy;
            const cy = Math.floor(y / this.cellSize);
            if (cy < 0 || cy >= this.matrixHeight) continue;
            const rowOffset = cy * this.matrixWidth;

            for (let x = minX; x <= maxX; x += step) {
                const dx = x - centerX;
                if (dx * dx + dy2 <= r2) {
                    const cx = Math.floor(x / this.cellSize);
                    if (cx >= 0 && cx < this.matrixWidth) {
                        if (this._matrix[rowOffset + cx] === 1) {
                            results.push({ x, y });
                            if (results.length >= 350) return results; // Performance guard
                        }
                    }
                }
            }
        }
        return results;
    }

    /**
     * Checks what fraction (0 - 100%) of a rhombic diamond sector is cleaned.
     * Rhombus centered at (cx, cy) with horizontal diagonal W and vertical diagonal H.
     */
    public getRhombusCleanPercentage(cx: number, cy: number, w: number, h: number): number {
        const halfW = w / 2;
        const halfH = h / 2;
        const minX = Math.max(0, Math.floor((cx - halfW) / this.cellSize));
        const maxX = Math.min(this.matrixWidth - 1, Math.floor((cx + halfW) / this.cellSize));
        const minY = Math.max(0, Math.floor((cy - halfH) / this.cellSize));
        const maxY = Math.min(this.matrixHeight - 1, Math.floor((cy + halfH) / this.cellSize));

        let total = 0;
        let clean = 0;

        for (let gy = minY; gy <= maxY; gy += 8) {
            const py = gy * this.cellSize;
            const dy = Math.abs(py - cy) / halfH;
            if (dy > 1) continue;
            const rowOffset = gy * this.matrixWidth;

            for (let gx = minX; gx <= maxX; gx += 8) {
                const px = gx * this.cellSize;
                const dx = Math.abs(px - cx) / halfW;
                if (dx + dy <= 1) {
                    total++;
                    if (this._matrix[rowOffset + gx] === 0) {
                        clean++;
                    }
                }
            }
        }

        return total > 0 ? (clean / total) * 100 : 100;
    }

    public destroy(): void {
        this.eraseContainer.destroy({ children: true });
        this.shadowSprite?.destroy({ children: true });
        this.dirtSprite.destroy({ children: true });
        this.renderTexture.destroy(true);
    }
}

