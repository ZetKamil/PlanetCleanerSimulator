import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export type DropPodState = 'DESCENDING' | 'LANDED_OPEN' | 'EXTRACTING' | 'ASCENDING' | 'DONE';

export interface DropPodUpdateResult {
    state: DropPodState;
    extractedKg: number;
    creditsEarned: number;
    isFinished: boolean;
}

export class OrbitalDropPodEntity {
    public container: Container;
    public graphics: Graphics;
    public beamGraphics: Graphics;
    public thrusterGraphics: Graphics;

    public readonly targetX: number;
    public readonly targetY: number;
    public altitude: number = 700; // px above ground during entry
    public state: DropPodState = 'DESCENDING';

    public carriedDustKg: number = 0;
    public readonly maxCapacityKg: number = 50;

    private landedTimer: number = 0;
    private maxLandedDuration: number = 12.0; // 12 seconds on ground
    private animTimer: number = 0;

    constructor(targetX: number, targetY: number) {
        this.targetX = targetX;
        this.targetY = targetY;

        this.container = new Container();
        this.container.x = targetX;
        this.container.y = targetY - this.altitude;

        this.beamGraphics = new Graphics();
        this.thrusterGraphics = new Graphics();
        this.graphics = new Graphics();

        this.container.addChild(this.thrusterGraphics);
        this.container.addChild(this.beamGraphics);
        this.container.addChild(this.graphics);

        this.renderPod();
    }

    private renderPod(): void {
        this.graphics.clear();

        // 1. Heavy Ablative Carbon-Heatshield (Curved Base)
        this.graphics.poly([
            { x: -16, y: 12 },
            { x: 16, y: 12 },
            { x: 12, y: 16 },
            { x: -12, y: 16 },
        ]).fill({ color: 0x1c1917 })
            .stroke({ width: 1.5, color: 0xea580c });

        // 2. Aerodynamic Conical Drop-Pod Body
        this.graphics.poly([
            { x: -14, y: 12 },
            { x: -7, y: -16 },
            { x: 7, y: -16 },
            { x: 14, y: 12 },
        ]).fill({ color: 0x0f172a })
            .stroke({ width: 2, color: 0x38bdf8 });

        // 3. Gold Mylar Insulation Thermal Foil Bands
        this.graphics.rect(-9, -2, 18, 5)
            .fill({ color: 0xf59e0b });

        // 4. Pressurized Cargo Loading Door
        const doorColor = this.state === 'LANDED_OPEN' || this.state === 'EXTRACTING' ? 0x0284c7 : 0x1e293b;
        this.graphics.roundRect(-6, 3, 12, 8, 2)
            .fill({ color: doorColor })
            .stroke({ width: 1, color: 0x38bdf8 });

        // 5. Flashing Strobe Beacon Light
        const beaconPulse = Math.sin(this.animTimer * 10) > 0;
        this.graphics.circle(0, -18, 3)
            .fill({ color: beaconPulse ? 0xfacc15 : 0x78350f });

        // Label
        const style = new TextStyle({ fontSize: 7, fill: '#38bdf8', fontFamily: 'monospace', fontWeight: 'bold' });
        const label = new Text({ text: 'POD-1', style });
        label.anchor.set(0.5, 0.5);
        label.y = -7;
        this.container.addChild(label);
    }

    public update(dt: number, playerX: number, playerY: number, playerDust: number): DropPodUpdateResult {
        this.animTimer += dt;
        let extractedKg = 0;
        let creditsEarned = 0;
        let isFinished = false;

        this.beamGraphics.clear();
        this.thrusterGraphics.clear();

        if (this.state === 'DESCENDING') {
            this.altitude = Math.max(0, this.altitude - 600 * dt);
            this.container.y = this.targetY - this.altitude;

            // Retro rocket deceleration plume
            this.thrusterGraphics.poly([
                { x: -8, y: 16 },
                { x: 0, y: 34 + Math.random() * 12 },
                { x: 8, y: 16 },
            ]).fill({ color: 0xf97316, alpha: 0.85 });

            this.thrusterGraphics.poly([
                { x: -4, y: 16 },
                { x: 0, y: 24 + Math.random() * 8 },
                { x: 4, y: 16 },
            ]).fill({ color: 0xfef08a, alpha: 0.95 });

            if (this.altitude <= 0) {
                this.state = 'LANDED_OPEN';
                this.container.y = this.targetY;
                this.renderPod();
            }
        } else if (this.state === 'LANDED_OPEN' || this.state === 'EXTRACTING') {
            this.landedTimer += dt;

            const distToPlayer = Math.hypot(playerX - this.targetX, playerY - this.targetY);
            const suctionRange = 110;

            if (distToPlayer <= suctionRange && playerDust > 0 && this.carriedDustKg < this.maxCapacityKg) {
                this.state = 'EXTRACTING';
                const extractRate = 18 * dt; // 18 kg/s suction speed
                const spaceLeft = this.maxCapacityKg - this.carriedDustKg;
                const canTake = Math.min(spaceLeft, playerDust, extractRate);

                extractedKg = canTake;
                this.carriedDustKg += canTake;
                creditsEarned = canTake * 0.10; // $0.10/kg base sell value

                // Cargo Intake Vacuum Beam
                const localPx = playerX - this.targetX;
                const localPy = playerY - this.targetY;
                this.beamGraphics.moveTo(0, 7)
                    .lineTo(localPx, localPy)
                    .stroke({ width: 3, color: 0x38bdf8, alpha: 0.8 });
                this.beamGraphics.moveTo(0, 7)
                    .lineTo(localPx, localPy)
                    .stroke({ width: 1.2, color: 0xffffff, alpha: 0.95 });
            } else {
                this.state = 'LANDED_OPEN';
            }

            // Launch conditions: timer expires or pod full
            if (this.landedTimer >= this.maxLandedDuration || this.carriedDustKg >= this.maxCapacityKg) {
                this.state = 'ASCENDING';
                this.renderPod();
            }
        } else if (this.state === 'ASCENDING') {
            this.altitude += 500 * dt;
            this.container.y = this.targetY - this.altitude;

            // Powerful ascent booster flame
            this.thrusterGraphics.poly([
                { x: -9, y: 16 },
                { x: 0, y: 45 + Math.random() * 15 },
                { x: 9, y: 16 },
            ]).fill({ color: 0xea580c, alpha: 0.9 });

            this.thrusterGraphics.poly([
                { x: -5, y: 16 },
                { x: 0, y: 28 + Math.random() * 10 },
                { x: 5, y: 16 },
            ]).fill({ color: 0xfde047, alpha: 0.95 });

            if (this.altitude >= 900) {
                this.state = 'DONE';
                isFinished = true;
            }
        }

        return {
            state: this.state,
            extractedKg,
            creditsEarned,
            isFinished,
        };
    }

    public destroy(): void {
        this.graphics.destroy();
        this.beamGraphics.destroy();
        this.thrusterGraphics.destroy();
        this.container.destroy({ children: true });
    }
}

