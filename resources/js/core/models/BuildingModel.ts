/**
 * Planet Cleaner Simulator - Building Model (Pure Data)
 * Logical state of placed buildings (Silos, Solar Panels, Smelters, Conveyors, Shield Domes).
 */

export type BuildingDirection = 'N' | 'E' | 'S' | 'W';

export interface BuildingModelOptions {
    id: string;
    type: string;
    gridX: number;
    gridY: number;
    direction?: BuildingDirection;
    powerProduced?: number;
    powerConsumed?: number;
    acceptsBots?: boolean;
}

export class BuildingModel {
    public readonly id: string;
    public readonly type: string;
    public gridX: number;
    public gridY: number;
    public direction: BuildingDirection;

    public powerProduced: number;
    public powerConsumed: number;
    public hasPower: boolean = true;
    public acceptsBots: boolean;

    // Buffer storage for raw dust or factory items
    public rawDustStored: number = 0;
    public maxRawDustCapacity: number = 250;
    public itemsQueue: string[] = [];

    constructor(options: BuildingModelOptions) {
        this.id = options.id;
        this.type = options.type;
        this.gridX = options.gridX;
        this.gridY = options.gridY;
        this.direction = options.direction ?? 'N';
        this.powerProduced = options.powerProduced ?? 0;
        this.powerConsumed = options.powerConsumed ?? 0;
        this.acceptsBots = options.acceptsBots ?? (options.type === 'silo');
    }
}

