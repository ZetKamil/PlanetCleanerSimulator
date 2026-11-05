import { Container, Graphics } from 'pixi.js';
import { AutonomousEntity } from './AutonomousEntity';

export type MuleState = 'IDLE' | 'FLYING_TO_PLAYER' | 'EXTRACTING' | 'RETURNING' | 'UNLOADING';

export interface MuleUpdateResult {
    state: MuleState;
    extractedKg: number;
    unloadedDust: number;
    x: number;
    y: number;
}

export class MuleBotEntity extends AutonomousEntity {
    public graphics: Graphics;
    public beamGraphics: Graphics;

    public depotX: number;
    public depotY: number;

    public state: MuleState = 'IDLE';

    public get carriedDustKg(): number {
        return this.currentDust;
    }
    public set carriedDustKg(val: number) {
        this.currentDust = val;
    }

    public get capacity(): number {
        return this.maxCapacity;
    }

    private animTimer: number = 0;
    private extractTimer: number = 0;

    constructor(depotX: number, depotY: number) {
        super('mule_transport_drone', depotX, depotY, 360, 1000);

        this.depotX = depotX;
        this.depotY = depotY;

        this.graphics = new Graphics();
        this.beamGraphics = new Graphics();

        this.container.addChild(this.beamGraphics);
        this.container.addChild(this.graphics);

        this.renderBot();
    }

    private renderBot(): void {
        this.graphics.clear();

        // 1. Sleek Armored Hauler Drone Chassis (Titanium Slate & Cyan)
        this.graphics.roundRect(-14, -12, 28, 24, 6)
            .fill({ color: 0x0f172a })
            .stroke({ width: 2, color: 0x38bdf8 });

        // 2. Twin Ion Thruster Pods (Left & Right)
        this.graphics.rect(-18, -8, 4, 16).fill({ color: 0x334155 });
        this.graphics.rect(14, -8, 4, 16).fill({ color: 0x334155 });

        // 3. Central Heavy Cargo Container
        const hasCargo = this.carriedDustKg > 0;
        this.graphics.roundRect(-7, -7, 14, 14, 3)
            .fill({ color: hasCargo ? 0xf59e0b : 0x1e293b })
            .stroke({ width: 1.5, color: hasCargo ? 0xfef08a : 0x64748b });

        // 4. Cockpit Sensor Node
        this.graphics.circle(0, -9, 3.5).fill({ color: 0x38bdf8 });
    }

    public launchToPlayer(): boolean {
        if (this.state !== 'IDLE') return false;
        this.state = 'FLYING_TO_PLAYER';
        this.extractTimer = 0;
        return true;
    }

    public update(
        dt: number,
        playerPos: { x: number; y: number },
        backpackCurrentDust: number,
        emptyBackpackCallback: () => number,
    ): MuleUpdateResult {
        this.animTimer += dt * 8;
        let extractedKg = 0;
        let unloadedDust = 0;

        this.beamGraphics.clear();

        switch (this.state) {
            case 'IDLE':
                // Parked at Base Depot dock
                this.x = this.depotX;
                this.y = this.depotY;
                break;

            case 'FLYING_TO_PLAYER': {
                const reached = this.moveTowards(playerPos.x, playerPos.y, dt, 50);
                if (reached) {
                    this.state = 'EXTRACTING';
                    this.extractTimer = 0;
                }
                break;
            }

            case 'EXTRACTING': {
                // Suction beam from drone to player
                this.extractTimer += dt;
                const relX = playerPos.x - this.x;
                const relY = playerPos.y - this.y;

                // Cyan/Gold extraction tractor beam
                this.beamGraphics.moveTo(0, 0)
                    .lineTo(relX, relY)
                    .stroke({ width: 3, color: 0x38bdf8, alpha: 0.85 });

                this.beamGraphics.circle(relX, relY, 12 + Math.sin(this.animTimer) * 4)
                    .stroke({ width: 1.5, color: 0xfacc15, alpha: 0.75 });

                if (this.extractTimer >= 0.8) {
                    // Extract full carried dust from player backpack
                    if (backpackCurrentDust > 0) {
                        const amount = emptyBackpackCallback();
                        this.carriedDustKg = amount;
                        extractedKg = amount;
                    }
                    this.state = 'RETURNING';
                    this.renderBot();
                }
                break;
            }

            case 'RETURNING': {
                const reached = this.moveTowards(this.depotX, this.depotY, dt, 30);
                if (reached) {
                    this.state = 'UNLOADING';
                }
                break;
            }

            case 'UNLOADING': {
                unloadedDust = this.carriedDustKg;
                this.carriedDustKg = 0;
                this.state = 'IDLE';
                this.renderBot();
                break;
            }
        }

        this.container.x = this.x;
        this.container.y = this.y;

        return {
            state: this.state,
            extractedKg,
            unloadedDust,
            x: this.x,
            y: this.y,
        };
    }

    public destroy(): void {
        this.beamGraphics.destroy();
        this.graphics.destroy();
        this.container.destroy({ children: true });
    }
}

