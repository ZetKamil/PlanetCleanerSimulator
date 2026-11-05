import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { VENUS_THEME, drawInkedPanel, drawRivets, drawHazardStripes } from '../VenusArtTheme';

export interface BaseDepotOptions {
    x: number;
    y: number;
    size?: number; // 96 px = 3x3 tiles of 32px
}

interface FloatingText {
    text: Text;
    x: number;
    y: number;
    vy: number;
    life: number;
    maxLife: number;
}

export class BaseDepot {
    public container: Container;
    public x: number;
    public y: number;
    public size: number;
    public tier: number = 1; // Etap 8: Tier 1, 2, 3 Evolution

    private baseGraphics: Graphics;
    private dockIndicator: Graphics;
    private rocketGfx: Graphics | null = null;
    private floatingTexts: FloatingText[] = [];
    private glowTimer: number = 0;
    public isRocketLaunched: boolean = false;
    private rocketY: number = 0;
    private rocketVy: number = 0;

    constructor(options: BaseDepotOptions) {
        this.x = options.x;
        this.y = options.y;
        this.size = options.size ?? 96;

        this.container = new Container();
        this.container.x = this.x;
        this.container.y = this.y;

        this.baseGraphics = new Graphics();
        this.dockIndicator = new Graphics();

        this.container.addChild(this.baseGraphics);
        this.container.addChild(this.dockIndicator);

        this.renderBase();
    }

    public setTier(newTier: number): void {
        this.tier = newTier;
        this.renderBase();
    }

    public triggerRocketLaunch(): void {
        if (this.isRocketLaunched) return;
        this.isRocketLaunched = true;
        this.rocketY = this.size / 2;
        this.rocketVy = -30;
    }

    private renderBase(): void {
        this.baseGraphics.clear();

        // 1. Heavy Terracotta & Steel Industrial Chassis (3x3 tiles = 96x96 px)
        const plateColor = this.tier >= 3 ? VENUS_THEME.copperLight : (this.tier >= 2 ? VENUS_THEME.terracottaBase : VENUS_THEME.terracottaDark);
        drawInkedPanel(this.baseGraphics, 0, 0, this.size, this.size, 10, plateColor, VENUS_THEME.ink, 3.5);
        drawRivets(this.baseGraphics, 0, 0, this.size, this.size, 6, 2, VENUS_THEME.hazardYellow);

        // 2. Hazard Edge Stripes (Wzorowane na venus-style-concept.jpg)
        drawHazardStripes(this.baseGraphics, 6, 4, this.size - 12, 7, 5);
        drawHazardStripes(this.baseGraphics, 6, this.size - 11, this.size - 12, 7, 5);

        // 3. Central Intake / Processing Grille
        const innerMargin = 16;
        const innerSize = this.size - innerMargin * 2;
        this.baseGraphics.roundRect(innerMargin, innerMargin, innerSize, innerSize, 6)
            .fill({ color: 0x090d16 })
            .stroke({ width: 2, color: VENUS_THEME.ink });

        // 3b. Dedicated Cargo Receiving Bays on 4 outer center edges (32px width matching conveyors)
        // North Cargo Bay (x: 34..62, y: 0..9)
        this.baseGraphics.roundRect(34, 0, 28, 9, 3)
            .fill({ color: VENUS_THEME.copperDark })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });
        this.baseGraphics.poly([{ x: 42, y: 2 }, { x: 48, y: 7 }, { x: 54, y: 2 }]).fill({ color: VENUS_THEME.glassCyan });

        // South Cargo Bay (x: 34..62, y: 87..96)
        this.baseGraphics.roundRect(34, 87, 28, 9, 3)
            .fill({ color: VENUS_THEME.copperDark })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });
        this.baseGraphics.poly([{ x: 42, y: 94 }, { x: 48, y: 89 }, { x: 54, y: 94 }]).fill({ color: VENUS_THEME.glassCyan });

        // West Cargo Bay (x: 0..9, y: 34..62)
        this.baseGraphics.roundRect(0, 34, 9, 28, 3)
            .fill({ color: VENUS_THEME.copperDark })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });
        this.baseGraphics.poly([{ x: 2, y: 42 }, { x: 7, y: 48 }, { x: 2, y: 54 }]).fill({ color: VENUS_THEME.glassCyan });

        // East Cargo Bay (x: 87..96, y: 34..62)
        this.baseGraphics.roundRect(87, 34, 9, 28, 3)
            .fill({ color: VENUS_THEME.copperDark })
            .stroke({ width: 1.5, color: VENUS_THEME.ink });
        this.baseGraphics.poly([{ x: 94, y: 42 }, { x: 89, y: 48 }, { x: 94, y: 54 }]).fill({ color: VENUS_THEME.glassCyan });

        // Grille Lines (Ciepła miedź / grafit)
        for (let gy = innerMargin + 8; gy < innerMargin + innerSize; gy += 8) {
            this.baseGraphics.moveTo(innerMargin + 4, gy)
                .lineTo(innerMargin + innerSize - 4, gy)
                .stroke({ width: 1.5, color: VENUS_THEME.copperBase, alpha: 0.6 });
        }

        const center = this.size / 2;

        if (this.tier >= 3) {
            // Tier 3: Orbital Rocket Silo Launch Pad!
            this.baseGraphics.circle(center, center, 20)
                .fill({ color: 0x0f172a })
                .stroke({ width: 2.5, color: VENUS_THEME.hazardYellow });

            // Launch gantry scaffolding
            this.baseGraphics.rect(center - 18, center - 4, 6, 8).fill({ color: VENUS_THEME.industrialBeige });
            this.baseGraphics.rect(center + 12, center - 4, 6, 8).fill({ color: VENUS_THEME.industrialBeige });
        } else {
            // Tier 1 & 2: Centralny tygiel rafinerii z kotwicą windy kosmicznej
            this.baseGraphics.circle(center, center, 14)
                .fill({ color: VENUS_THEME.warmRust, alpha: 0.85 })
                .stroke({ width: 2.5, color: VENUS_THEME.hazardYellow });

            this.baseGraphics.circle(center, center, 6)
                .fill({ color: VENUS_THEME.hazardYellow });

            this.baseGraphics.rect(center - 2, 0, 4, center)
                .fill({ color: VENUS_THEME.industrialBeige, alpha: 0.5 });
            this.baseGraphics.circle(center, center, 2)
                .fill({ color: 0xffffff });
        }

        // 5. Podświetlany Kaseton Neonowy (Neon Broom Signboard z venus-style-concept.jpg)
        const signW = 60;
        const signH = 14;
        this.baseGraphics.roundRect(center - signW / 2, -14, signW, signH, 4)
            .fill({ color: 0x090d16 })
            .stroke({ width: 1.5, color: VENUS_THEME.hazardYellow });

        const style = new TextStyle({
            fontSize: 9,
            fill: '#facc15',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            letterSpacing: 1,
            dropShadow: { color: '#ca8a04', alpha: 0.8, distance: 1 },
        });

        const title = new Text({ text: '🧹 CENTRAL', style });
        title.anchor.set(0.5, 0.5);
        title.x = center;
        title.y = -7;
        this.container.addChild(title);

        const subStyle = new TextStyle({
            fontSize: 7,
            fill: '#fde68a',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            letterSpacing: 0.5,
        });
        const sub = new Text({ text: '⚡ RAFINERIA [ROZŁADUNEK]', style: subStyle });
        sub.anchor.set(0.5, 0.5);
        sub.x = center;
        sub.y = this.size + 9;
        this.container.addChild(sub);
    }

    public update(dt: number, isPlayerInside: boolean): void {
        this.glowTimer += dt;

        // Animated Docking Ring Pulse
        this.dockIndicator.clear();
        const center = this.size / 2;
        const pulse = (Math.sin(this.glowTimer * 4) + 1) * 0.5; // 0..1

        if (isPlayerInside) {
            // Active Docking Beam (Bright Cyan / Green)
            this.dockIndicator.circle(center, center, this.size / 2 - 4)
                .stroke({ width: 2.5, color: 0x10b981, alpha: 0.7 + pulse * 0.3 });
            this.dockIndicator.circle(center, center, 18 + pulse * 4)
                .stroke({ width: 1.5, color: 0x34d399, alpha: 0.6 });
        } else {
            // Idle Beacon Pulse (Soft Cyan)
            this.dockIndicator.circle(center, center, this.size / 2 - 6)
                .stroke({ width: 1.5, color: 0x0284c7, alpha: 0.3 + pulse * 0.3 });
        }

        // Update Floating "+$X" texts
        this.updateFloatingTexts(dt);

        // Animate Rocket launch (Etap 8.3)
        if (this.isRocketLaunched) {
            if (!this.rocketGfx) {
                this.rocketGfx = new Graphics();
                this.container.addChild(this.rocketGfx);
            }
            this.rocketVy -= 220 * dt; // accelerate upward
            this.rocketY += this.rocketVy * dt;

            this.rocketGfx.clear();
            const cx = this.size / 2;
            const ry = this.rocketY;

            // Rocket Body
            this.rocketGfx.rect(cx - 6, ry - 18, 12, 24)
                .fill({ color: 0xf1f5f9 })
                .stroke({ width: 1.5, color: 0x0284c7 });
            // Nosecone
            this.rocketGfx.poly([
                { x: cx - 6, y: ry - 18 },
                { x: cx + 6, y: ry - 18 },
                { x: cx, y: ry - 30 },
            ]).fill({ color: 0xef4444 });
            // Fins
            this.rocketGfx.poly([
                { x: cx - 6, y: ry },
                { x: cx - 11, y: ry + 6 },
                { x: cx - 6, y: ry + 4 },
            ]).fill({ color: 0x0284c7 });
            this.rocketGfx.poly([
                { x: cx + 6, y: ry },
                { x: cx + 11, y: ry + 6 },
                { x: cx + 6, y: ry + 4 },
            ]).fill({ color: 0x0284c7 });
            // Fire Exhaust
            const flameLen = 14 + Math.random() * 12;
            this.rocketGfx.poly([
                { x: cx - 4, y: ry + 6 },
                { x: cx + 4, y: ry + 6 },
                { x: cx, y: ry + 6 + flameLen },
            ]).fill({ color: 0xf97316, alpha: 0.95 });
        }
    }

    /**
     * Spawns an animated "+$X" floating reward text over the depot.
     */
    public triggerUnloadFeedback(earnedCredits: number): void {
        const style = new TextStyle({
            fontSize: 16,
            fontWeight: 'bold',
            fill: '#10b981', // Emerald green
            stroke: { color: '#064e3b', width: 3 },
            fontFamily: 'monospace',
            dropShadow: {
                alpha: 0.5,
                angle: Math.PI / 6,
                blur: 4,
                color: '#000000',
                distance: 2,
            },
        });

        const text = new Text({ text: `+$${earnedCredits.toFixed(1)}`, style });
        text.anchor.set(0.5, 0.5);
        const center = this.size / 2;
        text.x = center;
        text.y = center - 10;

        this.container.addChild(text);

        this.floatingTexts.push({
            text,
            x: center,
            y: center - 10,
            vy: -45, // Moves upwards at 45 px/s
            life: 0,
            maxLife: 1.2,
        });
    }

    private updateFloatingTexts(dt: number): void {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const item = this.floatingTexts[i];
            item.life += dt;

            if (item.life >= item.maxLife) {
                this.container.removeChild(item.text);
                item.text.destroy();
                this.floatingTexts.splice(i, 1);
                continue;
            }

            item.y += item.vy * dt;
            item.text.y = item.y;
            item.text.alpha = Math.max(0, 1 - (item.life / item.maxLife));
            item.text.scale.set(1 + (item.life / item.maxLife) * 0.2); // Slight pop-up expansion
        }
    }

    /**
     * Checks if player coordinates overlap the Base Depot docking area.
     */
    public isPlayerInZone(playerX: number, playerY: number, playerRadius: number = 18): boolean {
        const margin = 8; // Friendly docking margin
        return (
            playerX + playerRadius >= this.x - margin &&
            playerX - playerRadius <= this.x + this.size + margin &&
            playerY + playerRadius >= this.y - margin &&
            playerY - playerRadius <= this.y + this.size + margin
        );
    }

    public destroy(): void {
        for (const item of this.floatingTexts) {
            item.text.destroy();
        }
        this.floatingTexts = [];
        this.dockIndicator.destroy();
        this.baseGraphics.destroy();
        this.container.destroy({ children: true });
    }
}
