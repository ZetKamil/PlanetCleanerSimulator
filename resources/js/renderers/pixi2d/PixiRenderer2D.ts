/**
 * Planet Cleaner Simulator - PixiRenderer2D (v0.1 Classic 2D)
 * Implements IWorldRenderer using PixiJS v8.
 */

import { Application, Container, Graphics } from 'pixi.js';
import type { IWorldRenderer, WorldRenderState } from '../IWorldRenderer';

export class PixiRenderer2D implements IWorldRenderer {
    public readonly id = 'pixi2d' as const;

    public app: Application | null = null;
    public stage: Container | null = null;
    public dirtEraseLayer: Graphics | null = null;

    private container: HTMLElement | null = null;
    private isInitialized: boolean = false;

    public async init(container: HTMLElement): Promise<void> {
        this.container = container;
        this.app = new Application();

        await this.app.init({
            resizeTo: container,
            backgroundColor: 0x0a0a10,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        container.appendChild(this.app.canvas);
        this.stage = this.app.stage;

        this.dirtEraseLayer = new Graphics();
        this.stage.addChild(this.dirtEraseLayer);

        this.isInitialized = true;
    }

    public renderTick(worldState: WorldRenderState, deltaSeconds: number): void {
        if (!this.isInitialized || !this.app || !this.stage) return;

        // Visual update driven by headless worldState
        if (worldState.dirtyRegions && worldState.dirtyRegions.length > 0) {
            for (const region of worldState.dirtyRegions) {
                if (region.shape === 'circle' && region.params) {
                    this.eraseDirtVisual(region.params.x, region.params.y, region.params.radius);
                }
            }
        }
    }

    public eraseDirtVisual(x: number, y: number, radius: number): void {
        if (!this.dirtEraseLayer) return;
        // Erase circle on visual texture
        this.dirtEraseLayer.circle(x, y, radius).fill({ color: 0xffffff, alpha: 1.0 });
    }

    public onResize(width: number, height: number): void {
        if (this.app?.renderer) {
            this.app.renderer.resize(width, height);
        }
    }

    public destroy(): void {
        if (this.app) {
            this.app.destroy(true, { children: true, texture: true });
            this.app = null;
        }
        this.stage = null;
        this.dirtEraseLayer = null;
        this.isInitialized = false;
    }
}

