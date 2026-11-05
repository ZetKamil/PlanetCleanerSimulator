/**
 * Planet Cleaner Simulator - Simulation Core (Headless)
 * Pure simulation logic for power grid, conveyor items, and factory machines.
 * Absolutely ZERO PIXI.js or Three.js dependencies!
 */

import { FactoryItemModel, type FactoryItemType } from '../models/FactoryItemModel';
import type { BuildingModel } from '../models/BuildingModel';

export interface ShieldDomeState {
    x: number;
    y: number;
    radius: number;
    active: boolean;
}

export interface SimulationCoreResult {
    creditsEarned: number;
    briquettesSold: number;
    platesSold: number;
    acidCellsSold: number;
    totalPowerProduced: number;
    totalPowerConsumed: number;
    hasPower: boolean;
    activeShieldDomes: ShieldDomeState[];
    items: FactoryItemModel[];
}

export class SimulationCore {
    public items: FactoryItemModel[] = [];
    public isAcidRainActive: boolean = false;

    // Power stats cache
    private totalPowerProduced: number = 10;
    private totalPowerConsumed: number = 0;
    private hasPower: boolean = true;
    private activeShieldDomes: ShieldDomeState[] = [];

    // Machine progress tracking
    private machineProgress: Map<string, number> = new Map();
    private machineStorage: Map<string, number> = new Map();

    public updateTick(
        deltaSeconds: number,
        buildings: BuildingModel[],
        isCraterHot?: (worldX: number, worldY: number) => boolean
    ): SimulationCoreResult {
        const result: SimulationCoreResult = {
            creditsEarned: 0,
            briquettesSold: 0,
            platesSold: 0,
            acidCellsSold: 0,
            totalPowerProduced: 0,
            totalPowerConsumed: 0,
            hasPower: true,
            activeShieldDomes: [],
            items: this.items,
        };

        // 1. Calculate Power Balance
        let produced = 10; // Baseline emergency solar / RTG power
        let consumed = 0;

        for (const b of buildings) {
            if (b.type === 'solar_panel') {
                produced += 25;
            } else if (b.type === 'geothermal_plant') {
                const worldX = b.gridX * 32 + 16;
                const worldY = b.gridY * 32 + 16;
                const onHot = isCraterHot ? isCraterHot(worldX, worldY) : false;
                produced += onHot ? 80 : 20;
            } else if (b.type === 'packager') {
                consumed += 15;
            } else if (b.type === 'smelter') {
                consumed += 35;
            } else if (b.type === 'shield_dome') {
                consumed += 50;
            }
        }

        this.totalPowerProduced = produced;
        this.totalPowerConsumed = consumed;
        this.hasPower = produced >= consumed;

        result.totalPowerProduced = this.totalPowerProduced;
        result.totalPowerConsumed = this.totalPowerConsumed;
        result.hasPower = this.hasPower;

        // 2. Shield Domes calculation
        for (const b of buildings) {
            if (b.type === 'shield_dome') {
                const dome: ShieldDomeState = {
                    x: b.gridX * 32 + 16,
                    y: b.gridY * 32 + 16,
                    radius: 280,
                    active: this.hasPower,
                };
                result.activeShieldDomes.push(dome);
            }
        }
        this.activeShieldDomes = result.activeShieldDomes;

        // 3. Update Conveyor Items
        const remainingItems: FactoryItemModel[] = [];
        for (const item of this.items) {
            item.progress += deltaSeconds * 1.5; // conveyor speed
            if (item.progress < 1.0) {
                remainingItems.push(item);
            } else {
                // Item reached end of conveyor / delivery point
                result.creditsEarned += item.value;
                if (item.type === 'briquette') result.briquettesSold++;
                else if (item.type === 'plate') result.platesSold++;
                else if (item.type === 'acid_cell') result.acidCellsSold++;
            }
        }
        this.items = remainingItems;
        result.items = this.items;

        return result;
    }

    public isProtectedByShield(worldX: number, worldY: number): boolean {
        for (const dome of this.activeShieldDomes) {
            if (dome.active) {
                const dx = worldX - dome.x;
                const dy = worldY - dome.y;
                if (dx * dx + dy * dy <= dome.radius * dome.radius) {
                    return true;
                }
            }
        }
        return false;
    }
}

