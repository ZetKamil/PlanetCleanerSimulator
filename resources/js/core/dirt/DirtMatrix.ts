/**
 * Planet Cleaner Simulator - Pure Logical Dirt Matrix (Headless)
 * Manages the Uint8Array surface pollution grid and sweeping mathematics.
 * Absolutely ZERO PIXI.js or Three.js dependencies!
 * Emits DirtyRect events for active renderers to update textures.
 */

export interface DirtyRect {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    shape: 'circle' | 'cone' | 'bar' | 'rect';
    params?: Record<string, number>;
}

export interface SweepResult {
    cleanedCount: number;
    cleanedKg: number;
    slagCrackedCount: number;
    slagCleanedCount: number;
}

export interface DirtMatrixOptions {
    worldWidth: number;
    worldHeight: number;
    cellSize?: number; // default 2px
    baseDepotRect?: { x: number; y: number; width: number; height: number };
    onDustCleaned?: (worldX: number, worldY: number, count: number) => void;
    onDirtyRegion?: (rect: DirtyRect) => void;
}

export class DirtMatrix {
    public readonly worldWidth: number;
    public readonly worldHeight: number;
    public readonly cellSize: number;
    public readonly matrixWidth: number;
    public readonly matrixHeight: number;

    // Logical Matrix (Uint8Array: 0 = clean, 1 = ash, 2 = slag, 3 = acid slime, 4 = slag cracked)
    private _matrix: Uint8Array;
    public totalDirtyCells: number = 0;
    public cleanedCells: number = 0;
    public cleanedKg: number = 0;
    public readonly kgPerCell: number = 0.0006;

    public static readonly DIRT_CLEAN = 0;
    public static readonly DIRT_ASH = 1;
    public static readonly DIRT_SLAG = 2;
    public static readonly DIRT_ACID_SLIME = 3;
    public static readonly DIRT_SLAG_CRACKED = 4;

    private baseDepotRect?: { x: number; y: number; width: number; height: number };
    public onDustCleaned?: (worldX: number, worldY: number, count: number) => void;
    public onDirtyRegion?: (rect: DirtyRect) => void;

    constructor(options: DirtMatrixOptions) {
        this.worldWidth = options.worldWidth;
        this.worldHeight = options.worldHeight;
        this.cellSize = options.cellSize ?? 2;
        this.matrixWidth = Math.floor(this.worldWidth / this.cellSize);
        this.matrixHeight = Math.floor(this.worldHeight / this.cellSize);
        this.baseDepotRect = options.baseDepotRect;
        this.onDustCleaned = options.onDustCleaned;
        this.onDirtyRegion = options.onDirtyRegion;

        this._matrix = new Uint8Array(this.matrixWidth * this.matrixHeight);
        this.initializeDefaultAsh();
    }

    private initializeDefaultAsh(): void {
        this._matrix.fill(DirtMatrix.DIRT_ASH);
        this.totalDirtyCells = this.matrixWidth * this.matrixHeight;

        // Clear base depot zone if provided
        if (this.baseDepotRect) {
            this.clearBaseDepotZone(this.baseDepotRect);
        }
    }

    public clearBaseDepotZone(rect: { x: number; y: number; width: number; height: number }): void {
        const startMX = Math.max(0, Math.floor(rect.x / this.cellSize));
        const startMY = Math.max(0, Math.floor(rect.y / this.cellSize));
        const endMX = Math.min(this.matrixWidth - 1, Math.floor((rect.x + rect.width) / this.cellSize));
        const endMY = Math.min(this.matrixHeight - 1, Math.floor((rect.y + rect.height) / this.cellSize));

        let clearedInBase = 0;
        for (let my = startMY; my <= endMY; my++) {
            const rowOffset = my * this.matrixWidth;
            for (let mx = startMX; mx <= endMX; mx++) {
                if (this._matrix[rowOffset + mx] !== DirtMatrix.DIRT_CLEAN) {
                    this._matrix[rowOffset + mx] = DirtMatrix.DIRT_CLEAN;
                    clearedInBase++;
                }
            }
        }
        this.totalDirtyCells = Math.max(0, this.totalDirtyCells - clearedInBase);
    }

    public getCell(mx: number, my: number): number {
        if (mx < 0 || mx >= this.matrixWidth || my < 0 || my >= this.matrixHeight) {
            return DirtMatrix.DIRT_CLEAN;
        }
        return this._matrix[my * this.matrixWidth + mx];
    }

    public setCell(mx: number, my: number, value: number): void {
        if (mx >= 0 && mx < this.matrixWidth && my >= 0 && my < this.matrixHeight) {
            this._matrix[my * this.matrixWidth + mx] = value;
        }
    }

    public getMatrix(): Uint8Array {
        return this._matrix;
    }

    /**
     * Sweeps a circular area around world coordinates.
     */
    public sweepCircle(worldX: number, worldY: number, radiusPx: number): SweepResult {
        const result: SweepResult = {
            cleanedCount: 0,
            cleanedKg: 0,
            slagCrackedCount: 0,
            slagCleanedCount: 0,
        };

        const rInCells = Math.ceil(radiusPx / this.cellSize);
        const centerMX = Math.floor(worldX / this.cellSize);
        const centerMY = Math.floor(worldY / this.cellSize);

        const minMX = Math.max(0, centerMX - rInCells);
        const maxMX = Math.min(this.matrixWidth - 1, centerMX + rInCells);
        const minMY = Math.max(0, centerMY - rInCells);
        const maxMY = Math.min(this.matrixHeight - 1, centerMY + rInCells);
        const rSq = radiusPx * radiusPx;

        for (let my = minMY; my <= maxMY; my++) {
            const cellCenterY = my * this.cellSize + this.cellSize * 0.5;
            const dy = cellCenterY - worldY;
            const rowOffset = my * this.matrixWidth;

            for (let mx = minMX; mx <= maxMX; mx++) {
                const cellCenterX = mx * this.cellSize + this.cellSize * 0.5;
                const dx = cellCenterX - worldX;

                if (dx * dx + dy * dy <= rSq) {
                    const idx = rowOffset + mx;
                    const cellVal = this._matrix[idx];

                    if (cellVal === DirtMatrix.DIRT_ASH || cellVal === DirtMatrix.DIRT_ACID_SLIME) {
                        this._matrix[idx] = DirtMatrix.DIRT_CLEAN;
                        result.cleanedCount++;
                    } else if (cellVal === DirtMatrix.DIRT_SLAG) {
                        this._matrix[idx] = DirtMatrix.DIRT_SLAG_CRACKED;
                        result.slagCrackedCount++;
                    } else if (cellVal === DirtMatrix.DIRT_SLAG_CRACKED) {
                        this._matrix[idx] = DirtMatrix.DIRT_CLEAN;
                        result.cleanedCount++;
                        result.slagCleanedCount++;
                    }
                }
            }
        }

        if (result.cleanedCount > 0 || result.slagCrackedCount > 0) {
            result.cleanedKg = result.cleanedCount * this.kgPerCell;
            this.cleanedCells += result.cleanedCount;
            this.cleanedKg += result.cleanedKg;
            this.totalDirtyCells = Math.max(0, this.totalDirtyCells - result.cleanedCount);

            this.onDustCleaned?.(worldX, worldY, result.cleanedCount);
            this.onDirtyRegion?.({
                minX: Math.max(0, worldX - radiusPx),
                minY: Math.max(0, worldY - radiusPx),
                maxX: Math.min(this.worldWidth, worldX + radiusPx),
                maxY: Math.min(this.worldHeight, worldY + radiusPx),
                shape: 'circle',
                params: { x: worldX, y: worldY, radius: radiusPx },
            });
        }

        return result;
    }

    /**
     * Sweeps a directional cone (e.g. Starter Scraper, Vacuum Turbine).
     */
    public sweepCone(
        startX: number,
        startY: number,
        angleRad: number,
        reachDist: number,
        endRadius: number
    ): SweepResult {
        const result: SweepResult = {
            cleanedCount: 0,
            cleanedKg: 0,
            slagCrackedCount: 0,
            slagCleanedCount: 0,
        };

        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);
        const maxExtent = reachDist + endRadius;

        const minMX = Math.max(0, Math.floor((startX - maxExtent) / this.cellSize));
        const maxMX = Math.min(this.matrixWidth - 1, Math.floor((startX + maxExtent) / this.cellSize));
        const minMY = Math.max(0, Math.floor((startY - maxExtent) / this.cellSize));
        const maxMY = Math.min(this.matrixHeight - 1, Math.floor((startY + maxExtent) / this.cellSize));

        for (let my = minMY; my <= maxMY; my++) {
            const cellCenterY = my * this.cellSize + this.cellSize * 0.5;
            const dy = cellCenterY - startY;
            const rowOffset = my * this.matrixWidth;

            for (let mx = minMX; mx <= maxMX; mx++) {
                const cellCenterX = mx * this.cellSize + this.cellSize * 0.5;
                const dx = cellCenterX - startX;

                // Project into cone coordinate space
                const proj = dx * cosA + dy * sinA;
                if (proj >= 0 && proj <= reachDist) {
                    const perp = Math.abs(-dx * sinA + dy * cosA);
                    const allowedWidth = (proj / reachDist) * endRadius;

                    if (perp <= allowedWidth) {
                        const idx = rowOffset + mx;
                        const cellVal = this._matrix[idx];

                        if (cellVal === DirtMatrix.DIRT_ASH || cellVal === DirtMatrix.DIRT_ACID_SLIME) {
                            this._matrix[idx] = DirtMatrix.DIRT_CLEAN;
                            result.cleanedCount++;
                        } else if (cellVal === DirtMatrix.DIRT_SLAG) {
                            this._matrix[idx] = DirtMatrix.DIRT_SLAG_CRACKED;
                            result.slagCrackedCount++;
                        } else if (cellVal === DirtMatrix.DIRT_SLAG_CRACKED) {
                            this._matrix[idx] = DirtMatrix.DIRT_CLEAN;
                            result.cleanedCount++;
                            result.slagCleanedCount++;
                        }
                    }
                }
            }
        }

        if (result.cleanedCount > 0 || result.slagCrackedCount > 0) {
            result.cleanedKg = result.cleanedCount * this.kgPerCell;
            this.cleanedCells += result.cleanedCount;
            this.cleanedKg += result.cleanedKg;
            this.totalDirtyCells = Math.max(0, this.totalDirtyCells - result.cleanedCount);

            this.onDustCleaned?.(startX + cosA * (reachDist * 0.5), startY + sinA * (reachDist * 0.5), result.cleanedCount);
            this.onDirtyRegion?.({
                minX: Math.max(0, startX - maxExtent),
                minY: Math.max(0, startY - maxExtent),
                maxX: Math.min(this.worldWidth, startX + maxExtent),
                maxY: Math.min(this.worldHeight, startY + maxExtent),
                shape: 'cone',
                params: { startX, startY, angleRad, reachDist, endRadius },
            });
        }

        return result;
    }

    /**
     * Sweeps a forward-facing harvesting scraper bar.
     */
    public sweepBar(
        startX: number,
        startY: number,
        angleRad: number,
        reachDist: number,
        barWidth: number
    ): SweepResult {
        const result: SweepResult = {
            cleanedCount: 0,
            cleanedKg: 0,
            slagCrackedCount: 0,
            slagCleanedCount: 0,
        };

        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);
        const halfWidth = barWidth * 0.5;
        const maxExtent = Math.hypot(reachDist, halfWidth);

        const minMX = Math.max(0, Math.floor((startX - maxExtent) / this.cellSize));
        const maxMX = Math.min(this.matrixWidth - 1, Math.floor((startX + maxExtent) / this.cellSize));
        const minMY = Math.max(0, Math.floor((startY - maxExtent) / this.cellSize));
        const maxMY = Math.min(this.matrixHeight - 1, Math.floor((startY + maxExtent) / this.cellSize));

        for (let my = minMY; my <= maxMY; my++) {
            const cellCenterY = my * this.cellSize + this.cellSize * 0.5;
            const dy = cellCenterY - startY;
            const rowOffset = my * this.matrixWidth;

            for (let mx = minMX; mx <= maxMX; mx++) {
                const cellCenterX = mx * this.cellSize + this.cellSize * 0.5;
                const dx = cellCenterX - startX;

                const proj = dx * cosA + dy * sinA;
                if (proj >= 0 && proj <= reachDist) {
                    const perp = Math.abs(-dx * sinA + dy * cosA);
                    if (perp <= halfWidth) {
                        const idx = rowOffset + mx;
                        const cellVal = this._matrix[idx];

                        if (cellVal === DirtMatrix.DIRT_ASH || cellVal === DirtMatrix.DIRT_ACID_SLIME) {
                            this._matrix[idx] = DirtMatrix.DIRT_CLEAN;
                            result.cleanedCount++;
                        } else if (cellVal === DirtMatrix.DIRT_SLAG) {
                            this._matrix[idx] = DirtMatrix.DIRT_SLAG_CRACKED;
                            result.slagCrackedCount++;
                        } else if (cellVal === DirtMatrix.DIRT_SLAG_CRACKED) {
                            this._matrix[idx] = DirtMatrix.DIRT_CLEAN;
                            result.cleanedCount++;
                            result.slagCleanedCount++;
                        }
                    }
                }
            }
        }

        if (result.cleanedCount > 0 || result.slagCrackedCount > 0) {
            result.cleanedKg = result.cleanedCount * this.kgPerCell;
            this.cleanedCells += result.cleanedCount;
            this.cleanedKg += result.cleanedKg;
            this.totalDirtyCells = Math.max(0, this.totalDirtyCells - result.cleanedCount);

            this.onDustCleaned?.(startX + cosA * (reachDist * 0.5), startY + sinA * (reachDist * 0.5), result.cleanedCount);
            this.onDirtyRegion?.({
                minX: Math.max(0, startX - maxExtent),
                minY: Math.max(0, startY - maxExtent),
                maxX: Math.min(this.worldWidth, startX + maxExtent),
                maxY: Math.min(this.worldHeight, startY + maxExtent),
                shape: 'bar',
                params: { startX, startY, angleRad, reachDist, barWidth },
            });
        }

        return result;
    }
}

