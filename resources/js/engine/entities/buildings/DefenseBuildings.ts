import { Graphics, Text, TextStyle } from 'pixi.js';
import { BaseBuildingEntity, type Direction } from './BaseBuildingEntity';
import { VENUS_THEME, drawInkedPanel, drawRivets } from '../../VenusArtTheme';

export class DockBuilding extends BaseBuildingEntity {
    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('dock', gridX, gridY, 1, 1, direction, tileSize);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        const gfx = this.graphics;

        // Podstawa stacji ładującej w kolorze ciepłej miedzi i węgla
        drawInkedPanel(gfx, 2, 2, w - 4, h - 4, 5, VENUS_THEME.copperDark);
        drawRivets(gfx, 2, 2, w - 4, h - 4, 3);

        // Magnetyczny pad dokujący bota z pulsującym pierścieniem
        gfx.circle(w / 2, h / 2, 10)
            .fill({ color: 0x090d16 })
            .stroke({ width: 1.5, color: VENUS_THEME.hazardYellow });

        gfx.circle(w / 2, h / 2, 4).fill({ color: VENUS_THEME.hazardYellow });
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
    }
}

export class ShieldPylonBuilding extends BaseBuildingEntity {
    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('shield_pylon', gridX, gridY, 2, 2, direction, tileSize);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        const gfx = this.graphics;

        // Pancerz generatora pola ochronnego w ciepłej terakocie z nitami
        drawInkedPanel(gfx, 2, 2, w - 4, h - 4, 8, VENUS_THEME.terracottaBase);
        drawRivets(gfx, 2, 2, w - 4, h - 4, 6);

        // 4 emitery narożne pola
        const corners = [
            { x: 8, y: 8 },
            { x: w - 8, y: 8 },
            { x: 8, y: h - 8 },
            { x: w - 8, y: h - 8 },
        ];
        for (const c of corners) {
            gfx.circle(c.x, c.y, 4)
                .fill({ color: VENUS_THEME.glassCyan })
                .stroke({ width: 1, color: VENUS_THEME.ink });
        }

        // Centralny kryształ emitora tarczy
        gfx.circle(w / 2, h / 2, 13)
            .fill({ color: 0x0284c7 })
            .stroke({ width: 2.5, color: VENUS_THEME.ink });

        gfx.circle(w / 2, h / 2, 6).fill({ color: 0xffffff });

        const style = new TextStyle({ fontSize: 8, fill: '#67e8f9', fontFamily: 'monospace', fontWeight: 'bold' });
        const label = new Text({ text: 'TARCZA', style });
        label.anchor.set(0.5, 0.5);
        label.x = w / 2;
        label.y = h / 2;
        this.container.addChild(label);
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const cx = (this.widthTiles * this.tileSize) / 2;
        const cy = (this.heightTiles * this.tileSize) / 2;
        this.altGfx.circle(cx, cy, 240)
            .stroke({ width: 2, color: VENUS_THEME.glassCyan, alpha: 0.35 });
    }
}
