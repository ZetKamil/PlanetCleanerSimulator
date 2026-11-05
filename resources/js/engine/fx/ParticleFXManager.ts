import { Container, Graphics } from 'pixi.js';

export interface DustParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    graphics: Graphics;
    isSuction?: boolean;
}

export interface TreadMark {
    life: number;
    maxLife: number;
    graphics: Graphics;
}

/**
 * Dedykowany menedżer efektów cząsteczkowych pyłu, śladów gąsienic i celebracji (Single Responsibility Principle).
 */
export class ParticleFXManager {
    private effectsLayer: Container;
    private particles: DustParticle[] = [];
    private treadMarks: TreadMark[] = [];
    private treadTimer: number = 0;

    constructor(effectsLayer: Container) {
        this.effectsLayer = effectsLayer;
    }

    /**
     * Zostawia realistyczny, zanikający ślad bieżnika łazika na sypkim pyle Wenus.
     */
    public spawnTreadMark(roverX: number, roverY: number, roverAngle: number, isBoosting: boolean): void {
        this.treadTimer += 1;
        if (this.treadTimer % 3 !== 0) return; // Co 3 klatki, optymalizacja pamięci
        if (this.treadMarks.length > 100) return;

        const perp = roverAngle + Math.PI / 2;
        const trackDist = 10;
        const maxLife = isBoosting ? 2.5 : 1.8;

        const tracks = [
            { x: roverX + Math.cos(perp) * trackDist, y: roverY + Math.sin(perp) * trackDist },
            { x: roverX - Math.cos(perp) * trackDist, y: roverY - Math.sin(perp) * trackDist },
        ];

        for (const pt of tracks) {
            const gfx = new Graphics();
            const col = isBoosting ? 0xea580c : 0x78350f;
            const alpha = isBoosting ? 0.45 : 0.28;
            gfx.rect(-2.5, -1.2, 5, 2.4).fill({ color: col, alpha });
            gfx.rotation = roverAngle;
            gfx.x = pt.x;
            gfx.y = pt.y;

            // Wstaw na spód warstwy efektów, by łazik jeździł PO śladach
            this.effectsLayer.addChildAt(gfx, 0);

            this.treadMarks.push({
                life: maxLife,
                maxLife,
                graphics: gfx,
            });
        }
    }

    public spawnDustParticles(x: number, y: number, count: number = 8, color: number = 0xca8a04): void {
        if (this.particles.length > 250) return; // Strażnik wydajności GPU

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 25 + Math.random() * 65;
            const maxLife = 0.35 + Math.random() * 0.45;
            const size = 1.2 + Math.random() * 2.2;

            const gfx = new Graphics();
            gfx.circle(0, 0, size).fill({ color, alpha: 0.85 });
            gfx.x = x;
            gfx.y = y;
            this.effectsLayer.addChild(gfx);

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: maxLife,
                maxLife,
                graphics: gfx,
            });
        }
    }

    /**
     * Odłamki kruszonego żużlu bazaltowego (Pass 1 - Spieczony Żużel)
     */
    public spawnSlagRockChips(x: number, y: number, count: number = 6): void {
        if (this.particles.length > 250) return;

        const colors = [0x1e293b, 0x334155, 0x475569, 0xf59e0b];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 85;
            const maxLife = 0.25 + Math.random() * 0.35;
            const size = 2.0 + Math.random() * 2.5;
            const color = colors[Math.floor(Math.random() * colors.length)];

            const gfx = new Graphics();
            gfx.rect(-size / 2, -size / 2, size, size).fill({ color, alpha: 0.95 });
            gfx.x = x;
            gfx.y = y;
            this.effectsLayer.addChild(gfx);

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: maxLife,
                maxLife,
                graphics: gfx,
            });
        }
    }

    /**
     * ETAP 5.3: Efekt wiru zasysającego (Particle Suction Vortex):
     * Cząsteczki rodzą się na granicy stożka i lecą po wektorze prosto do wlotu lemiesza,
     * zmniejszając swój rozmiar do 0 przy wlocie.
     */
    public spawnSuctionVortex(targetX: number, targetY: number, count: number = 4, customColor?: number): void {
        if (this.particles.length > 250) return;

        const dustColors = [0xB8B096, 0xD4C685, 0x8F8872];

        for (let i = 0; i < count; i++) {
            const startAngle = Math.random() * Math.PI * 2;
            const startDist = 20 + Math.random() * 25;
            const px = targetX + Math.cos(startAngle) * startDist;
            const py = targetY + Math.sin(startAngle) * startDist;

            // Wektor prosto do środka wlotu lemiesza ssącego (targetX, targetY)
            const dx = targetX - px;
            const dy = targetY - py;
            const dist = Math.hypot(dx, dy) || 1;
            const speed = 80 + Math.random() * 60;
            const maxLife = Math.max(0.12, dist / speed);

            const vx = (dx / dist) * speed;
            const vy = (dy / dist) * speed;

            const color = customColor !== undefined ? customColor : dustColors[Math.floor(Math.random() * dustColors.length)];

            const gfx = new Graphics();
            const initialRadius = 1.3 + Math.random() * 1.5;
            gfx.circle(0, 0, initialRadius).fill({ color, alpha: 0.95 });
            gfx.x = px;
            gfx.y = py;
            this.effectsLayer.addChild(gfx);

            this.particles.push({
                x: px,
                y: py,
                vx,
                vy,
                life: maxLife,
                maxLife,
                graphics: gfx,
                isSuction: true,
            });
        }
    }

    public spawnCelebrationParticles(x: number, y: number, count: number = 40): void {
        const colors = [0xf59e0b, 0x38bdf8, 0x10b981, 0xfacc15, 0xffffff];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 140;
            const maxLife = 0.6 + Math.random() * 0.6;
            const size = 2 + Math.random() * 3;
            const col = colors[Math.floor(Math.random() * colors.length)];

            const gfx = new Graphics();
            gfx.rect(-size / 2, -size / 2, size, size).fill({ color: col, alpha: 0.9 });
            gfx.x = x;
            gfx.y = y;
            this.effectsLayer.addChild(gfx);

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: maxLife,
                maxLife,
                graphics: gfx,
            });
        }
    }

    public update(dt: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this.effectsLayer.removeChild(p.graphics);
                p.graphics.destroy();
                this.particles.splice(i, 1);
            } else {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.graphics.x = p.x;
                p.graphics.y = p.y;
                const lifeRatio = Math.max(0, p.life / p.maxLife);
                p.graphics.alpha = Math.max(0, lifeRatio);
                if (p.isSuction) {
                    // Drobinki pyłu zasysane do dyszy kurczą się do 0 przy wlocie
                    p.graphics.scale.set(lifeRatio);
                } else {
                    p.graphics.scale.set(0.4 + lifeRatio * 0.6);
                }
            }
        }

        // Aktualizacja i płynne zanikanie śladów gąsienic
        for (let i = this.treadMarks.length - 1; i >= 0; i--) {
            const tm = this.treadMarks[i];
            tm.life -= dt;
            if (tm.life <= 0) {
                this.effectsLayer.removeChild(tm.graphics);
                tm.graphics.destroy();
                this.treadMarks.splice(i, 1);
            } else {
                tm.graphics.alpha = (tm.life / tm.maxLife) * 0.35;
            }
        }
    }

    public destroy(): void {
        for (const p of this.particles) {
            this.effectsLayer.removeChild(p.graphics);
            p.graphics.destroy();
        }
        this.particles = [];

        for (const tm of this.treadMarks) {
            this.effectsLayer.removeChild(tm.graphics);
            tm.graphics.destroy();
        }
        this.treadMarks = [];
    }
}

