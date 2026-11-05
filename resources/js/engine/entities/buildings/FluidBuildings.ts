import { Graphics, Text, TextStyle } from 'pixi.js';
import { BaseBuildingEntity, type Direction } from './BaseBuildingEntity';
import { VENUS_THEME, drawInkedPanel, drawRivets } from '../../VenusArtTheme';

/**
 * Rurociąg Kwasowy (1x1) - Hermetyczny transport ciekłego kwasu siarkowego.
 */
export class PipeBuilding extends BaseBuildingEntity {
    public hasFluid: boolean = false;
    public fluidAmount: number = 0; // 0..100%
    private fluidPulseGfx: Graphics;

    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('pipe', gridX, gridY, 1, 1, direction, tileSize);
        this.fluidPulseGfx = new Graphics();
        this.container.addChild(this.fluidPulseGfx);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        this.graphics.clear();

        // 1. Miedziano-stalowa obudowa rurociągu z komiksowym tuszem
        drawInkedPanel(this.graphics, 2, 2, w - 4, h - 4, 4, VENUS_THEME.copperDark);
        drawRivets(this.graphics, 2, 2, w - 4, h - 4, 4, 1.2);

        // 2. Przeszklone okienko rewizyjne przepływu
        this.graphics.roundRect(8, 8, w - 16, h - 16, 2)
            .fill({ color: 0x090d16 })
            .stroke({ width: 1, color: VENUS_THEME.ink });

        this.updateFluidGfx();
    }

    public setHasFluid(hasFluid: boolean, amount: number = 1.0): void {
        if (this.hasFluid !== hasFluid || Math.abs(this.fluidAmount - amount) > 0.05) {
            this.hasFluid = hasFluid;
            this.fluidAmount = amount;
            this.updateFluidGfx();
        }
    }

    public override update(dt: number): void {
        super.update(dt);
        if (this.hasFluid) {
            // Subtle glowing pulse for toxic acid flow
            const pulse = 0.75 + Math.sin(this.animTimer * 5) * 0.25;
            this.fluidPulseGfx.alpha = pulse;
        }
    }

    private updateFluidGfx(): void {
        this.fluidPulseGfx.clear();
        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;

        if (this.hasFluid) {
            // Glowing sulfuric acid fluid stream inside pipe
            this.fluidPulseGfx.rect(9, 9, w - 18, h - 18)
                .fill({ color: 0x22c55e, alpha: 0.9 })
                .stroke({ width: 1, color: 0x86efac });

            this.fluidPulseGfx.circle(w / 2, h / 2, 3)
                .fill({ color: 0x4ade80 });
        }
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;

        // Fluid status badge
        const col = this.hasFluid ? 0x22c55e : 0x64748b;
        this.altGfx.circle(w / 2, h / 2, 5)
            .fill({ color: 0x020617, alpha: 0.85 })
            .stroke({ width: 1.5, color: col });

        this.altGfx.circle(w / 2, h / 2, 2.5).fill({ color: col });
    }
}

/**
 * Ekstraktor Kwasu (2x2) - Pompa ssąca wydobywająca kwas siarkowy z gejzerów powierzchniowych.
 */
export class AcidPumpBuilding extends BaseBuildingEntity {
    public isExtracting: boolean = false;
    private rotorGfx: Graphics;
    private rotorAngle: number = 0;

    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('acid_pump', gridX, gridY, 2, 2, direction, tileSize);
        this.rotorGfx = new Graphics();
        this.container.addChild(this.rotorGfx);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        this.graphics.clear();

        // 1. Masywna obudowa pompy kwasowej (Ciepła miedź + zieleń kwasowa + tusz)
        drawInkedPanel(this.graphics, 2, 2, w - 4, h - 4, 8, 0x14532d);
        drawRivets(this.graphics, 2, 2, w - 4, h - 4, 6);

        // 2. Centralna komora wirnika ssącego
        this.graphics.circle(w / 2, h / 2, 17)
            .fill({ color: 0x052e16 })
            .stroke({ width: 2.5, color: 0x4ade80 });

        // 3. Porty rurociągów
        this.graphics.roundRect(w / 2 - 6, 0, 12, 4, 1).fill({ color: VENUS_THEME.copperBase });
        this.graphics.roundRect(w / 2 - 6, h - 4, 12, 4, 1).fill({ color: VENUS_THEME.copperBase });
        this.graphics.roundRect(0, h / 2 - 6, 4, 12, 1).fill({ color: VENUS_THEME.copperBase });
        this.graphics.roundRect(w - 4, h / 2 - 6, 4, 12, 1).fill({ color: VENUS_THEME.copperBase });

        // Narysuj wirnik
        this.renderRotor(w, h);
    }

    private renderRotor(w: number, h: number): void {
        this.rotorGfx.clear();
        const cx = w / 2;
        const cy = h / 2;

        // 3-łopatkowa turbina obrotowa
        for (let i = 0; i < 3; i++) {
            const angle = this.rotorAngle + (i * Math.PI * 2) / 3;
            const tipX = cx + Math.cos(angle) * 12;
            const tipY = cy + Math.sin(angle) * 12;
            const perpX = -Math.sin(angle) * 3;
            const perpY = Math.cos(angle) * 3;

            this.rotorGfx.poly([
                { x: cx, y: cy },
                { x: tipX + perpX, y: tipY + perpY },
                { x: tipX, y: tipY },
            ]).fill({ color: 0x22c55e }).stroke({ width: 1, color: 0x86efac });
        }

        // Piasta wirnika
        this.rotorGfx.circle(cx, cy, 4).fill({ color: 0x0f172a }).stroke({ width: 1, color: 0x86efac });
    }

    public override update(dt: number): void {
        super.update(dt);
        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;

        // Obrót 3-łopatkowego wirnika
        const speed = this.isExtracting ? 8.0 : 1.5;
        this.rotorAngle += dt * speed;
        this.renderRotor(w, h);
    }

    public updateAltMode(active: boolean, hasPower: boolean = true): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const w = this.widthTiles * this.tileSize;

        const ledCol = (hasPower && this.isExtracting) ? 0x22c55e : (hasPower ? 0xf59e0b : 0xef4444);
        this.altGfx.circle(w - 8, 8, 4)
            .fill({ color: ledCol, alpha: 0.95 })
            .stroke({ width: 1, color: 0xffffff });
    }
}

/**
 * Rafineria Chemiczna (2x2) - Przetwarza kwas siarkowy w Ogniwa Kwasowe ($120).
 */
export class AcidRefineryBuilding extends BaseBuildingEntity {
    public hasAcidInput: boolean = false;
    private distillationVatGfx: Graphics;

    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('acid_refinery', gridX, gridY, 2, 2, direction, tileSize);
        this.distillationVatGfx = new Graphics();
        this.container.addChild(this.distillationVatGfx);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        this.graphics.clear();

        // 1. Chemiczna podstawa w stylu komiksowym (Szmaragd + Miedź + Tusz)
        drawInkedPanel(this.graphics, 2, 2, w - 4, h - 4, 8, 0x064e3b);
        drawRivets(this.graphics, 2, 2, w - 4, h - 4, 6);

        // 2. Dwa cylindryczne zbiorniki chemiczne
        // Lewy zbiornik
        this.graphics.roundRect(7, 6, 21, h - 12, 6)
            .fill({ color: 0x022c22 })
            .stroke({ width: 1.5, color: 0x34d399 });
        // Prawy zbiornik
        this.graphics.roundRect(w - 28, 6, 21, h - 12, 6)
            .fill({ color: 0x022c22 })
            .stroke({ width: 1.5, color: 0x34d399 });

        // Okienka inspekcyjne ze szmaragdowym kwasem (0x22C55E)
        this.graphics.roundRect(11, 14, 13, h - 28, 3)
            .fill({ color: 0x22c55e, alpha: 0.85 })
            .stroke({ width: 1, color: 0x86efac });

        this.graphics.roundRect(w - 24, 14, 13, h - 28, 3)
            .fill({ color: 0x22c55e, alpha: 0.85 })
            .stroke({ width: 1, color: 0x86efac });

        // 3. Połączenie srebrną rurą (0x94A3B8)
        this.graphics.roundRect(26, h / 2 - 3, w - 52, 6, 2)
            .fill({ color: 0x94A3B8 })
            .stroke({ width: 1, color: VENUS_THEME.ink });

        // 4. Mały manometr ciśnieniowy (ciśnieniomierz z czerwoną wskazówką)
        const gaugeX = w / 2;
        const gaugeY = h / 2 - 7;
        this.graphics.circle(gaugeX, gaugeY, 6)
            .fill({ color: 0xffffff })
            .stroke({ width: 1.5, color: 0x334155 });
        this.graphics.moveTo(gaugeX, gaugeY)
            .lineTo(gaugeX + 3, gaugeY - 3)
            .stroke({ width: 1.2, color: 0xef4444 });
    }

    public override update(dt: number): void {
        super.update(dt);
        if (this.hasAcidInput) {
            // Bubbling distillation reactor animation
            const h = this.heightTiles * this.tileSize;
            const bubbleY = 12 + Math.sin(this.animTimer * 4) * (h - 28);
            this.distillationVatGfx.clear();
            this.distillationVatGfx.circle(18, bubbleY, 3.5).fill({ color: 0x34d399, alpha: 0.8 });
            this.distillationVatGfx.circle(this.widthTiles * this.tileSize - 18, h - bubbleY, 3.5).fill({ color: 0x34d399, alpha: 0.8 });
        } else {
            this.distillationVatGfx.clear();
        }
    }

    public updateAltMode(active: boolean, hasPower: boolean = true): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;

        const barW = w - 12;
        const barH = 5;
        const barX = 6;
        const barY = h - 10;

        // Frame
        this.altGfx.rect(barX - 1, barY - 1, barW + 2, barH + 2)
            .fill({ color: 0x020617, alpha: 0.9 })
            .stroke({ width: 1, color: hasPower ? 0x10b981 : 0xef4444 });

        // Progress bar
        const fillW = Math.max(0, Math.min(barW, barW * this.processProgress));
        const fillColor = hasPower ? (this.hasAcidInput ? 0x22c55e : 0xf59e0b) : 0xef4444;
        if (fillW > 0) {
            this.altGfx.rect(barX, barY, fillW, barH).fill({ color: fillColor });
        }

        const ledCol = (hasPower && this.hasAcidInput) ? 0x22c55e : (hasPower ? 0xf59e0b : 0xef4444);
        this.altGfx.circle(w - 8, 8, 3.5).fill({ color: ledCol, alpha: 0.95 });
    }
}

