import { Container } from 'pixi.js';

export interface ViewportOptions {
    screenWidth: number;
    screenHeight: number;
    worldWidth: number;
    worldHeight: number;
    initialZoom?: number;
    minZoom?: number;
    maxZoom?: number;
}

export class WorldViewport {
    public container: Container;
    public screenWidth: number;
    public screenHeight: number;
    public worldWidth: number;
    public worldHeight: number;

    public zoom: number = 1.0;
    public targetZoom: number = 1.0;
    public minZoom: number = 0.45;
    public maxZoom: number = 2.0;

    private targetX: number = 1024;
    private targetY: number = 1024;
    private currentX: number = 1024;
    private currentY: number = 1024;

    constructor(options: ViewportOptions) {
        this.container = new Container();
        this.screenWidth = options.screenWidth;
        this.screenHeight = options.screenHeight;
        this.worldWidth = options.worldWidth;
        this.worldHeight = options.worldHeight;

        if (options.initialZoom) {
            this.zoom = options.initialZoom;
            this.targetZoom = options.initialZoom;
        }
        if (options.minZoom) this.minZoom = options.minZoom;
        if (options.maxZoom) this.maxZoom = options.maxZoom;

        this.currentX = this.worldWidth / 2;
        this.currentY = this.worldHeight / 2;
        this.targetX = this.currentX;
        this.targetY = this.currentY;

        this.updateTransform();
    }

    public resize(width: number, height: number): void {
        this.screenWidth = width;
        this.screenHeight = height;
        this.updateTransform();
    }

    public follow(x: number, y: number, immediate: boolean = false): void {
        this.targetX = x;
        this.targetY = y;
        if (immediate) {
            this.currentX = x;
            this.currentY = y;
            this.updateTransform();
        }
    }

    /**
     * Adjusts target zoom level smoothly.
     * Always zooms centered on player focus (center of screen) without lateral jumping.
     */
    public adjustZoom(delta: number): void {
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom + delta));
    }

    public setZoom(newZoom: number): void {
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        this.zoom = this.targetZoom;
        this.updateTransform();
    }

    public update(dt: number): void {
        // Smooth camera follow with lerp
        const lerpSpeed = 10.0;
        const factor = Math.min(1.0, lerpSpeed * dt);

        this.currentX += (this.targetX - this.currentX) * factor;
        this.currentY += (this.targetY - this.currentY) * factor;

        // Smooth zoom interpolation centered on camera focus (Rover)
        if (Math.abs(this.targetZoom - this.zoom) > 0.001) {
            this.zoom += (this.targetZoom - this.zoom) * Math.min(1.0, 12.0 * dt);
        } else {
            this.zoom = this.targetZoom;
        }

        this.updateTransform();
    }

    private updateTransform(): void {
        this.container.scale.set(this.zoom);
        this.container.x = (this.screenWidth / 2) - (this.currentX * this.zoom);
        this.container.y = (this.screenHeight / 2) - (this.currentY * this.zoom);
    }

    public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        return {
            x: (screenX - this.container.x) / this.zoom,
            y: (screenY - this.container.y) / this.zoom,
        };
    }

    public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        return {
            x: (worldX * this.zoom) + this.container.x,
            y: (worldY * this.zoom) + this.container.y,
        };
    }
}

