import { Container, Graphics } from 'pixi.js';
import type { DirtSystem, SweepResult } from '../DirtSystem';

export type BotToolType = 'brush' | 'broom' | 'vacuum';

export interface BotCleaningToolConfig {
    id: string;
    type: BotToolType;
    name: string;
    radius: number;       // Promień czyszczenia w px (szerokość pasma)
    sweepRate: number;    // kg/s zbierania
    color?: number;
}

export const BOT_TOOL_CONFIGS: Record<BotToolType, BotCleaningToolConfig> = {
    brush: {
        id: 'bot_brush_starter',
        type: 'brush',
        name: 'Szczotki Obrotowe Mk1',
        radius: 14,
        sweepRate: 2.0,
        color: 0xf59e0b, // amber-500
    },
    broom: {
        id: 'bot_broom_heavy',
        type: 'broom',
        name: 'Głowica Zgarniająca Mk2',
        radius: 22,
        sweepRate: 4.5,
        color: 0x38bdf8, // sky-400
    },
    vacuum: {
        id: 'bot_vacuum_turbine',
        type: 'vacuum',
        name: 'Turbina Próżniowa Mk3',
        radius: 32,
        sweepRate: 8.0,
        color: 0xa855f7, // purple-500
    },
};

/**
 * Samodzielny obiekt narzędzia robota sprzątającego (OOP Component).
 * Odpowiada za fizykę zbierania, promień oczyszczania oraz diegetyczny wygląd
 * wirujących szczotek / turbiny ssącej w trakcie pracy robota.
 */
export class BotCleaningTool {
    public readonly id: string;
    public readonly type: BotToolType;
    public name: string;
    public radius: number;
    public sweepRate: number;
    public color: number;

    public container: Container;
    public graphics: Graphics;

    private animAngle: number = 0;
    private isSweeping: boolean = false;

    constructor(config: Partial<BotCleaningToolConfig> & { type: BotToolType }) {
        const base = BOT_TOOL_CONFIGS[config.type];
        this.type = config.type;
        this.id = config.id ?? base.id;
        this.name = config.name ?? base.name;
        this.radius = config.radius ?? base.radius;
        this.sweepRate = config.sweepRate ?? base.sweepRate;
        this.color = config.color ?? base.color ?? 0xf59e0b;

        this.container = new Container();
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);

        this.renderTool();
    }

    public setRadius(newRadius: number): void {
        this.radius = Math.max(8, newRadius);
        this.renderTool();
    }

    public setSweepRate(newRate: number): void {
        this.sweepRate = Math.max(0.5, newRate);
    }

    public update(dt: number, isSweeping: boolean): void {
        this.isSweeping = isSweeping;
        if (isSweeping) {
            // Szybka rotacja wirników/szczotek podczas zamiatania (Roomba spin)
            this.animAngle += dt * 14;
            this.renderTool();
        } else if (this.animAngle !== 0) {
            // Spowolnienie do zatrzymania
            this.animAngle = 0;
            this.renderTool();
        }
    }

    public sweep(worldX: number, worldY: number, dirtSystem: DirtSystem): SweepResult {
        return dirtSystem.sweepPoint(worldX, worldY, this.radius);
    }

    /**
     * Ciągłe oczyszczanie pasma pomiędzy poprzednią a bieżącą pozycją robota (zapobiega dziurom i ząbkom).
     */
    public sweepContinuous(fromX: number, fromY: number, toX: number, toY: number, dirtSystem: DirtSystem): SweepResult {
        const dist = Math.hypot(toX - fromX, toY - fromY);
        if (dist < 1) {
            return dirtSystem.sweepPoint(toX, toY, this.radius);
        }
        return dirtSystem.sweepSegment(fromX, fromY, toX, toY, this.radius);
    }

    private renderTool(): void {
        this.graphics.clear();

        const r = this.radius;
        const col = this.color;

        if (this.type === 'brush') {
            // Podwójne wirujące tarcze szczotkowe Roomby (Lewa i Prawa)
            const brushR = Math.max(4, r * 0.45);
            const offset = r * 0.55;

            // Uchwyt montażowy z przodu robota
            this.graphics.rect(-offset, -r * 0.7, offset * 2, 4)
                .fill({ color: 0x1e293b })
                .stroke({ width: 1, color: 0x475569 });

            // Lewy wirnik szczotkowy
            this.renderRotatingBrushDisc(-offset, -r * 0.6, brushR, this.animAngle, col);

            // Prawy wirnik szczotkowy (przeciwna rotacja)
            this.renderRotatingBrushDisc(offset, -r * 0.6, brushR, -this.animAngle, col);

            // Dolny pierścień zamiatający
            this.graphics.circle(0, 0, r)
                .stroke({
                    width: 1.5,
                    color: col,
                    alpha: this.isSweeping ? 0.8 : 0.35,
                });
        } else if (this.type === 'broom') {
            // Szeroka listwa zamiatająca z włosiem węglowym
            const barW = r * 2;
            const barH = 6;
            this.graphics.roundRect(-r, -r * 0.8, barW, barH, 2)
                .fill({ color: 0x0f172a })
                .stroke({ width: 1.5, color: col });

            // Włosie szczotki
            const bristleCount = 8;
            const step = barW / bristleCount;
            const jitter = this.isSweeping ? Math.sin(this.animAngle * 2) * 1.5 : 0;
            for (let i = 0; i <= bristleCount; i++) {
                const bx = -r + i * step;
                this.graphics.moveTo(bx, -r * 0.8)
                    .lineTo(bx + jitter, -r * 0.8 - 4)
                    .stroke({ width: 1.2, color: 0xfacc15, alpha: 0.9 });
            }
        } else if (this.type === 'vacuum') {
            // Ciężka dysza ssąca z niebieskim pierścieniem próżniowym
            this.graphics.circle(0, -r * 0.5, r * 0.55)
                .fill({ color: 0x0284c7 })
                .stroke({ width: 2, color: 0x38bdf8 });

            // Wir ssący
            const vortexAlpha = this.isSweeping ? 0.7 + Math.sin(this.animAngle * 3) * 0.3 : 0.2;
            this.graphics.circle(0, -r * 0.5, r * 0.3)
                .fill({ color: 0x0f172a })
                .stroke({ width: 1.5, color: 0xc084fc, alpha: vortexAlpha });
        }
    }

    private renderRotatingBrushDisc(x: number, y: number, radius: number, angle: number, color: number): void {
        // Tarcza szczotki
        this.graphics.circle(x, y, radius)
            .fill({ color: 0x0f172a })
            .stroke({ width: 1, color });

        // Wypustki włosia szczotki obrotowej
        const arms = 4;
        for (let i = 0; i < arms; i++) {
            const a = angle + (i * Math.PI * 2) / arms;
            const ex = x + Math.cos(a) * (radius + 2);
            const ey = y + Math.sin(a) * (radius + 2);
            this.graphics.moveTo(x, y)
                .lineTo(ex, ey)
                .stroke({ width: 1.5, color: 0xfde047, alpha: this.isSweeping ? 0.95 : 0.6 });
        }
    }

    public destroy(): void {
        this.graphics.destroy();
        this.container.destroy({ children: true });
    }
}

