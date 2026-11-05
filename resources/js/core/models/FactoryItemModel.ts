/**
 * Planet Cleaner Simulator - Factory Item Model (Pure Data)
 * Logical model for manufactured items on conveyors and in silos.
 */

export type FactoryItemType = 'dust_bag' | 'briquette' | 'plate' | 'acid_cell';

export interface FactoryItemModelOptions {
    id: string;
    type: FactoryItemType;
    gridX: number;
    gridY: number;
    progress?: number;
    value?: number;
}

export class FactoryItemModel {
    public readonly id: string;
    public type: FactoryItemType;
    public gridX: number;
    public gridY: number;
    public progress: number; // 0.0 to 1.0 along current conveyor
    public value: number;

    constructor(options: FactoryItemModelOptions) {
        this.id = options.id;
        this.type = options.type;
        this.gridX = options.gridX;
        this.gridY = options.gridY;
        this.progress = options.progress ?? 0;
        this.value = options.value ?? FactoryItemModel.getDefaultValue(options.type);
    }

    public static getDefaultValue(type: FactoryItemType): number {
        switch (type) {
            case 'dust_bag': return 1.20;
            case 'briquette': return 4.50;
            case 'plate': return 16.00;
            case 'acid_cell': return 45.00;
            default: return 0.10;
        }
    }
}

