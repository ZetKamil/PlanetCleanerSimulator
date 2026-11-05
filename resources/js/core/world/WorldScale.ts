/**
 * Planet Cleaner Simulator - World Coordinates & Unit Scaling
 * Unifies spatial coordinates between 2D PixiJS (pixels) and 3D Three.js (meters).
 *
 * In 2D PixiJS:
 *   1 Grid Cell = 32 x 32 px
 *   World Size = 6144 x 6144 px (192 x 192 cells)
 *
 * In 3D Three.js (Bruno Simon style):
 *   1 Grid Cell = 1.0 x 1.0 meter
 *   World Size = 192.0 x 192.0 units
 */

export const WORLD_SCALE = 32;
export const TILE_SIZE_PX = 32;
export const TILE_SIZE_3D = 1.0;

export interface Vector2D {
    x: number;
    y: number;
}

export interface GridCoord {
    gx: number;
    gy: number;
}

export interface Vector3D {
    x: number;
    y: number;
    z: number;
}

/**
 * Converts grid coordinates (e.g. 10.5, 12.0) to 2D pixel coordinates.
 */
export function gridToWorld2D(gx: number, gy: number): Vector2D {
    return {
        x: gx * WORLD_SCALE,
        y: gy * WORLD_SCALE,
    };
}

/**
 * Converts 2D pixel coordinates (e.g. 336, 384) to grid cell coordinates.
 */
export function world2DToGrid(x: number, y: number): GridCoord {
    return {
        gx: x / WORLD_SCALE,
        gy: y / WORLD_SCALE,
    };
}

/**
 * Converts grid coordinates to 3D world coordinates (Y = 0 is ground plane).
 */
export function gridToWorld3D(gx: number, gy: number, heightMeters: number = 0): Vector3D {
    return {
        x: gx * TILE_SIZE_3D,
        y: heightMeters,
        z: gy * TILE_SIZE_3D,
    };
}

/**
 * Converts 3D ground coordinates back to grid coordinates.
 */
export function world3DToGrid(x: number, z: number): GridCoord {
    return {
        gx: x / TILE_SIZE_3D,
        gy: z / TILE_SIZE_3D,
    };
}

/**
 * Converts meters (3D unit) to pixels (2D unit).
 */
export function metersToPixels(meters: number): number {
    return meters * WORLD_SCALE;
}

/**
 * Converts pixels (2D unit) to meters (3D unit).
 */
export function pixelsToMeters(pixels: number): number {
    return pixels / WORLD_SCALE;
}

