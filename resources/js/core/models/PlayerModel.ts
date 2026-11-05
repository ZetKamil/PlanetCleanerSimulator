/**
 * Planet Cleaner Simulator - Player Model (Pure Data)
 * Mathematical state of the player character without rendering dependencies.
 */

export interface PlayerModelOptions {
    x?: number;
    y?: number;
    baseSpeed?: number;
    currentToolId?: string;
    maxDustCapacity?: number;
}

export class PlayerModel {
    public x: number;
    public y: number;
    public rotation: number = 0;
    public baseSpeed: number = 240;
    public speed: number = 240;
    public velocity: { vx: number; vy: number } = { vx: 0, vy: 0 };

    // Tool & Cleaning State
    public currentToolId: string = 'tool-t1-scraper';
    public isSweeping: boolean = false;

    // Dust storage
    public dustBuffer: number = 0;
    public maxDustCapacity: number = 30;

    // Boost dynamics
    public boostEnergy: number = 100;
    public readonly maxBoostEnergy: number = 100;
    public isBoosting: boolean = false;
    public readonly boostMultiplier: number = 1.70;

    constructor(options: PlayerModelOptions = {}) {
        this.x = options.x ?? 3072;
        this.y = options.y ?? 3072;
        this.baseSpeed = options.baseSpeed ?? 240;
        this.speed = this.baseSpeed;
        this.currentToolId = options.currentToolId ?? 'tool-t1-scraper';
        this.maxDustCapacity = options.maxDustCapacity ?? 30;
    }

    public update(
        deltaSeconds: number,
        moveVector: { dx: number; dy: number },
        boostRequested: boolean,
        targetPointer?: { x: number; y: number }
    ): void {
        // Boost calculation
        if (boostRequested && this.boostEnergy > 0 && (moveVector.dx !== 0 || moveVector.dy !== 0)) {
            this.isBoosting = true;
            this.boostEnergy = Math.max(0, this.boostEnergy - 35 * deltaSeconds);
        } else {
            this.isBoosting = false;
            this.boostEnergy = Math.min(this.maxBoostEnergy, this.boostEnergy + 20 * deltaSeconds);
        }

        const effectiveSpeed = this.speed * (this.isBoosting ? this.boostMultiplier : 1.0);
        this.velocity.vx = moveVector.dx * effectiveSpeed;
        this.velocity.vy = moveVector.dy * effectiveSpeed;

        this.x += this.velocity.vx * deltaSeconds;
        this.y += this.velocity.vy * deltaSeconds;

        // Rotation towards movement or pointer
        if (targetPointer) {
            this.rotation = Math.atan2(targetPointer.y - this.y, targetPointer.x - this.x);
        } else if (moveVector.dx !== 0 || moveVector.dy !== 0) {
            this.rotation = Math.atan2(moveVector.dy, moveVector.dx);
        }
    }
}

