export * from './IWorldRenderer';
export * from './pixi2d/PixiRenderer2D';
export * from './three3d/ThreeBrunoRenderer3D';

import type { IWorldRenderer } from './IWorldRenderer';
import { PixiRenderer2D } from './pixi2d/PixiRenderer2D';
import { ThreeBrunoRenderer3D } from './three3d/ThreeBrunoRenderer3D';

export function createWorldRenderer(type: 'pixi2d' | 'three3d'): IWorldRenderer {
    if (type === 'three3d') {
        return new ThreeBrunoRenderer3D();
    }
    return new PixiRenderer2D();
}

