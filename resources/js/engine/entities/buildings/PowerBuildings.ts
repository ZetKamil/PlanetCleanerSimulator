import { Graphics, Text, TextStyle } from 'pixi.js';
import { BaseBuildingEntity, type Direction } from './BaseBuildingEntity';
import { VENUS_THEME, drawInkedPanel, drawRivets } from '../../VenusArtTheme';

export class SolarBuilding extends BaseBuildingEntity {
    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('solar', gridX, gridY, 2, 2, direction, tileSize);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        const gfx = this.graphics;

        // Ciepła terakotowo-miedziana rama panelu słonecznego
        drawInkedPanel(gfx, 2, 2, w - 4, h - 4, 6, VENUS_THEME.copperDark);
        drawRivets(gfx, 2, 2, w - 4, h - 4, 5);

        // 4 fotowoltaiczne ogniwa słoneczne
        const halfW = w / 2;
        const halfH = h / 2;
        const pad = 4;
        const cellW = halfW - 6;
        const cellH = halfH - 6;

        const cells = [
            { x: pad, y: pad },
            { x: halfW + 2, y: pad },
            { x: pad, y: halfH + 2 },
            { x: halfW + 2, y: halfH + 2 },
        ];

        for (const c of cells) {
            gfx.roundRect(c.x, c.y, cellW, cellH, 3)
                .fill({ color: 0x075985 })
                .stroke({ width: 1.5, color: VENUS_THEME.ink });

            // Złote ścieżki krzemowe
            gfx.moveTo(c.x + 3, c.y + cellH / 2).lineTo(c.x + cellW - 3, c.y + cellH / 2)
                .stroke({ width: 1, color: VENUS_THEME.hazardYellow, alpha: 0.7 });
        }

        const style = new TextStyle({ fontSize: 11, fill: '#facc15', fontFamily: 'monospace', fontWeight: 'bold' });
        const bolt = new Text({ text: '⚡', style });
        bolt.anchor.set(0.5, 0.5);
        bolt.x = w / 2;
        bolt.y = h / 2;
        this.container.addChild(bolt);
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const w = this.widthTiles * this.tileSize;
        this.altGfx.roundRect(w / 2 - 20, 4, 40, 12, 2)
            .fill({ color: 0x0f172a, alpha: 0.9 })
            .stroke({ width: 1, color: VENUS_THEME.glowGreen });
    }
}

export class GeothermalBuilding extends BaseBuildingEntity {
    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('geothermal', gridX, gridY, 2, 2, direction, tileSize);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        const gfx = this.graphics;

        // Pancerz w kolorze głębokiej terakoty i rdzy
        drawInkedPanel(gfx, 2, 2, w - 4, h - 4, 8, VENUS_THEME.terracottaBase);
        drawRivets(gfx, 2, 2, w - 4, h - 4, 6);

        // Radiatory / wymienniki ciepła
        gfx.roundRect(6, 6, w - 12, 6, 2).fill({ color: VENUS_THEME.copperLight });
        gfx.roundRect(6, h - 12, w - 12, 6, 2).fill({ color: VENUS_THEME.copperLight });

        // Komora turbiny geotermalnej
        gfx.circle(w / 2, h / 2, 14)
            .fill({ color: VENUS_THEME.warmRust })
            .stroke({ width: 2.5, color: VENUS_THEME.ink });

        gfx.circle(w / 2, h / 2, 8)
            .fill({ color: VENUS_THEME.hazardYellow })
            .stroke({ width: 1.5, color: 0xffffff });

        const style = new TextStyle({ fontSize: 8, fill: '#0a0a10', fontFamily: 'monospace', fontWeight: 'bold' });
        const label = new Text({ text: 'GEO', style });
        label.anchor.set(0.5, 0.5);
        label.x = w / 2;
        label.y = h / 2;
        this.container.addChild(label);
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const w = this.widthTiles * this.tileSize;
        this.altGfx.roundRect(w / 2 - 20, 4, 40, 12, 2)
            .fill({ color: 0x0f172a, alpha: 0.9 })
            .stroke({ width: 1, color: VENUS_THEME.glowGreen });
    }
}

export class PowerPylonBuilding extends BaseBuildingEntity {
    public readonly connectionRangePx: number = 320;

    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('power_pylon', gridX, gridY, 1, 1, direction, tileSize);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        const gfx = this.graphics;
        const cx = w / 2;
        const cy = h / 2;

        // Podstawa słupa z komiksowym obrysem
        gfx.circle(cx, cy, 12)
            .fill({ color: VENUS_THEME.darkSteel })
            .stroke({ width: 2.5, color: VENUS_THEME.ink });

        // Kratownica słupa (stal miedziana)
        gfx.roundRect(cx - 10, cy - 3, 20, 6, 2)
            .fill({ color: VENUS_THEME.copperLight })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        gfx.roundRect(cx - 3, cy - 10, 6, 20, 2)
            .fill({ color: VENUS_THEME.copperLight })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        // Ceramiczne izolatory bursztynowe na ramionach
        const insulators = [
            { x: cx - 8, y: cy - 8 },
            { x: cx + 8, y: cy - 8 },
            { x: cx - 8, y: cy + 8 },
            { x: cx + 8, y: cy + 8 },
        ];
        for (const ins of insulators) {
            gfx.circle(ins.x, ins.y, 2.5)
                .fill({ color: VENUS_THEME.hazardYellow })
                .stroke({ width: 1, color: VENUS_THEME.ink });
        }

        // Centralny rdzeń transformatora
        gfx.circle(cx, cy, 3.5).fill({ color: VENUS_THEME.glowAmber });
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const cx = this.tileSize / 2;
        const cy = this.tileSize / 2;
        this.altGfx.circle(cx, cy, this.connectionRangePx)
            .stroke({ width: 1.5, color: VENUS_THEME.hazardYellow, alpha: 0.25 });
    }
}
