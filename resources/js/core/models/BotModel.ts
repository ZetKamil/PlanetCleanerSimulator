/**
 * Planet Cleaner Simulator - Bot Model (Pure Data)
 * Mathematical state and state machine for Sweep-Bots & Mule-Bots.
 */

export type BotState = 'IDLE' | 'PATROL_SWEEP' | 'RETURN_TO_DOCK';

export interface BotModelOptions {
    id: string;
    x: number;
    y: number;
    dockX?: number;
    dockY?: number;
    speed?: number;
    capacity?: number;
    cleaningRadius?: number;
}

export class BotModel {
    public readonly id: string;
    public x: number;
    public y: number;
    public rotation: number = 0;

    public dockX: number;
    public dockY: number;
    public targetX: number;
    public targetY: number;

    public state: BotState = 'IDLE';
    public speed: number = 160;
    public dustBuffer: number = 0;
    public capacity: number = 60;
    public cleaningRadius: number = 24;

    // Happy eyes / emote timer
    public happyTimer: number = 0;

    constructor(options: BotModelOptions) {
        this.id = options.id;
        this.x = options.x;
        this.y = options.y;
        this.dockX = options.dockX ?? options.x;
        this.dockY = options.dockY ?? options.y;
        this.targetX = this.dockX;
        this.targetY = this.dockY;
        this.speed = options.speed ?? 160;
        this.capacity = options.capacity ?? 60;
        this.cleaningRadius = options.cleaningRadius ?? 24;
    }

    public isFull(): boolean {
        return this.dustBuffer >= this.capacity;
    }

    public updateMovement(deltaSeconds: number): void {
        if (this.happyTimer > 0) {
            this.happyTimer -= deltaSeconds;
        }

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2) {
            this.rotation = Math.atan2(dy, dx);
            const step = Math.min(dist, this.speed * deltaSeconds);
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        }
    }
}

