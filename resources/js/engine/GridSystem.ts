import { Container, Graphics } from 'pixi.js';
import { BuildingFactory, type BuildingEntity, type BuildingType, type Direction, BUILDING_CONFIGS, ConveyorBuilding } from './entities/BuildingEntity';

export interface GridSystemOptions {
    worldWidth: number;
    worldHeight: number;
    tileSize?: number;
    baseDepotRect?: { x: number; y: number; width: number; height: number };
}

export class GridSystem {
    public readonly worldWidth: number;
    public readonly worldHeight: number;
    public readonly tileSize: number;
    public readonly cols: number;
    public readonly rows: number;

    // 2D grid storing building IDs or 'BASE_DEPOT' (Hermetyzacja OOP)
    private _grid: (string | null)[][];
    public buildings: Map<string, BuildingEntity> = new Map();
    public hotCraterChecker?: (worldX: number, worldY: number) => boolean;

    public container: Container;
    public ghostContainer: Container;
    private ghostGraphics: Graphics;

    constructor(options: GridSystemOptions) {
        this.worldWidth = options.worldWidth;
        this.worldHeight = options.worldHeight;
        this.tileSize = options.tileSize ?? 32;
        this.cols = Math.floor(this.worldWidth / this.tileSize); // 64
        this.rows = Math.floor(this.worldHeight / this.tileSize); // 64

        this.container = new Container();
        this.ghostContainer = new Container();
        this.ghostGraphics = new Graphics();
        this.ghostContainer.addChild(this.ghostGraphics);

        // Initialize 2D grid
        this._grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));

        // Reserve Base Depot in grid if defined (3x3 tiles)
        if (options.baseDepotRect) {
            const startGX = Math.floor(options.baseDepotRect.x / this.tileSize);
            const startGY = Math.floor(options.baseDepotRect.y / this.tileSize);
            const wTiles = Math.ceil(options.baseDepotRect.width / this.tileSize);
            const hTiles = Math.ceil(options.baseDepotRect.height / this.tileSize);

            for (let y = startGY; y < startGY + hTiles; y++) {
                for (let x = startGX; x < startGX + wTiles; x++) {
                    if (y >= 0 && y < this.rows && x >= 0 && x < this.cols) {
                        this._grid[y][x] = 'BASE_DEPOT';
                    }
                }
            }
        }
    }

    /**
     * Bezpieczne metody dostępowe do siatki (OOP Encapsulation)
     */
    public getCell(gx: number, gy: number): string | null {
        if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return null;
        return this._grid[gy][gx];
    }

    public setCell(gx: number, gy: number, value: string | null): void {
        if (gx >= 0 && gy >= 0 && gx < this.cols && gy < this.rows) {
            this._grid[gy][gx] = value;
        }
    }

    public isCellOccupied(gx: number, gy: number): boolean {
        return this.getCell(gx, gy) !== null;
    }

    public clearCell(gx: number, gy: number): void {
        this.setCell(gx, gy, null);
    }

    public getRawGrid(): ReadonlyArray<ReadonlyArray<string | null>> {
        return this._grid;
    }

    public worldToGrid(worldX: number, worldY: number): { gx: number; gy: number } {
        return {
            gx: Math.floor(worldX / this.tileSize),
            gy: Math.floor(worldY / this.tileSize),
        };
    }

    public canPlace(type: BuildingType, gx: number, gy: number): boolean {
        const config = BUILDING_CONFIGS[type];
        if (!config) return false;

        const w = config.widthTiles;
        const h = config.heightTiles;

        if (gx < 0 || gy < 0 || gx + w > this.cols || gy + h > this.rows) {
            return false;
        }

        for (let y = gy; y < gy + h; y++) {
            for (let x = gx; x < gx + w; x++) {
                if (this._grid[y][x] !== null) {
                    return false;
                }
            }
        }

        // Generator Geotermalny wymaga postawienia bezpośrednio na obszarze gorącego krateru z lawą (+80 kW)!
        if (type === 'geothermal') {
            const worldX = (gx + w * 0.5) * this.tileSize;
            const worldY = (gy + h * 0.5) * this.tileSize;
            const hasHotCrater = this.hotCraterChecker ? this.hotCraterChecker(worldX, worldY) : false;
            if (!hasHotCrater) {
                return false;
            }
        }

        return true;
    }

    public placeBuilding(type: BuildingType, gx: number, gy: number, dir: Direction = 'E'): BuildingEntity | null {
        if (!this.canPlace(type, gx, gy)) return null;

        const building = BuildingFactory.create(type, gx, gy, dir, this.tileSize);
        this.buildings.set(building.id, building);
        this.container.addChild(building.container);

        // Occupy cells in grid matrix
        for (let y = gy; y < gy + building.heightTiles; y++) {
            for (let x = gx; x < gx + building.widthTiles; x++) {
                this._grid[y][x] = building.id;
            }
        }

        this.updateConveyorConnections();
        return building;
    }

    public removeBuilding(gx: number, gy: number): BuildingEntity | null {
        if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return null;

        const buildingId = this._grid[gy][gx];
        if (!buildingId || buildingId === 'BASE_DEPOT') return null;

        const building = this.buildings.get(buildingId);
        if (!building) return null;

        // Clear cells
        for (let y = building.gridY; y < building.gridY + building.heightTiles; y++) {
            for (let x = building.gridX; x < building.gridX + building.widthTiles; x++) {
                if (this._grid[y][x] === buildingId) {
                    this._grid[y][x] = null;
                }
            }
        }

        this.buildings.delete(buildingId);
        this.container.removeChild(building.container);
        building.destroy();

        this.updateConveyorConnections();
        return building;
    }

    public updateGhost(
        mouseWorldPos: { x: number; y: number },
        selectedType: BuildingType | null,
        direction: Direction,
        canAfford: boolean,
    ): { gx: number; gy: number; canPlace: boolean } {
        this.ghostGraphics.clear();

        if (!selectedType) {
            this.ghostContainer.visible = false;
            return { gx: -1, gy: -1, canPlace: false };
        }

        this.ghostContainer.visible = true;
        const { gx, gy } = this.worldToGrid(mouseWorldPos.x, mouseWorldPos.y);
        const config = BUILDING_CONFIGS[selectedType];
        const canFit = this.canPlace(selectedType, gx, gy);
        const isValid = canFit && canAfford;

        const w = config.widthTiles * this.tileSize;
        const h = config.heightTiles * this.tileSize;

        this.ghostContainer.x = gx * this.tileSize;
        this.ghostContainer.y = gy * this.tileSize;

        // Ghost box (Green if valid, Red if invalid)
        const ghostColor = isValid ? 0x10b981 : 0xef4444;
        this.ghostGraphics.rect(0, 0, w, h)
            .fill({ color: ghostColor, alpha: 0.35 })
            .stroke({ width: 2, color: ghostColor, alpha: 0.9 });

        // Conveyor direction arrow in ghost
        if (selectedType === 'conveyor') {
            const cx = w / 2;
            const cy = h / 2;
            this.ghostGraphics.circle(cx, cy, 3).fill({ color: ghostColor });
        }

        return { gx, gy, canPlace: isValid };
    }

    public getBuildingAt(gx: number, gy: number): BuildingEntity | null {
        if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return null;
        const id = this._grid[gy][gx];
        if (!id || id === 'BASE_DEPOT') return null;
        return this.buildings.get(id) ?? null;
    }

    public getDragPath(
        startGX: number,
        startGY: number,
        endGX: number,
        endGY: number,
    ): Array<{ gx: number; gy: number; dir: Direction }> {
        const path: Array<{ gx: number; gy: number; dir: Direction }> = [];

        // Move horizontally first
        const stepX = endGX >= startGX ? 1 : -1;
        const dirX: Direction = stepX === 1 ? 'E' : 'W';

        for (let x = startGX; stepX === 1 ? x <= endGX : x >= endGX; x += stepX) {
            // If turning into Y, the corner tile faces Y
            const isCorner = x === endGX && endGY !== startGY;
            const dirY: Direction = endGY >= startGY ? 'S' : 'N';
            path.push({
                gx: x,
                gy: startGY,
                dir: isCorner ? dirY : dirX,
            });
        }

        // Then move vertically
        if (endGY !== startGY) {
            const stepY = endGY >= startGY ? 1 : -1;
            const dirY: Direction = stepY === 1 ? 'S' : 'N';

            for (let y = startGY + stepY; stepY === 1 ? y <= endGY : y >= endGY; y += stepY) {
                path.push({
                    gx: endGX,
                    gy: y,
                    dir: dirY,
                });
            }
        }

        return path;
    }

    public updateDragGhost(
        path: Array<{ gx: number; gy: number; dir: Direction }>,
        type: BuildingType,
        credits: number,
    ): { canPlaceAll: boolean; totalCost: number } {
        this.ghostGraphics.clear();
        this.ghostContainer.visible = true;
        this.ghostContainer.x = 0;
        this.ghostContainer.y = 0;

        const config = BUILDING_CONFIGS[type];
        let totalCost = 0;
        let canPlaceAll = true;

        for (const pt of path) {
            const canFit = this.canPlace(type, pt.gx, pt.gy);
            totalCost += config.cost;
            const isValid = canFit && credits >= totalCost;
            if (!isValid) canPlaceAll = false;

            const col = isValid ? 0x10b981 : 0xef4444;
            const px = pt.gx * this.tileSize;
            const py = pt.gy * this.tileSize;

            this.ghostGraphics.rect(px, py, this.tileSize, this.tileSize)
                .fill({ color: col, alpha: 0.35 })
                .stroke({ width: 1.5, color: col, alpha: 0.85 });

            // Direction arrow
            this.ghostGraphics.circle(px + this.tileSize / 2, py + this.tileSize / 2, 2.5).fill({ color: col });
        }

        return { canPlaceAll, totalCost };
    }

    public updateAltMode(active: boolean, hasPower: boolean, simulationLoop?: any): void {
        for (const building of this.buildings.values()) {
            const ratio = simulationLoop ? simulationLoop.getPackagerRatio(building.id) : 0;
            building.updateAltMode(active, hasPower, ratio);
        }
    }

    public update(dt: number): void {
        for (const building of this.buildings.values()) {
            building.update(dt);
        }
    }

    public serializeBuildings(): Array<{ type: BuildingType; gx: number; gy: number; dir: Direction }> {
        const result: Array<{ type: BuildingType; gx: number; gy: number; dir: Direction }> = [];
        for (const building of this.buildings.values()) {
            result.push({
                type: building.type,
                gx: building.gridX,
                gy: building.gridY,
                dir: building.direction,
            });
        }
        return result;
    }

    public loadBuildings(data: Array<{ type: BuildingType; gx: number; gy: number; dir: Direction }>): void {
        if (!Array.isArray(data)) return;
        for (const item of data) {
            if (this.canPlace(item.type, item.gx, item.gy)) {
                this.placeBuilding(item.type, item.gx, item.gy, item.dir);
            }
        }
    }

    public updateConveyorConnections(): void {
        for (const b of this.buildings.values()) {
            if (b.type !== 'conveyor' && b.type !== 'conveyor_mk2') continue;
            const conv = b as ConveyorBuilding;

            let incomingDir: Direction | null = null;

            // 1. Neighbor from West (gx - 1, gy) pushing East ('E')
            if (conv.gridX > 0) {
                const leftId = this._grid[conv.gridY][conv.gridX - 1];
                if (leftId && leftId !== 'BASE_DEPOT') {
                    const leftB = this.buildings.get(leftId);
                    if (leftB) {
                        if ((leftB.type === 'conveyor' || leftB.type === 'conveyor_mk2') && leftB.direction === 'E') {
                            incomingDir = 'W';
                        } else if ('getOutputPort' in leftB && typeof (leftB as any).getOutputPort === 'function') {
                            const port = (leftB as any).getOutputPort();
                            if (port && port.outboundGX === conv.gridX && port.outboundGY === conv.gridY) {
                                incomingDir = 'W';
                            }
                        }
                    }
                }
            }

            // 2. Neighbor from East (gx + 1, gy) pushing West ('W')
            if (!incomingDir && conv.gridX < this.cols - 1) {
                const rightId = this._grid[conv.gridY][conv.gridX + 1];
                if (rightId && rightId !== 'BASE_DEPOT') {
                    const rightB = this.buildings.get(rightId);
                    if (rightB) {
                        if ((rightB.type === 'conveyor' || rightB.type === 'conveyor_mk2') && rightB.direction === 'W') {
                            incomingDir = 'E';
                        } else if ('getOutputPort' in rightB && typeof (rightB as any).getOutputPort === 'function') {
                            const port = (rightB as any).getOutputPort();
                            if (port && port.outboundGX === conv.gridX && port.outboundGY === conv.gridY) {
                                incomingDir = 'E';
                            }
                        }
                    }
                }
            }

            // 3. Neighbor from North (gx, gy - 1) pushing South ('S')
            if (!incomingDir && conv.gridY > 0) {
                const topId = this._grid[conv.gridY - 1][conv.gridX];
                if (topId && topId !== 'BASE_DEPOT') {
                    const topB = this.buildings.get(topId);
                    if (topB) {
                        if ((topB.type === 'conveyor' || topB.type === 'conveyor_mk2') && topB.direction === 'S') {
                            incomingDir = 'N';
                        } else if ('getOutputPort' in topB && typeof (topB as any).getOutputPort === 'function') {
                            const port = (topB as any).getOutputPort();
                            if (port && port.outboundGX === conv.gridX && port.outboundGY === conv.gridY) {
                                incomingDir = 'N';
                            }
                        }
                    }
                }
            }

            // 4. Neighbor from South (gx, gy + 1) pushing North ('N')
            if (!incomingDir && conv.gridY < this.rows - 1) {
                const botId = this._grid[conv.gridY + 1][conv.gridX];
                if (botId && botId !== 'BASE_DEPOT') {
                    const botB = this.buildings.get(botId);
                    if (botB) {
                        if ((botB.type === 'conveyor' || botB.type === 'conveyor_mk2') && botB.direction === 'N') {
                            incomingDir = 'S';
                        } else if ('getOutputPort' in botB && typeof (botB as any).getOutputPort === 'function') {
                            const port = (botB as any).getOutputPort();
                            if (port && port.outboundGX === conv.gridX && port.outboundGY === conv.gridY) {
                                incomingDir = 'S';
                            }
                        }
                    }
                }
            }

            const hasHopper = incomingDir === null;
            conv.setConnection(incomingDir, hasHopper);
        }
    }

    public destroy(): void {
        for (const building of this.buildings.values()) {
            building.destroy();
        }
        this.buildings.clear();
        this.ghostGraphics.destroy();
        this.ghostContainer.destroy({ children: true });
        this.container.destroy({ children: true });
    }
}

