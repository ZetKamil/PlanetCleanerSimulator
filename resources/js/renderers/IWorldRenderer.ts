/**
 * Planet Cleaner Simulator - World Renderer Interface
 * Abstracts the graphics engine from simulation logic.
 * Enables switching between PixiRenderer2D (v0.1) and ThreeBrunoRenderer3D (v0.2).
 */

import type { PlayerModel } from '../core/models/PlayerModel';
import type { BotModel } from '../core/models/BotModel';
import type { BuildingModel } from '../core/models/BuildingModel';
import type { FactoryItemModel } from '../core/models/FactoryItemModel';
import type { DirtyRect } from '../core/dirt/DirtMatrix';

export interface WorldRenderState {
    player: PlayerModel;
    bots: BotModel[];
    buildings: BuildingModel[];
    factoryItems: FactoryItemModel[];
    camera: {
        x: number;
        y: number;
        zoom: number;
    };
    weather: {
        isAcidRain: boolean;
        intensity: number;
    };
    dirtyRegions?: DirtyRect[];
}

export interface IWorldRenderer {
    readonly id: 'pixi2d' | 'three3d';

    /**
     * Mounts the graphics context into a container DOM element.
     */
    init(container: HTMLElement): Promise<void>;

    /**
     * Renders a single frame using pure data state from Headless Core.
     */
    renderTick(worldState: WorldRenderState, deltaSeconds: number): void;

    /**
     * Visually erases dirt from the planetary surface texture/mesh.
     */
    eraseDirtVisual(x: number, y: number, radius: number): void;

    /**
     * Handles canvas or window resizing.
     */
    onResize(width: number, height: number): void;

    /**
     * Cleanly disposes graphics contexts and WebGL memory.
     */
    destroy(): void;
}

