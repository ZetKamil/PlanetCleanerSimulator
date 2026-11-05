import { Container, Graphics } from 'pixi.js';

export interface SectorConfig {
    id: string;
    u: number;
    v: number;
    cx: number;
    cy: number;
    size: number; // 512px
}

export class RhombusSector {
    public readonly id: string;
    public readonly u: number;
    public readonly v: number;
    public readonly cx: number;
    public readonly cy: number;
    public readonly size: number;
    public readonly halfSize: number;

    public cleanPercentage: number = 0;
    public isClaimed: boolean = false;
    public readonly bonusMultiplier: number = 0.10; // +10% bonus when claimed

    public container: Container;
    public borderGfx: Graphics;

    constructor(config: SectorConfig) {
        this.id = config.id;
        this.u = config.u;
        this.v = config.v;
        this.cx = config.cx;
        this.cy = config.cy;
        this.size = config.size;
        this.halfSize = config.size / 2;

        this.container = new Container();
        this.container.visible = false; // Hidden in normal view (Option A: Alt-mode & Minimap [M] only)
        this.borderGfx = new Graphics();
        this.container.addChild(this.borderGfx);
    }

    /**
     * Renders tactical sector boundary in Alt-Mode [ALT].
     * In normal view, sector borders are completely hidden so the landscape remains 100% organic.
     */
    public setAltMode(active: boolean): void {
        this.container.visible = active;
        if (!active) {
            this.borderGfx.clear();
            return;
        }

        this.borderGfx.clear();
        const hw = this.halfSize;
        const hh = this.halfSize;

        const color = this.isClaimed ? 0x38bdf8 : 0x64748b;
        const alpha = this.isClaimed ? 0.45 : 0.25;

        this.borderGfx.moveTo(this.cx, this.cy - hh)
            .lineTo(this.cx + hw, this.cy)
            .lineTo(this.cx, this.cy + hh)
            .lineTo(this.cx - hw, this.cy)
            .closePath()
            .stroke({ width: 1.5, color, alpha });
    }

    public updateCleanliness(pct: number): void {
        this.cleanPercentage = Math.min(100, Math.max(0, Number(pct.toFixed(1))));
    }

    public claim(): boolean {
        if (this.isClaimed) return false;
        this.isClaimed = true;
        this.cleanPercentage = 100;
        return true;
    }

    public contains(px: number, py: number): boolean {
        const dx = Math.abs(px - this.cx);
        const dy = Math.abs(py - this.cy);
        return (dx / this.halfSize) + (dy / this.halfSize) <= 1.0;
    }

    public destroy(): void {
        this.borderGfx.destroy();
        this.container.destroy({ children: true });
    }
}
