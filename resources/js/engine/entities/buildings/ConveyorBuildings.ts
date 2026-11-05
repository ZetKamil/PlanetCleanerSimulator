import { Container, Graphics } from 'pixi.js';
import { BaseBuildingEntity, type Direction } from './BaseBuildingEntity';
import { VENUS_THEME, drawInkedPanel, drawRivets } from '../../VenusArtTheme';

export type ConveyorShape =
    | 'straight'
    | 'turn_SW_to_E'
    | 'turn_NW_to_E'
    | 'turn_SE_to_W'
    | 'turn_NE_to_W'
    | 'turn_WS_to_S'
    | 'turn_ES_to_S'
    | 'turn_WN_to_N'
    | 'turn_EN_to_N';

export class ConveyorBuilding extends BaseBuildingEntity {
    public incomingDir: Direction | null = null;
    public isHopper: boolean = false;
    protected arrowContainer: Container;
    protected rollersGfx: Graphics;

    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('conveyor', gridX, gridY, 1, 1, direction, tileSize);
        this.rollersGfx = new Graphics();
        this.container.addChild(this.rollersGfx);
        this.arrowContainer = new Container();
        this.container.addChild(this.arrowContainer);
        this.initRender();
    }

    public setConnection(fromDir: Direction | null, hasHopper: boolean = false): void {
        if (this.incomingDir === fromDir && this.isHopper === hasHopper) return;
        this.incomingDir = fromDir;
        this.isHopper = hasHopper;
        this.graphics.clear();
        this.arrowContainer.removeChildren();
        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;
        this.render(w, h);
    }

    protected isCurvedTurn(): { isCurve: boolean; cornerX: number; cornerY: number; startAngle: number; endAngle: number } {
        if (!this.incomingDir) return { isCurve: false, cornerX: 0, cornerY: 0, startAngle: 0, endAngle: 0 };

        const T = this.tileSize;
        const from = this.incomingDir;
        const to = this.direction;

        // 8 możliwych łuków 90 stopni łączących prostopadłe krawędzie
        if (from === 'S' && to === 'E') {
            // Wchodzi od dołu (y=T), zakręca w prawo (x=T). Środek łuku w prawym dolnym rogu (T, T)
            return { isCurve: true, cornerX: T, cornerY: T, startAngle: Math.PI, endAngle: 1.5 * Math.PI };
        } else if (from === 'N' && to === 'E') {
            // Wchodzi od góry (y=0), zakręca w prawo (x=T). Środek łuku w prawym górnym rogu (T, 0)
            return { isCurve: true, cornerX: T, cornerY: 0, startAngle: Math.PI, endAngle: 0.5 * Math.PI };
        } else if (from === 'S' && to === 'W') {
            // Wchodzi od dołu (y=T), zakręca w lewo (x=0). Środek w lewym dolnym rogu (0, T)
            return { isCurve: true, cornerX: 0, cornerY: T, startAngle: 0, endAngle: 1.5 * Math.PI };
        } else if (from === 'N' && to === 'W') {
            // Wchodzi od góry (y=0), zakręca w lewo (x=0). Środek w lewym górnym rogu (0, 0)
            return { isCurve: true, cornerX: 0, cornerY: 0, startAngle: 0, endAngle: 0.5 * Math.PI };
        } else if (from === 'W' && to === 'S') {
            // Wchodzi z lewej (x=0), zakręca w dół (y=T). Środek w lewym dolnym rogu (0, T)
            return { isCurve: true, cornerX: 0, cornerY: T, startAngle: 1.5 * Math.PI, endAngle: 0 };
        } else if (from === 'E' && to === 'S') {
            // Wchodzi z prawej (x=T), zakręca w dół (y=T). Środek w prawym dolnym rogu (T, T)
            return { isCurve: true, cornerX: T, cornerY: T, startAngle: 1.5 * Math.PI, endAngle: Math.PI };
        } else if (from === 'W' && to === 'N') {
            // Wchodzi z lewej (x=0), zakręca w górę (y=0). Środek w lewym górnym rogu (0, 0)
            return { isCurve: true, cornerX: 0, cornerY: 0, startAngle: 0.5 * Math.PI, endAngle: 0 };
        } else if (from === 'E' && to === 'N') {
            // Wchodzi z prawej (x=T), zakręca w górę (y=0). Środek w prawym górnym rogu (T, 0)
            return { isCurve: true, cornerX: T, cornerY: 0, startAngle: 0.5 * Math.PI, endAngle: Math.PI };
        }

        return { isCurve: false, cornerX: 0, cornerY: 0, startAngle: 0, endAngle: 0 };
    }

    protected render(w: number, h: number): void {
        const curve = this.isCurvedTurn();

        if (curve.isCurve) {
            this.renderCurvedBelt(w, h, curve.cornerX, curve.cornerY, curve.startAngle, curve.endAngle, VENUS_THEME.beltArrow);
        } else {
            this.renderStraightBelt(w, h, VENUS_THEME.beltArrow, false);
        }
    }

    /**
     * Renderuje prosty odcinek taśmociągu w ulepszonym stylu przemysłowym (ETAP 4).
     */
    protected renderStraightBelt(w: number, h: number, arrowColor: number, isMk2: boolean): void {
        const gfx = this.graphics;
        const isHorizontal = this.direction === 'E' || this.direction === 'W';
        const railColor = isMk2 ? 0xF59E0B : 0x475569;

        // 1. Podstawa ramy taśmociągu (ciemny obrys zewnętrzny 0x0F172A)
        gfx.roundRect(1, 1, w - 2, h - 2, 4)
            .fill({ color: 0x0F172A })
            .stroke({ width: 2.5, color: 0x0F172A });

        if (isHorizontal) {
            // Ciemny pas transmisyjny (środek 0x1E293B)
            gfx.rect(0, 5, w, h - 10).fill({ color: 0x1E293B });

            // Stalowo-szare (Mk1) lub bursztynowo-złote (Mk2) bandy prowadzące
            gfx.rect(0, 2, w, 4).fill({ color: railColor }).stroke({ width: 1, color: 0x0F172A });
            gfx.rect(0, h - 6, w, 4).fill({ color: railColor }).stroke({ width: 1, color: 0x0F172A });

            // Nity na szynach
            gfx.circle(4, 4, 1.2).fill({ color: 0xCBD5E1 });
            gfx.circle(w - 4, 4, 1.2).fill({ color: 0xCBD5E1 });
            gfx.circle(4, h - 4, 1.2).fill({ color: 0xCBD5E1 });
            gfx.circle(w - 4, h - 4, 1.2).fill({ color: 0xCBD5E1 });
        } else {
            // Profil pionowy (N / S)
            gfx.rect(5, 0, w - 10, h).fill({ color: 0x1E293B });

            // Boczne szyny prowadzące (lewa i prawa)
            gfx.rect(2, 0, 4, h).fill({ color: railColor }).stroke({ width: 1, color: 0x0F172A });
            gfx.rect(w - 6, 0, 4, h).fill({ color: railColor }).stroke({ width: 1, color: 0x0F172A });

            // Nity
            gfx.circle(4, 4, 1.2).fill({ color: 0xCBD5E1 });
            gfx.circle(4, h - 4, 1.2).fill({ color: 0xCBD5E1 });
            gfx.circle(w - 4, 4, 1.2).fill({ color: 0xCBD5E1 });
            gfx.circle(w - 4, h - 4, 1.2).fill({ color: 0xCBD5E1 });
        }

        // Kołnierz wlotowy (Inlet Hopper) na początku linii
        if (this.isHopper) {
            this.renderInletHopper(w, h);
        }

        // Strzałka kierunkowa
        this.renderStraightArrow(w, h, arrowColor, isMk2);

        // Narysuj początkowe rolki
        this.renderAnimatedRollers();
    }

    public override update(dt: number): void {
        super.update(dt);
        this.renderAnimatedRollers();
    }

    protected renderAnimatedRollers(): void {
        this.rollersGfx.clear();
        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;
        const beltSpeed = this.type === 'conveyor_mk2' ? 64 : 32;
        const offset = (this.animTimer * beltSpeed) % 8;

        const isHorizontal = this.direction === 'E' || this.direction === 'W';
        const isForward = this.direction === 'E' || this.direction === 'S';

        if (isHorizontal) {
            const baseShift = isForward ? offset : (8 - offset);
            for (let x = baseShift - 8; x <= w + 8; x += 8) {
                if (x >= 2 && x <= w - 4) {
                    this.rollersGfx.rect(x, 6, 2, h - 12).fill({ color: 0x334155, alpha: 0.95 });
                }
            }
        } else {
            const baseShift = isForward ? offset : (8 - offset);
            for (let y = baseShift - 8; y <= h + 8; y += 8) {
                if (y >= 2 && y <= h - 4) {
                    this.rollersGfx.rect(6, y, w - 12, 2).fill({ color: 0x334155, alpha: 0.95 });
                }
            }
        }
    }

    /**
     * Renderuje idealnie zaokrąglony łuk 90 stopni (Curved 90° Turn) w stylu komiksowym.
     */
    protected renderCurvedBelt(
        w: number,
        h: number,
        cx: number,
        cy: number,
        a0: number,
        a1: number,
        arrowColor: number
    ): void {
        const gfx = this.graphics;
        const R_in = 6;
        const R_out = 26;
        const R_mid = 16;

        // Tło narożnika pod łukiem
        gfx.roundRect(1, 1, w - 2, h - 2, 4)
            .fill({ color: 0x12141a })
            .stroke({ width: 2.5, color: VENUS_THEME.beltBorder });

        // Łuk pasa transmisyjnego (antracytowa guma)
        // Rysowanie zaokrąglonego toru: zewnętrzny łuk, linia do wewnętrznego, wewnętrzny łuk powrotny
        const clockwise = a1 > a0;
        gfx.arc(cx, cy, R_out, a0, a1, !clockwise)
            .arc(cx, cy, R_in, a1, a0, clockwise)
            .fill({ color: VENUS_THEME.beltRubber })
            .stroke({ width: 2.5, color: VENUS_THEME.beltBorder, join: 'round' });

        // Wewnętrzne żebra łukowe pasa transmisyjnego
        const segments = 4;
        const angleSpan = a1 - a0;
        for (let i = 1; i < segments; i++) {
            const ang = a0 + (angleSpan * i) / segments;
            const x1 = cx + Math.cos(ang) * (R_in + 1);
            const y1 = cy + Math.sin(ang) * (R_in + 1);
            const x2 = cx + Math.cos(ang) * (R_out - 1);
            const y2 = cy + Math.sin(ang) * (R_out - 1);
            gfx.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 1.5, color: VENUS_THEME.beltRib });
        }

        // Zakrzywiona strzałka kierunkowa podążająca po łuku (R=16)
        const midAng = a0 + angleSpan * 0.50;
        const tipAng = a0 + angleSpan * 0.75;
        const baseAng = a0 + angleSpan * 0.25;

        const tipX = cx + Math.cos(tipAng) * R_mid;
        const tipY = cy + Math.sin(tipAng) * R_mid;
        const baseLeftX = cx + Math.cos(baseAng) * (R_mid - 4.5);
        const baseLeftY = cy + Math.sin(baseAng) * (R_mid - 4.5);
        const baseRightX = cx + Math.cos(baseAng) * (R_mid + 4.5);
        const baseRightY = cy + Math.sin(baseAng) * (R_mid + 4.5);

        const arrowGfx = new Graphics();
        arrowGfx.poly([
            { x: baseLeftX, y: baseLeftY },
            { x: tipX, y: tipY },
            { x: baseRightX, y: baseRightY },
        ]).fill({ color: arrowColor, alpha: 0.95 });

        this.arrowContainer.addChild(arrowGfx);
    }

    /**
     * Renderuje metalowy kołnierz/lejek wlotowy na początku linii taśmy.
     */
    private renderInletHopper(w: number, h: number): void {
        const gfx = this.graphics;
        // Kołnierz trapezowy w tylnej części taśmy
        switch (this.direction) {
            case 'E':
                gfx.poly([{ x: 0, y: 3 }, { x: 6, y: 6 }, { x: 6, y: h - 6 }, { x: 0, y: h - 3 }])
                    .fill({ color: VENUS_THEME.copperLight })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                break;
            case 'W':
                gfx.poly([{ x: w, y: 3 }, { x: w - 6, y: 6 }, { x: w - 6, y: h - 6 }, { x: w, y: h - 3 }])
                    .fill({ color: VENUS_THEME.copperLight })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                break;
            case 'S':
                gfx.poly([{ x: 3, y: 0 }, { x: 6, y: 6 }, { x: w - 6, y: 6 }, { x: w - 3, y: 0 }])
                    .fill({ color: VENUS_THEME.copperLight })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                break;
            case 'N':
                gfx.poly([{ x: 3, y: h }, { x: 6, y: h - 6 }, { x: w - 6, y: h - 6 }, { x: w - 3, y: h }])
                    .fill({ color: VENUS_THEME.copperLight })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                break;
        }
    }

    protected renderStraightArrow(w: number, h: number, color: number, double: boolean): void {
        let angle = 0;
        if (this.direction === 'E') angle = 0;
        else if (this.direction === 'S') angle = Math.PI / 2;
        else if (this.direction === 'W') angle = Math.PI;
        else if (this.direction === 'N') angle = -Math.PI / 2;

        const arrowGfx = new Graphics();
        // Dynamiczny, stylizowany komiksowy grot
        arrowGfx.poly([
            { x: -5, y: -4.5 },
            { x: 5, y: 0 },
            { x: -5, y: 4.5 },
        ]).fill({ color, alpha: 0.95 });

        if (double) {
            arrowGfx.poly([
                { x: -11, y: -4 },
                { x: -2, y: 0 },
                { x: -11, y: 4 },
            ]).fill({ color: 0x38bdf8, alpha: 0.9 });
        }

        arrowGfx.rotation = angle;
        arrowGfx.x = w / 2;
        arrowGfx.y = h / 2;
        this.arrowContainer.addChild(arrowGfx);
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
        if (!active) return;

        this.altGfx.clear();
        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;

        this.altGfx.circle(w / 2, h / 2, 7)
            .fill({ color: 0x0f172a, alpha: 0.9 })
            .stroke({ width: 1.5, color: VENUS_THEME.hazardYellow });

        let dx = 0; let dy = 0;
        if (this.direction === 'E') dx = 3;
        else if (this.direction === 'W') dx = -3;
        else if (this.direction === 'S') dy = 3;
        else if (this.direction === 'N') dy = -3;

        this.altGfx.circle(w / 2 + dx, h / 2 + dy, 2.5).fill({ color: VENUS_THEME.hazardYellow });
    }
}

export class ConveyorMk2Building extends ConveyorBuilding {
    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super(gridX, gridY, direction, tileSize);
        this.type = 'conveyor_mk2';
    }

    protected override render(w: number, h: number): void {
        const curve = this.isCurvedTurn();

        if (curve.isCurve) {
            this.renderCurvedBelt(w, h, curve.cornerX, curve.cornerY, curve.startAngle, curve.endAngle, VENUS_THEME.beltArrowMk2);
        } else {
            this.renderStraightBelt(w, h, VENUS_THEME.beltArrowMk2, true);
        }
    }
}

export class SplitterBuilding extends BaseBuildingEntity {
    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('splitter', gridX, gridY, 2, 1, direction, tileSize);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        // Ciepła terakotowo-miedziana obudowa
        drawInkedPanel(this.graphics, 1, 1, w - 2, h - 2, 6, VENUS_THEME.terracottaBase);
        drawRivets(this.graphics, 1, 1, w - 2, h - 2, 4);

        // Rozdzielone wewnętrzne tory transmisyjne
        this.graphics.roundRect(4, 4, (w / 2) - 6, h - 8, 3)
            .fill({ color: VENUS_THEME.beltRubber })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        this.graphics.roundRect((w / 2) + 2, 4, (w / 2) - 6, h - 8, 3)
            .fill({ color: VENUS_THEME.beltRubber })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        // Strzałki rozdzielające (Split 1 -> 2)
        this.graphics.poly([
            { x: w / 2 - 4, y: h / 2 },
            { x: w / 2 + 5, y: h / 2 - 7 },
            { x: w / 2 + 5, y: h / 2 + 7 },
        ]).fill({ color: VENUS_THEME.hazardYellow });
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
    }
}

export class SmartSplitterBuilding extends BaseBuildingEntity {
    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('smart_splitter', gridX, gridY, 2, 1, direction, tileSize);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        drawInkedPanel(this.graphics, 1, 1, w - 2, h - 2, 6, 0x1e1b4b);
        drawRivets(this.graphics, 1, 1, w - 2, h - 2, 4, 1.5, 0xa855f7);

        this.graphics.roundRect(4, 4, (w / 2) - 6, h - 8, 3)
            .fill({ color: 0x0f172a })
            .stroke({ width: 1.5, color: 0xa855f7 });

        this.graphics.roundRect((w / 2) + 2, 4, (w / 2) - 6, h - 8, 3)
            .fill({ color: 0x0f172a })
            .stroke({ width: 1.5, color: 0xa855f7 });

        // Mikroczip logiczny
        this.graphics.roundRect(w / 2 - 7, h / 2 - 7, 14, 14, 3)
            .fill({ color: 0x7e22ce })
            .stroke({ width: 1.5, color: 0x38bdf8 });

        this.graphics.poly([
            { x: w / 2 - 5, y: h / 2 },
            { x: w / 2 + 5, y: h / 2 - 7 },
            { x: w / 2 + 5, y: h / 2 + 7 },
        ]).fill({ color: 0x38bdf8 });
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
    }
}

export class MergerBuilding extends BaseBuildingEntity {
    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('merger', gridX, gridY, 2, 1, direction, tileSize);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        drawInkedPanel(this.graphics, 1, 1, w - 2, h - 2, 6, VENUS_THEME.copperBase);
        drawRivets(this.graphics, 1, 1, w - 2, h - 2, 4);

        this.graphics.roundRect(4, 4, (w / 2) - 6, h - 8, 3)
            .fill({ color: VENUS_THEME.beltRubber })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        this.graphics.roundRect((w / 2) + 2, 4, (w / 2) - 6, h - 8, 3)
            .fill({ color: VENUS_THEME.beltRubber })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        // Schodzące się chevrony
        this.graphics.poly([
            { x: w / 2 - 6, y: h / 2 - 5 },
            { x: w / 2 + 2, y: h / 2 },
            { x: w / 2 - 6, y: h / 2 + 5 },
        ]).fill({ color: VENUS_THEME.hazardYellow });

        this.graphics.poly([
            { x: w / 2 + 3, y: h / 2 - 4 },
            { x: w / 2 + 8, y: h / 2 },
            { x: w / 2 + 3, y: h / 2 + 4 },
        ]).fill({ color: VENUS_THEME.brightOrange });
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
    }
}

export class UndergroundBeltBuilding extends BaseBuildingEntity {
    public isEntrance: boolean = true;

    constructor(gridX: number, gridY: number, direction: Direction = 'E', tileSize: number = 32) {
        super('underground_belt', gridX, gridY, 1, 1, direction, tileSize);
        this.initRender();
    }

    protected render(w: number, h: number): void {
        drawInkedPanel(this.graphics, 2, 2, w - 4, h - 4, 5, VENUS_THEME.terracottaDark);

        // Otwór tunelu
        this.graphics.roundRect(5, 5, w - 10, h - 10, 3)
            .fill({ color: 0x05070d })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });

        // Daszek ostrzegawczy
        this.graphics.rect(4, 3, w - 8, 4).fill({ color: VENUS_THEME.hazardYellow });

        const arrow = new Graphics();
        arrow.poly([
            { x: -4, y: -4 },
            { x: 4, y: 0 },
            { x: -4, y: 4 },
        ]).fill({ color: VENUS_THEME.hazardYellow });

        let angle = 0;
        if (this.direction === 'E') angle = 0;
        else if (this.direction === 'S') angle = Math.PI / 2;
        else if (this.direction === 'W') angle = Math.PI;
        else if (this.direction === 'N') angle = -Math.PI / 2;

        arrow.rotation = angle;
        arrow.x = w / 2;
        arrow.y = h / 2;
        this.container.addChild(arrow);
    }

    public updateAltMode(active: boolean): void {
        this.altOverlayContainer.visible = active;
    }
}
