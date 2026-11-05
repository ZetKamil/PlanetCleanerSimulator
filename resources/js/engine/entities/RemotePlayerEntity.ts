import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export class RemotePlayerEntity {
    public container: Container;
    public id: string;
    public name: string;
    public x: number;
    public y: number;
    public rotation: number = 0;
    public radius: number = 18;

    private targetX: number;
    private targetY: number;
    private targetRotation: number = 0;

    private bodyGfx: Graphics;
    private sweepGfx: Graphics;
    private nameText: Text;
    private isSweeping: boolean = false;
    private sweepTimer: number = 0;

    constructor(id: string, name: string, startX: number, startY: number) {
        this.id = id;
        this.name = name;
        this.x = startX;
        this.y = startY;
        this.targetX = startX;
        this.targetY = startY;

        this.container = new Container();
        this.container.x = this.x;
        this.container.y = this.y;

        this.bodyGfx = new Graphics();
        this.sweepGfx = new Graphics();

        const style = new TextStyle({
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 10,
            fontWeight: '600',
            fill: '#38bdf8',
            dropShadow: {
                alpha: 0.8,
                blur: 2,
                color: '#000000',
                distance: 1,
            },
        });

        this.nameText = new Text({ text: name, style });
        this.nameText.anchor.set(0.5, 1);
        this.nameText.y = -22;

        this.container.addChild(this.bodyGfx);
        this.container.addChild(this.sweepGfx);
        this.container.addChild(this.nameText);

        this.renderBody();
    }

    private renderBody(): void {
        this.bodyGfx.clear();

        // 1. Soft Shadow
        this.bodyGfx.circle(0, 2, this.radius + 2).fill({ color: 0x000000, alpha: 0.35 });

        // 2. Outer Chassis (Teal / Cyan Co-op Hazmat Suit)
        this.bodyGfx.circle(0, 0, this.radius)
            .fill({ color: 0x0d9488 }) // teal-600
            .stroke({ width: 2, color: 0x115e59 }); // teal-800

        // 3. Inner Armor Plate
        this.bodyGfx.circle(0, 0, this.radius - 4)
            .fill({ color: 0x1e293b }) // slate-800
            .stroke({ width: 1.5, color: 0x475569 }); // slate-600

        // 4. Energy Core / Visor (Lime Glow)
        this.bodyGfx.circle(0, 0, 5)
            .fill({ color: 0xa3e635 }); // lime-400

        // 5. Front Brush Head
        this.bodyGfx.rect(10, -10, 6, 20)
            .fill({ color: 0x14b8a6 })
            .stroke({ width: 1, color: 0x042f2e });
        this.bodyGfx.rect(16, -11, 4, 22)
            .fill({ color: 0x2dd4bf });

        // 6. Directional Arrow Accent
        this.bodyGfx.poly([
            { x: 4, y: -4 },
            { x: 10, y: 0 },
            { x: 4, y: 4 },
        ]).fill({ color: 0xffffff, alpha: 0.8 });
    }

    public setTargetPosition(x: number, y: number, rotation: number): void {
        this.targetX = x;
        this.targetY = y;
        this.targetRotation = rotation;
    }

    public triggerSweepAnimation(radius: number): void {
        this.isSweeping = true;
        this.sweepTimer = 0.2; // 200ms pulse
        this.sweepGfx.clear();
        this.sweepGfx.circle(20, 0, radius)
            .stroke({ width: 1.5, color: 0x2dd4bf, alpha: 0.7 })
            .fill({ color: 0x2dd4bf, alpha: 0.15 });
    }

    public update(dt: number): void {
        // Smooth position interpolation (lerp)
        const lerpFactor = Math.min(1, dt * 16);
        this.x += (this.targetX - this.x) * lerpFactor;
        this.y += (this.targetY - this.y) * lerpFactor;

        // Angle lerp with shortest arc
        let diff = this.targetRotation - this.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotation += diff * lerpFactor;

        this.container.x = this.x;
        this.container.y = this.y;
        this.bodyGfx.rotation = this.rotation;
        this.sweepGfx.rotation = this.rotation;

        // Name text stays upright
        this.nameText.rotation = 0;

        if (this.isSweeping) {
            this.sweepTimer -= dt;
            if (this.sweepTimer <= 0) {
                this.isSweeping = false;
                this.sweepGfx.clear();
            }
        }
    }

    public destroy(): void {
        this.bodyGfx.destroy();
        this.sweepGfx.destroy();
        this.nameText.destroy();
        this.container.destroy({ children: true });
    }
}

