import { Container, Graphics } from 'pixi.js';
import type { BuildingType } from './BuildingConfigs';
import { VENUS_THEME, drawInkedPanel, drawRivets, drawHazardStripes, drawGlassWindow } from '../../VenusArtTheme';
import { BuildingModel } from '../../../core/models/BuildingModel';

export type Direction = 'N' | 'E' | 'S' | 'W';

export interface BuildingPort {
    gx: number;
    gy: number;
    dir: Direction;
}

export interface IBuilding {
    id: string;
    type: BuildingType;
    gridX: number;
    gridY: number;
    direction: Direction;
    widthTiles: number;
    heightTiles: number;
    tileSize: number;
    container: Container;
    hasItem: boolean;
    update(dt: number): void;
    updateAltMode(active: boolean, hasPower?: boolean, extraRatio?: number): void;
    destroy(): void;
}

/**
 * Klasa bazowa dla wszystkich obiektów infrastruktury fabrycznej (OCP & Polimorfizm).
 */
export abstract class BaseBuildingEntity implements IBuilding {
    public id: string;
    public type: BuildingType;
    public gridX: number;
    public gridY: number;
    public direction: Direction;
    public widthTiles: number;
    public heightTiles: number;
    public tileSize: number;
    public readonly model: BuildingModel;

    public container: Container;
    public graphics: Graphics;
    protected statusLedGfx: Graphics;
    protected altOverlayContainer: Container;
    protected altGfx: Graphics;

    public hasPower: boolean = true;
    public isWorking: boolean = false;

    protected animTimer: number = 0;
    protected itemOnBelt: Graphics | null = null;
    public hasItem: boolean = false;
    public currentItemType: 'dust_bag' | 'briquette' | 'plate' | 'acid_cell' = 'briquette';

    // Stan specyficzny maszyn
    public inventoryCount: number = 0;
    public processProgress: number = 0;

    constructor(
        type: BuildingType,
        gridX: number,
        gridY: number,
        widthTiles: number = 1,
        heightTiles: number = 1,
        direction: Direction = 'E',
        tileSize: number = 32
    ) {
        this.id = `${type}_${gridX}_${gridY}_${Date.now()}`;
        this.type = type;
        this.gridX = gridX;
        this.gridY = gridY;
        this.direction = direction;
        this.widthTiles = widthTiles;
        this.heightTiles = heightTiles;
        this.tileSize = tileSize;

        this.model = new BuildingModel({
            id: this.id,
            type: this.type,
            gridX: this.gridX,
            gridY: this.gridY,
            direction: this.direction,
            acceptsBots: this.type === 'silo',
        });

        this.container = new Container();
        this.container.x = gridX * tileSize;
        this.container.y = gridY * tileSize;

        this.graphics = new Graphics();
        this.container.addChild(this.graphics);

        // Status LED Gfx (ETAP 3: Diody statusu na maszynach 2x2)
        this.statusLedGfx = new Graphics();
        this.container.addChild(this.statusLedGfx);

        // Alt-Mode Overlay
        this.altOverlayContainer = new Container();
        this.altOverlayContainer.visible = false;
        this.altGfx = new Graphics();
        this.altOverlayContainer.addChild(this.altGfx);
        this.container.addChild(this.altOverlayContainer);
    }

    protected initRender(): void {
        const w = this.widthTiles * this.tileSize;
        const h = this.heightTiles * this.tileSize;

        // 1. Cień bazowy pod każdym budynkiem i taśmociągiem (przesunięty o x: +4px, y: +5px)
        this.graphics.roundRect(4, 5, w, h, 6).fill({ color: 0x000000, alpha: 0.45 });

        // 2. Stalowa płyta fundamentowa (Baseplate) dla budynków 2x2 i 3x3
        if (this.widthTiles >= 2 && this.heightTiles >= 2) {
            this.graphics.roundRect(0, 0, w, h, 6)
                .fill({ color: 0x252932 })
                .stroke({ width: 2, color: 0x111318 });

            // 4 jasne śruby 0x64748B w narożnikach
            this.graphics.circle(4, 4, 1.5).fill({ color: 0x64748B });
            this.graphics.circle(w - 4, 4, 1.5).fill({ color: 0x64748B });
            this.graphics.circle(4, h - 4, 1.5).fill({ color: 0x64748B });
            this.graphics.circle(w - 4, h - 4, 1.5).fill({ color: 0x64748B });

            // Fazowanie: jasna krawędź od góry (alpha 0.25), ciemna od dołu (alpha 0.45)
            this.graphics.moveTo(3, 2).lineTo(w - 3, 2).stroke({ width: 1, color: 0xffffff, alpha: 0.25 });
            this.graphics.moveTo(3, h - 2).lineTo(w - 3, h - 2).stroke({ width: 1, color: 0x000000, alpha: 0.45 });
        }

        this.render(w, h);
    }

    protected abstract render(w: number, h: number): void;
    public abstract updateAltMode(active: boolean, hasPower?: boolean, extraRatio?: number): void;

    /**
     * Zwraca precyzyjny kafelek wlotowy (INLET PORT) maszyny produkcyjnej 2x2.
     * Tylko taśmociąg doprowadzający urobek do tego kafelka zostanie przyjęty przez maszynę.
     */
    public getInputPort(): BuildingPort | null {
        if (this.widthTiles !== 2 || this.heightTiles !== 2) return null;
        switch (this.direction) {
            case 'E': return { gx: this.gridX, gy: this.gridY, dir: 'E' };
            case 'W': return { gx: this.gridX + 1, gy: this.gridY, dir: 'W' };
            case 'S': return { gx: this.gridX, gy: this.gridY, dir: 'S' };
            case 'N': return { gx: this.gridX, gy: this.gridY + 1, dir: 'N' };
        }
    }

    /**
     * Zwraca precyzyjny kafelek wylotowy (OUTLET PORT) maszyny produkcyjnej 2x2
     * oraz kafelek zewnętrzny, na który maszyna wypycha gotowe produkty.
     */
    public getOutputPort(): { gx: number; gy: number; outboundGX: number; outboundGY: number; dir: Direction } | null {
        if (this.widthTiles !== 2 || this.heightTiles !== 2) return null;
        switch (this.direction) {
            case 'E':
                return { gx: this.gridX + 1, gy: this.gridY, outboundGX: this.gridX + 2, outboundGY: this.gridY, dir: 'E' };
            case 'W':
                return { gx: this.gridX, gy: this.gridY, outboundGX: this.gridX - 1, outboundGY: this.gridY, dir: 'W' };
            case 'S':
                return { gx: this.gridX, gy: this.gridY + 1, outboundGX: this.gridX, outboundGY: this.gridY + 2, dir: 'S' };
            case 'N':
                return { gx: this.gridX, gy: this.gridY, outboundGX: this.gridX, outboundGY: this.gridY - 1, dir: 'N' };
        }
    }

    /**
     * Renderuje wyraźne wizualnie wloty (INLET) i wyloty (OUTLET) dla maszyn 2x2.
     * Stylizowane na metalowe kołnierze i gardziele z retro-industrialnymi nitami.
     */
    protected renderStandardPorts(w: number, h: number): void {
        const portGfx = this.graphics;
        // INLET: Miedziany kołnierz wlotowy z błękitnym wskaźnikiem zasysania
        // OUTLET: Pancerne gardziele wyjściowe z żółto-czarnymi chevronami
        switch (this.direction) {
            case 'E':
                // INLET on left edge
                portGfx.roundRect(0, 4, 8, 24, 3)
                    .fill({ color: VENUS_THEME.copperDark })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                portGfx.rect(2, 6, 4, 20).fill({ color: 0x090d16 });
                portGfx.poly([{ x: 2, y: 10 }, { x: 5, y: 16 }, { x: 2, y: 22 }]).fill({ color: VENUS_THEME.glassCyan });

                // OUTLET on right edge
                portGfx.roundRect(w - 8, 4, 8, 24, 3)
                    .fill({ color: VENUS_THEME.terracottaBase })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                portGfx.rect(w - 6, 6, 4, 20).fill({ color: 0x090d16 });
                portGfx.poly([{ x: w - 5, y: 10 }, { x: w - 2, y: 16 }, { x: w - 5, y: 22 }]).fill({ color: VENUS_THEME.hazardYellow });
                break;
            case 'W':
                // INLET on right edge
                portGfx.roundRect(w - 8, 4, 8, 24, 3)
                    .fill({ color: VENUS_THEME.copperDark })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                portGfx.rect(w - 6, 6, 4, 20).fill({ color: 0x090d16 });
                portGfx.poly([{ x: w - 2, y: 10 }, { x: w - 5, y: 16 }, { x: w - 2, y: 22 }]).fill({ color: VENUS_THEME.glassCyan });

                // OUTLET on left edge
                portGfx.roundRect(0, 4, 8, 24, 3)
                    .fill({ color: VENUS_THEME.terracottaBase })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                portGfx.rect(2, 6, 4, 20).fill({ color: 0x090d16 });
                portGfx.poly([{ x: 2, y: 10 }, { x: 0, y: 16 }, { x: 2, y: 22 }]).fill({ color: VENUS_THEME.hazardYellow });
                break;
            case 'S':
                // INLET on top edge
                portGfx.roundRect(4, 0, 24, 8, 3)
                    .fill({ color: VENUS_THEME.copperDark })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                portGfx.rect(6, 2, 20, 4).fill({ color: 0x090d16 });
                portGfx.poly([{ x: 10, y: 2 }, { x: 16, y: 5 }, { x: 22, y: 2 }]).fill({ color: VENUS_THEME.glassCyan });

                // OUTLET on bottom edge
                portGfx.roundRect(4, h - 8, 24, 8, 3)
                    .fill({ color: VENUS_THEME.terracottaBase })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                portGfx.rect(6, h - 6, 20, 4).fill({ color: 0x090d16 });
                portGfx.poly([{ x: 10, y: h - 5 }, { x: 16, y: h - 2 }, { x: 22, y: h - 5 }]).fill({ color: VENUS_THEME.hazardYellow });
                break;
            case 'N':
                // INLET on bottom edge
                portGfx.roundRect(4, h - 8, 24, 8, 3)
                    .fill({ color: VENUS_THEME.copperDark })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                portGfx.rect(6, h - 6, 20, 4).fill({ color: 0x090d16 });
                portGfx.poly([{ x: 10, y: h - 2 }, { x: 16, y: h - 5 }, { x: 22, y: h - 2 }]).fill({ color: VENUS_THEME.glassCyan });

                // OUTLET on top edge
                portGfx.roundRect(4, 0, 24, 8, 3)
                    .fill({ color: VENUS_THEME.terracottaBase })
                    .stroke({ width: 2, color: VENUS_THEME.ink });
                portGfx.rect(6, 2, 20, 4).fill({ color: 0x090d16 });
                portGfx.poly([{ x: 10, y: 5 }, { x: 16, y: 2 }, { x: 22, y: 5 }]).fill({ color: VENUS_THEME.hazardYellow });
                break;
        }
    }

    public update(dt: number): void {
        this.animTimer += dt;
        if (this.widthTiles >= 2 && this.heightTiles >= 2) {
            this.renderStatusLed();
        }
    }

    protected renderStatusLed(): void {
        this.statusLedGfx.clear();
        const w = this.widthTiles * this.tileSize;
        const ledX = w - 8;
        const ledY = 8;

        let color = 0x10B981; // Zielona (maszyna pracuje)
        let alpha = 1.0;

        if (!this.hasPower) {
            // Czerwona mrugająca co 500ms (brak prądu w sieci)
            color = 0xEF4444;
            const blink = Math.floor(this.animTimer * 2) % 2 === 0;
            alpha = blink ? 1.0 : 0.2;
        } else if (!this.isWorking) {
            // Żółta (czekanie na surowiec lub zatkane wyjście)
            color = 0xF59E0B;
        }

        this.statusLedGfx.circle(ledX, ledY, 4).fill({ color: 0x111111 });
        this.statusLedGfx.circle(ledX, ledY, 3).fill({ color, alpha });
        if (alpha > 0.5) {
            this.statusLedGfx.circle(ledX - 1, ledY - 1, 1).fill({ color: 0xffffff, alpha: 0.8 });
        }
    }

    public setItemOnBelt(present: boolean, itemType: 'dust_bag' | 'briquette' | 'plate' | 'acid_cell' = 'briquette'): void {
        this.hasItem = present;
        this.currentItemType = itemType;

        if (present && !this.itemOnBelt) {
            this.itemOnBelt = new Graphics();
            if (itemType === 'plate') {
                this.itemOnBelt.rect(-7, -4, 14, 8)
                    .fill({ color: 0x38bdf8 })
                    .stroke({ width: 1.5, color: 0xffffff });
                this.itemOnBelt.rect(-4, -2, 8, 4).fill({ color: 0x0284c7 });
            } else if (itemType === 'acid_cell') {
                // Highly valuable glowing Acid Power Cell
                this.itemOnBelt.roundRect(-6, -6, 12, 12, 3)
                    .fill({ color: 0x15803d })
                    .stroke({ width: 1.5, color: 0x4ade80 });
                this.itemOnBelt.circle(0, 0, 3).fill({ color: 0x86efac });
            } else if (itemType === 'dust_bag') {
                this.itemOnBelt.roundRect(-5, -5, 10, 10, 2)
                    .fill({ color: 0x334155 })
                    .stroke({ width: 1, color: 0xfacc15 });
            } else {
                this.itemOnBelt.rect(-5, -5, 10, 10)
                    .fill({ color: 0x1f2937 })
                    .stroke({ width: 1, color: 0xf59e0b });
            }
            this.itemOnBelt.x = (this.widthTiles * this.tileSize) / 2;
            this.itemOnBelt.y = (this.heightTiles * this.tileSize) / 2;
            this.container.addChild(this.itemOnBelt);
        } else if (!present && this.itemOnBelt) {
            this.container.removeChild(this.itemOnBelt);
            this.itemOnBelt.destroy();
            this.itemOnBelt = null;
        }
    }

    public destroy(): void {
        if (this.itemOnBelt) this.itemOnBelt.destroy();
        this.graphics.destroy();
        this.container.destroy({ children: true });
    }
}
