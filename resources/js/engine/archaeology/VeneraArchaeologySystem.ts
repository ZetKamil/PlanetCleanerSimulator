import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { DirtSystem } from '../DirtSystem';
import type { SoundSystem } from '../SoundSystem';
import { getActivePlanet } from '../../config/planets';

export interface VeneraRelic {
    id: string;
    name: string;
    year: string;
    x: number;
    y: number;
    rewardCredits: number;
    description: string;
    isUncovered: boolean;
    isAnalyzed: boolean;
}

export type VeneraRelicTemplate = Omit<VeneraRelic, 'x' | 'y' | 'isUncovered' | 'isAnalyzed'>;

export const VENERA_RELIC_TEMPLATES: VeneraRelicTemplate[] = getActivePlanet().relics.map((r) => ({
    id: r.id,
    name: r.name,
    year: String(r.year),
    rewardCredits: r.rewardCredits,
    description: r.description,
}));

export interface ArchaeologyEvent {
    type: 'DISCOVERED' | 'ANALYZED';
    relic: VeneraRelic;
    discoveredCount?: number;
    totalCount?: number;
}

export class VeneraArchaeologySystem {
    public container: Container;
    public relics: VeneraRelic[] = [];

    private graphics: Graphics;
    private promptGfx: Graphics;
    private promptText: Text;
    private soundSystem: SoundSystem;
    private pulseTimer: number = 0;

    constructor(soundSystem: SoundSystem) {
        this.soundSystem = soundSystem;
        this.container = new Container();
        this.graphics = new Graphics();
        this.promptGfx = new Graphics();

        const style = new TextStyle({
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: 'bold',
            fill: '#facc15',
            dropShadow: {
                alpha: 0.9,
                blur: 2,
                color: '#000000',
                distance: 1,
            },
        });

        this.promptText = new Text({ text: '', style });
        this.promptText.anchor.set(0.5, 1.8);
        this.promptText.visible = false;

        this.container.addChild(this.graphics);
        this.container.addChild(this.promptGfx);
        this.container.addChild(this.promptText);

        this.initializeRelics();
        this.renderRelics();
    }

    public setRelics(relics: VeneraRelic[]): void {
        this.relics = relics;
        this.promptText.visible = false;
        this.promptGfx.clear();
        this.renderRelics();
    }

    private initializeRelics(): void {
        const defaultPositions = [
            { x: 1050, y: 720 },
            { x: 3150, y: 820 },
            { x: 1250, y: 1720 },
            { x: 2950, y: 1680 },
            { x: 650, y: 1450 },
            { x: 3550, y: 1150 },
        ];

        this.relics = VENERA_RELIC_TEMPLATES.map((tmpl, idx) => ({
            ...tmpl,
            x: defaultPositions[idx]?.x ?? 1000,
            y: defaultPositions[idx]?.y ?? 1000,
            isUncovered: false,
            isAnalyzed: false,
        }));
    }

    public renderRelics(): void {
        this.graphics.clear();

        for (const relic of this.relics) {
            // Render only if uncovered from dust
            if (!relic.isUncovered) continue;

            const rx = relic.x;
            const ry = relic.y;

            // 1. Excavation Pit Outer Rim (Emerald border showing it is successfully secured and analyzed)
            this.graphics.circle(rx, ry, 32)
                .fill({ color: 0x0f172a, alpha: 0.85 })
                .stroke({ width: 2, color: 0x10b981, alpha: 0.9 });

            // 2. Gold Foil Thermal Shield Body (Venera Sphere Lander)
            this.graphics.circle(rx, ry, 18)
                .fill({ color: 0xd97706 }) // Rich gold foil
                .stroke({ width: 2, color: 0xfacc15 });

            // 3. Aerodynamic Braking Ring
            this.graphics.circle(rx, ry - 6, 12)
                .stroke({ width: 2, color: 0xffffff, alpha: 0.8 });

            // 4. Helical Telemetry Antenna Mast
            this.graphics.moveTo(rx, ry - 18).lineTo(rx + 6, ry - 32)
                .stroke({ width: 2, color: 0x38bdf8 });
            this.graphics.circle(rx + 6, ry - 32, 3)
                .fill({ color: 0x38bdf8 });

            // 5. Red Expedition Star Emblem
            this.graphics.circle(rx - 3, ry + 2, 4)
                .fill({ color: 0xef4444 });

            // 6. Green "Secured & Analyzed" Status Dot
            this.graphics.circle(rx + 8, ry - 8, 3.5)
                .fill({ color: 0x10b981 })
                .stroke({ width: 1, color: 0xffffff });
        }
    }

    public update(
        dt: number,
        playerPos: { x: number; y: number },
        dirtSystem: DirtSystem,
        _isEPressed?: boolean,
    ): ArchaeologyEvent[] {
        this.pulseTimer += dt * 4;
        const events: ArchaeologyEvent[] = [];

        // 1. Check if any relic has been uncovered from dust (by player, Sweep-Bot, Drone, or sector clearing)
        let needsRedraw = false;
        for (const relic of this.relics) {
            if (!relic.isUncovered) {
                // If the dust directly over the relic has been cleaned
                if (dirtSystem.isClean(relic.x, relic.y)) {
                    relic.isUncovered = true;
                    relic.isAnalyzed = true; // Auto-analyzed immediately upon unearthing!
                    needsRedraw = true;
                    this.soundSystem.playVeneraDiscovery();

                    events.push({
                        type: 'DISCOVERED',
                        relic,
                        discoveredCount: this.getDiscoveredCount(),
                        totalCount: this.relics.length,
                    });
                }
            }
        }

        if (needsRedraw) {
            this.renderRelics();
        }

        // Prompt text is no longer used since interaction is 100% automated on vacuuming
        this.promptText.visible = false;
        this.promptGfx.clear();

        return events;
    }

    public getDiscoveredCount(): number {
        return this.relics.filter(r => r.isUncovered).length;
    }

    public getAnalyzedCount(): number {
        return this.relics.filter(r => r.isAnalyzed).length;
    }

    public destroy(): void {
        this.graphics.destroy();
        this.promptGfx.destroy();
        this.promptText.destroy();
        this.container.destroy({ children: true });
    }
}

