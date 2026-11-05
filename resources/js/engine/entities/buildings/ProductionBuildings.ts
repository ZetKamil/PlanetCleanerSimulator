import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BaseBuildingEntity, type Direction } from './BaseBuildingEntity';
import { VENUS_THEME, drawInkedPanel, drawRivets, drawHazardStripes, drawGlassWindow, drawCog } from '../../VenusArtTheme';

/**
 * Prasa Urobku („Scrap Packaging / Kompaktor”)
 * Wzorowana bezpośrednio na obiekcie ze zdjęcia venus-style-concept.jpg:
 * Retro-futurystyczny piecyk prasujący, industrialna terakota i beż,
 * przeszklone okienko inspekcyjne z animowanym tłokiem i zębatki z boku.
 */
export class PackagerBuilding extends BaseBuildingEntity {
    private pistonGfx: Graphics;
    private cogsGfx: Graphics;
    private gearAngle: number = 0;

    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('packager', gridX, gridY, 2, 2, direction, tileSize);

        this.pistonGfx = new Graphics();
        this.cogsGfx = new Graphics();
        this.container.addChild(this.pistonGfx);
        this.container.addChild(this.cogsGfx);

        this.initRender();
    }

    protected render(w: number, h: number): void {
        const gfx = this.graphics;

        // 1. Główny korpus retro-piecyka (Ciepła Terakota + Inked Outline)
        drawInkedPanel(gfx, 2, 2, w - 4, h - 4, 8, VENUS_THEME.terracottaBase);
        drawRivets(gfx, 2, 2, w - 4, h - 4, 6);

        // 2. Górna zaokrąglona pokrywa serwisowa (Industrialny Beż / Krem)
        drawInkedPanel(gfx, 7, 5, w - 14, 14, 4, VENUS_THEME.industrialBeige);
        gfx.circle(12, 12, 2).fill({ color: VENUS_THEME.hazardYellow });
        gfx.circle(w - 12, 12, 2).fill({ color: VENUS_THEME.hazardYellow });

        // Tabliczka znamionowa mikro
        gfx.roundRect(w / 2 - 14, 10, 28, 4, 1).fill({ color: 0x475569 });

        // 3. Przeszklone okienko inspekcyjne (środek komory prasującej)
        const winW = w - 24;
        const winH = 22;
        const winX = 12;
        const winY = 22;
        drawGlassWindow(gfx, winX, winY, winW, winH, 4);

        // 4. Dolny fundament i pasy ostrzegawcze na wylocie
        drawHazardStripes(gfx, 8, h - 14, w - 16, 8, 4);

        // 5. Porty wejściowe i wyjściowe
        this.renderStandardPorts(w, h);

        // Narysuj początkowy stan tłoka i zębatek
        this.renderPistonAndGears(w, h);
    }

    public override update(dt: number): void {
        super.update(dt);

        // Animacja obrotu zębatek
        this.gearAngle += dt * 3.0;

        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;
        this.renderPistonAndGears(w, h);
    }

    private renderPistonAndGears(w: number, h: number): void {
        // A. Animowany pionowy tłok prasy hydraulicznej wewnątrz szklanego okna
        this.pistonGfx.clear();

        const winW = w - 24;
        const winX = 12;
        const winY = 22;

        // Płynny ruch tłoka: opada i ściska urobek w rytm cyklu pracy
        const cycle = (Math.sin(this.animTimer * 4.5) + 1) / 2; // 0..1
        const pistonTravel = 10;
        const pistonY = winY + 2 + cycle * pistonTravel;

        // Prowadnica tłoka
        this.pistonGfx.rect(w / 2 - 2, winY + 1, 4, pistonY - winY).fill({ color: VENUS_THEME.midSteel });

        // Stopa tłoka (stalowy kloc prasujący)
        this.pistonGfx.roundRect(winX + 2, pistonY, winW - 4, 5, 2)
            .fill({ color: VENUS_THEME.lightSteel })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        // Błysk ciśnienia przy maksymalnym ściśnięciu
        if (cycle > 0.85) {
            this.pistonGfx.roundRect(winX + 4, winY + 14, winW - 8, 6, 2)
                .fill({ color: VENUS_THEME.glowAmber, alpha: 0.75 });
        }

        // B. Obracające się zewnętrzne zębatki z boku obudowy
        this.cogsGfx.clear();
        drawCog(this.cogsGfx, 8, 33, 5, 6, this.gearAngle, VENUS_THEME.copperLight, VENUS_THEME.ink);
        drawCog(this.cogsGfx, w - 8, 33, 5, 6, -this.gearAngle, VENUS_THEME.copperLight, VENUS_THEME.ink);
    }

    public updateAltMode(active: boolean, hasPower: boolean = true, packagerRatio: number = 0): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;

        const barW = w - 12;
        const barH = 5;
        const barX = 6;
        const barY = h - 8;

        this.altGfx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2)
            .fill({ color: 0x020617, alpha: 0.9 })
            .stroke({ width: 1, color: hasPower ? VENUS_THEME.glassCyan : VENUS_THEME.glowRed });

        const fillW = Math.max(0, Math.min(barW, barW * packagerRatio));
        const fillColor = hasPower ? 0x10b981 : VENUS_THEME.hazardYellow;
        if (fillW > 0) {
            this.altGfx.roundRect(barX, barY, fillW, barH, 2).fill({ color: fillColor });
        }

        const ledCol = hasPower ? VENUS_THEME.glowGreen : VENUS_THEME.glowRed;
        this.altGfx.circle(w - 7, 7, 3.5).fill({ color: ledCol, alpha: 0.95 });
    }
}

/**
 * Piec Hutniczy (Smelter) - Stylizowany na retro-industrialną cegielnię / piec tyglowy
 */
export class SmelterBuilding extends BaseBuildingEntity {
    private flameGfx: Graphics;

    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('smelter', gridX, gridY, 2, 2, direction, tileSize);
        this.flameGfx = new Graphics();
        this.container.addChild(this.flameGfx);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        const gfx = this.graphics;

        // 1. Obudowa pieca: industrialny grafit (0x333942) z miedziano-pomarańczowymi wzmocnieniami (0xD97706)
        drawInkedPanel(gfx, 2, 2, w - 4, h - 4, 8, 0x333942);
        drawRivets(gfx, 2, 2, w - 4, h - 4, 6);

        // Miedziano-pomarańczowe wzmocnienia narożników
        gfx.roundRect(4, 4, 10, 4, 1).fill({ color: 0xD97706 });
        gfx.roundRect(w - 14, 4, 10, 4, 1).fill({ color: 0xD97706 });
        gfx.roundRect(4, h - 8, 10, 4, 1).fill({ color: 0xD97706 });
        gfx.roundRect(w - 14, h - 8, 10, 4, 1).fill({ color: 0xD97706 });

        // 2 małe kominy wentylacyjne w górnych rogach
        gfx.roundRect(8, 4, 7, 9, 2).fill({ color: 0x1E222A }).stroke({ width: 1, color: VENUS_THEME.ink });
        gfx.roundRect(w - 15, 4, 7, 9, 2).fill({ color: 0x1E222A }).stroke({ width: 1, color: VENUS_THEME.ink });

        // 2. Komin wydechowy centralny z żebrami chłodzącymi
        gfx.roundRect(w / 2 - 10, 4, 20, 7, 2)
            .fill({ color: VENUS_THEME.darkSteel })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        // 3. Okrągły tygiel hutniczy z płynną lawą (0xFF5500)
        gfx.circle(w / 2, h / 2 + 3, 14)
            .fill({ color: 0x111318 })
            .stroke({ width: 3, color: VENUS_THEME.ink });

        gfx.circle(w / 2, h / 2 + 3, 11)
            .fill({ color: 0xFF5500 })
            .stroke({ width: 1.5, color: 0xD97706 });

        // Kratownica ochronna (2 czarne paski na krzyż)
        gfx.rect(w / 2 - 11, h / 2 + 2, 22, 2).fill({ color: 0x111318 });
        gfx.rect(w / 2 - 1, h / 2 - 8, 2, 22).fill({ color: 0x111318 });

        this.renderStandardPorts(w, h);
    }

    public override update(dt: number): void {
        super.update(dt);

        // Migoczące jądro płomieni w tyglu (0xFACC15)
        this.flameGfx.clear();
        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;
        const pulse = Math.sin(this.animTimer * 8) * 1.5;

        this.flameGfx.circle(w / 2, h / 2 + 3, 6 + pulse)
            .fill({ color: 0xFACC15, alpha: 0.90 });

        this.flameGfx.circle(w / 2, h / 2 + 3, 3)
            .fill({ color: 0xffffff, alpha: 0.95 });
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
        const barY = h - 8;

        this.altGfx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2)
            .fill({ color: 0x020617, alpha: 0.9 })
            .stroke({ width: 1, color: hasPower ? VENUS_THEME.glassCyan : VENUS_THEME.glowRed });

        const fillW = Math.max(0, Math.min(barW, barW * this.processProgress));
        const fillColor = hasPower ? 0x10b981 : VENUS_THEME.hazardYellow;
        if (fillW > 0) {
            this.altGfx.roundRect(barX, barY, fillW, barH, 2).fill({ color: fillColor });
        }

        const ledCol = hasPower ? VENUS_THEME.glowGreen : VENUS_THEME.glowRed;
        this.altGfx.circle(w - 7, 7, 3.5).fill({ color: ledCol, alpha: 0.95 });
    }
}

/**
 * Silo Magazynowe (Silo) - Zbiornik ciśnieniowy w stylu retro-industrialnym
 */
export class SiloBuilding extends BaseBuildingEntity {
    public storedDust: number = 0;
    public maxDustCapacity: number = 300;
    public isUnloading: boolean = false;
    public acceptsBots: boolean = true;
    private gaugeGfx: Graphics;
    private botBeaconGfx: Graphics;

    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('silo', gridX, gridY, 2, 2, direction, tileSize);
        this.gaugeGfx = new Graphics();
        this.container.addChild(this.gaugeGfx);
        this.botBeaconGfx = new Graphics();
        this.container.addChild(this.botBeaconGfx);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        const gfx = this.graphics;

        // Kremowo-stalowy dach silosu
        drawInkedPanel(gfx, 2, 2, w - 4, h - 4, 12, 0xE2E8F0);
        drawRivets(gfx, 2, 2, w - 4, h - 4, 6);

        // Miedziane opaski wzmacniające
        gfx.roundRect(4, 12, w - 8, 4, 1).fill({ color: VENUS_THEME.copperBase });
        gfx.roundRect(4, h - 16, w - 8, 4, 1).fill({ color: VENUS_THEME.copperBase });

        // Okrągły właz zasypowy ze stalowymi żebrami wzmacniającymi (4 linie gwiaździste)
        gfx.circle(w / 2, h / 2, 13)
            .fill({ color: 0x334155 })
            .stroke({ width: 2, color: VENUS_THEME.ink });

        gfx.circle(w / 2, h / 2, 5)
            .fill({ color: 0x64748B });

        // 4 linie gwiaździste od środka
        gfx.moveTo(w / 2 - 12, h / 2).lineTo(w / 2 + 12, h / 2).stroke({ width: 1.5, color: 0x94A3B8 });
        gfx.moveTo(w / 2, h / 2 - 12).lineTo(w / 2, h / 2 + 12).stroke({ width: 1.5, color: 0x94A3B8 });

        this.renderStandardPorts(w, h);
    }

    public override update(dt: number): void {
        super.update(dt);
        this.model.acceptsBots = this.acceptsBots;
        this.model.rawDustStored = this.storedDust;

        // Wskaźnik poziomu urobku w okienku wskaźnikowym
        this.gaugeGfx.clear();
        const w = this.widthTiles * this.tileSize;
        const fillPct = Math.min(1, this.storedDust / this.maxDustCapacity);

        // Pionowy wąski słupek z boku
        this.gaugeGfx.roundRect(8, 18, 5, 28, 2)
            .fill({ color: 0x090d16 })
            .stroke({ width: 1, color: VENUS_THEME.ink });

        if (fillPct > 0) {
            const hFill = 26 * fillPct;
            this.gaugeGfx.roundRect(9, 18 + (26 - hFill), 3, hFill, 1)
                .fill({ color: VENUS_THEME.hazardYellow });
        }

        // Pulsująca cyjanowa ikonka anteny dokowania dla Sweep-Botów na dachu
        this.botBeaconGfx.clear();
        if (this.acceptsBots) {
            const pulse = 0.65 + 0.35 * Math.sin(this.animTimer * 5);
            const cx = w / 2;
            const cy = 10;
            // Antenka dokowania i fale radiowe / strzałka w dół
            this.botBeaconGfx.circle(cx, cy, 3)
                .fill({ color: VENUS_THEME.glassCyan, alpha: pulse });
            this.botBeaconGfx.circle(cx, cy, 6)
                .stroke({ width: 1.2, color: VENUS_THEME.glassCyan, alpha: pulse * 0.7 });
            // Mała strzałka dokowania wskazująca w dół (w stronę włazu)
            this.botBeaconGfx.poly([
                { x: cx - 4, y: cy + 7 },
                { x: cx + 4, y: cy + 7 },
                { x: cx, y: cy + 11 },
            ]).fill({ color: VENUS_THEME.glassCyan, alpha: pulse });
        }
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;

        const fillPct = Math.min(1, this.storedDust / this.maxDustCapacity);
        const barW = w - 12;
        const barH = 5;

        this.altGfx.roundRect(6, h - 8, barW, barH, 2)
            .fill({ color: 0x020617, alpha: 0.9 })
            .stroke({ width: 1, color: VENUS_THEME.hazardYellow });

        if (fillPct > 0) {
            this.altGfx.roundRect(6, h - 8, barW * fillPct, barH, 2)
                .fill({ color: VENUS_THEME.hazardYellow });
        }
    }
}

export class VacuumTurretBuilding extends BaseBuildingEntity {
    public readonly suctionRadiusPx: number = 220;
    public turretAngle: number = 0;
    private turretHeadGfx: Graphics;

    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('vacuum_turret', gridX, gridY, 2, 2, direction, tileSize);
        this.turretHeadGfx = new Graphics();
        this.container.addChild(this.turretHeadGfx);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        const cx = w / 2;
        const cy = h / 2;

        drawInkedPanel(this.graphics, 3, 3, w - 6, h - 6, 8, VENUS_THEME.terracottaBase);
        drawRivets(this.graphics, 3, 3, w - 6, h - 6, 6);

        // Obrotowy pierścień łoża wieżyczki
        this.graphics.circle(cx, cy, 24)
            .fill({ color: 0x18181b })
            .stroke({ width: 2, color: VENUS_THEME.copperLight });

        this.renderStandardPorts(w, h);
        this.renderTurretHead(cx, cy);
    }

    private renderTurretHead(cx: number, cy: number): void {
        this.turretHeadGfx.clear();
        this.turretHeadGfx.x = cx;
        this.turretHeadGfx.y = cy;
        this.turretHeadGfx.rotation = this.turretAngle;

        // Kopuła turbiny
        this.turretHeadGfx.circle(0, 0, 14)
            .fill({ color: VENUS_THEME.copperDark })
            .stroke({ width: 2, color: VENUS_THEME.ink });

        // Rogi wlotowe
        this.turretHeadGfx.roundRect(8, -6, 12, 12, 2)
            .fill({ color: VENUS_THEME.industrialBeige })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        this.turretHeadGfx.rect(18, -4, 4, 8).fill({ color: 0x090d16 });

        // Centralne jądro
        this.turretHeadGfx.circle(0, 0, 5).fill({ color: VENUS_THEME.hazardYellow });
    }

    public updateRotation(angle: number): void {
        this.turretAngle = angle;
        const cx = (this.widthTiles * this.tileSize) / 2;
        const cy = (this.heightTiles * this.tileSize) / 2;
        this.renderTurretHead(cx, cy);
    }

    public updateAltMode(active: boolean, hasPower: boolean = true): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const cx = (this.widthTiles * this.tileSize) / 2;
        const cy = (this.heightTiles * this.tileSize) / 2;

        this.altGfx.circle(cx, cy, this.suctionRadiusPx)
            .stroke({ width: 1.5, color: hasPower ? VENUS_THEME.hazardYellow : VENUS_THEME.glowRed, alpha: 0.35 });
    }
}

export class AwesomeSinkBuilding extends BaseBuildingEntity {
    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('awesome_sink', gridX, gridY, 2, 2, direction, tileSize);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        drawInkedPanel(this.graphics, 2, 2, w - 4, h - 4, 8, VENUS_THEME.terracottaDark);
        drawRivets(this.graphics, 2, 2, w - 4, h - 4, 5);

        // Pasy ostrzegawcze
        drawHazardStripes(this.graphics, 4, 4, w - 8, 5, 4);
        drawHazardStripes(this.graphics, 4, h - 9, w - 8, 5, 4);

        // Komora niszczarki
        this.graphics.roundRect(10, 11, w - 20, h - 22, 4)
            .fill({ color: 0x090d16 })
            .stroke({ width: 2, color: VENUS_THEME.ink });

        // Obrotowe walce miażdżące
        this.graphics.circle(w / 2, h / 2, 11)
            .fill({ color: VENUS_THEME.copperLight })
            .stroke({ width: 2, color: VENUS_THEME.ink });

        this.graphics.circle(w / 2, h / 2, 4).fill({ color: VENUS_THEME.glowRed });

        this.renderStandardPorts(w, h);
    }

    public updateAltMode(active: boolean, hasPower: boolean = true): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const w = this.widthTiles * this.tileSize;
        const ledCol = hasPower ? VENUS_THEME.glowGreen : VENUS_THEME.glowRed;
        this.altGfx.circle(w - 7, 7, 3.5).fill({ color: ledCol });
    }
}
