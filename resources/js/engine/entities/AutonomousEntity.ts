import { Container } from 'pixi.js';

export interface IBotEntity {
    id: string;
    container: Container;
    x: number;
    y: number;
    rotation: number;
    speed: number;
    currentDust: number;
    maxCapacity: number;
    getPosition(): { x: number; y: number };
    destroy(): void;
}

/**
 * Klasa bazowa dla wszystkich jednostek autonomicznych i dronów na Wenus (LSP).
 * Enkapsuluje ruch przestrzenny, kontener graficzny Pixi oraz wspólne właściwości fizyczne.
 */
export abstract class AutonomousEntity implements IBotEntity {
    public readonly id: string;
    public container: Container;
    public x: number;
    public y: number;
    public rotation: number = 0;
    public speed: number;
    public currentDust: number = 0;
    public maxCapacity: number = 20;

    constructor(id: string, startX: number, startY: number, speed: number = 135, capacity: number = 20) {
        this.id = id;
        this.x = startX;
        this.y = startY;
        this.speed = speed;
        this.maxCapacity = capacity;

        this.container = new Container();
        this.container.x = this.x;
        this.container.y = this.y;
    }

    /**
     * Zunifikowany wektorowy ruch w stronę celu z detekcją dotarcia (Liskov Substitution).
     */
    public moveTowards(tx: number, ty: number, dt: number, stopDistance: number = 4, rotationOffset: number = 0): boolean {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= stopDistance) {
            return true;
        }

        this.rotation = Math.atan2(dy, dx) + rotationOffset;
        const step = Math.min(dist, this.speed * dt);
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;

        return false;
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    public abstract destroy(): void;
}

