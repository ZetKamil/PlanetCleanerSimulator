import { Container, Graphics } from 'pixi.js';
import { VENUS_THEME } from '../VenusArtTheme';
import { PlayerModel } from '../../core/models/PlayerModel';

export interface PlayerInput {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    boost?: boolean; // Turbo-Glide [Shift]
    isPointerDown?: boolean;
}

export interface ToolConeConfig {
    reachDistance: number;
    endRadius: number;
    hasBladeBar?: boolean;
    bladeWidth?: number;
}

export function getToolConeConfig(toolId: string): ToolConeConfig {
    switch (toolId) {
        case 'tool-t6-harvester':
            return { reachDistance: 145, endRadius: 92, hasBladeBar: true, bladeWidth: 90 };
        case 'tool-t5-vacuum':
        case 'vacuum-heavy':
            return { reachDistance: 110, endRadius: 68 };
        case 'tool-t4-turbine':
            return { reachDistance: 80, endRadius: 50 };
        case 'tool-t3-broom':
        case 'broom-industrial':
            return { reachDistance: 55, endRadius: 38 };
        case 'tool-t2-brush':
            return { reachDistance: 42, endRadius: 26 };
        case 'tool-t1-scraper':
        case 'brush-starter':
        default:
            return { reachDistance: 30, endRadius: 18 };
    }
}

export class PlayerEntity {
    public container: Container;
    public readonly model: PlayerModel;
    public x: number;
    public y: number;
    public rotation: number = 0;
    public baseSpeed: number = 240;
    public speed: number = 240; // px/s
    public radius: number = 18;

    // Car Dynamics & Driving Model (Bruno Simon style)
    public currentLinearSpeed: number = 0; // px/s
    public readonly acceleration: number = 680; // px/s^2 forward acceleration
    public readonly deceleration: number = 720; // px/s^2 natural drag/friction
    public readonly brakeDeceleration: number = 1100; // px/s^2 active braking
    public readonly maxReverseSpeedRatio: number = 0.55; // 55% of forward max speed
    public readonly turnSpeed: number = 3.2; // rad/s (approx 183 deg/s)
    public cruiseControl: boolean = false;

    // Turbo-Glide [Shift] Boost Dynamics
    public boostEnergy: number = 100; // 0 to 100%
    public readonly maxBoostEnergy: number = 100;
    public isBoosting: boolean = false;
    public isSweeping: boolean = false;
    public readonly boostMultiplier: number = 1.70; // +70% speed during turbo

    public setSpeedMultiplier(multiplier: number): void {
        this.speed = this.baseSpeed * Math.max(0.2, multiplier);
    }

    private graphics: Graphics;
    private thrustersGfx: Graphics;
    private headlightGfx: Graphics;
    private suctionGfx: Graphics;
    private guideArrowGfx: Graphics;
    private guideTarget: { x: number; y: number } | null = null;
    private animTimer: number = 0;
    private currentToolId: string = 'brush-starter';
    private worldWidth: number;
    private worldHeight: number;

    constructor(startX: number, startY: number, worldWidth: number = 6144, worldHeight: number = 6144) {
        this.x = startX;
        this.y = startY;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        this.model = new PlayerModel({
            x: startX,
            y: startY,
            baseSpeed: this.baseSpeed,
            currentToolId: this.currentToolId,
        });

        this.container = new Container();
        this.container.x = this.x;
        this.container.y = this.y;

        this.headlightGfx = new Graphics();
        this.container.addChild(this.headlightGfx); // Forward volumetric 2D headlight beam

        this.suctionGfx = new Graphics();
        this.container.addChild(this.suctionGfx); // Dynamic vacuum vortex layer

        this.thrustersGfx = new Graphics();
        this.container.addChild(this.thrustersGfx); // Underlying thruster exhaust

        this.guideArrowGfx = new Graphics();
        this.container.addChild(this.guideArrowGfx); // Dynamic base navigation arrow

        this.graphics = new Graphics();
        this.container.addChild(this.graphics);

        this.renderPlayer();
    }

    private renderPlayer(toolId: string = 'brush-starter'): void {
        this.currentToolId = toolId;
        this.graphics.clear();

        // 1. Miękki cień pod astronautą
        this.graphics.ellipse(0, 3, this.radius + 1, this.radius - 1)
            .fill({ color: 0x000000, alpha: 0.35 });

        // 2. Plecak ciśnieniowy / zasobnik na urobek (Backpack Canister na plecach x = -15..-7)
        this.graphics.roundRect(-15, -9, 8, 18, 3.5)
            .fill({ color: VENUS_THEME.industrialBeige })
            .stroke({ width: 2, color: VENUS_THEME.ink });
        // Miedziane obejmy plecaka
        this.graphics.rect(-15, -6, 8, 2).fill({ color: VENUS_THEME.copperBase });
        this.graphics.rect(-15, 4, 8, 2).fill({ color: VENUS_THEME.copperBase });

        // 3. Skafander Hazmat (Biało-kremowy kompozyt z komiksowym tuszem)
        this.graphics.roundRect(-9, -13, 18, 26, 8)
            .fill({ color: 0xf1f5f9 })
            .stroke({ width: 2.5, color: VENUS_THEME.ink });

        // Ochronne pasy naramienne w kolorze terakoty / hazmat orange
        this.graphics.roundRect(-7, -13, 14, 5, 2).fill({ color: VENUS_THEME.terracottaLight });
        this.graphics.roundRect(-7, 8, 14, 5, 2).fill({ color: VENUS_THEME.terracottaLight });

        // 4. Zaokrąglony hełm ze złotym wizjerem termicznym (Wzorowany na grafice koncepcyjnej)
        this.graphics.circle(0, 0, 9)
            .fill({ color: 0xe2e8f0 })
            .stroke({ width: 2, color: VENUS_THEME.ink });

        // Wypukły złocisty wizjer
        this.graphics.roundRect(0, -6, 8, 12, 4)
            .fill({ color: VENUS_THEME.hazardYellow })
            .stroke({ width: 1, color: VENUS_THEME.copperDark });

        // Błysk refleksu światła na szkle wizjera
        this.graphics.moveTo(2, -4).lineTo(6, -4)
            .stroke({ width: 1.5, color: 0xffffff, alpha: 0.9 });

        // 5. Elastyczna karbowana rura ssąca (Flexible Ribbed Vacuum Hose)
        // Łączy lewy zasobnik plecaka z gardzielą ssącą lemiesza
        const hoseNodes = [
            { x: -11, y: 5 },
            { x: -7, y: 11 },
            { x: -1, y: 13 },
            { x: 5, y: 12 },
            { x: 10, y: 7 },
        ];
        this.graphics.moveTo(-11, 5)
            .quadraticCurveTo(0, 15, 10, 7)
            .stroke({ width: 3.2, color: 0x0F172A });
        this.graphics.moveTo(-11, 5)
            .quadraticCurveTo(0, 15, 10, 7)
            .stroke({ width: 2.0, color: 0x334155 });

        // Karbowane metalowe pierścienie elastycznej rury próżniowej
        for (const pt of hoseNodes) {
            this.graphics.circle(pt.x, pt.y, 1.8).fill({ color: 0xE2E8F0 });
            this.graphics.circle(pt.x, pt.y, 1.0).fill({ color: 0x0F172A });
        }

        // 6. ETAP 5: Profilowany Lemiesz Próżniowy (Trapez ze ściętymi rogami w kolorze żółto-stalowym)
        // z czarnymi pasami ostrzegawczymi na krawędziach
        this.renderVacuumBlade(toolId);

        // 7. Directional Arrow Accent
        this.graphics.poly([
            { x: 3, y: -3 },
            { x: 8, y: 0 },
            { x: 3, y: 3 },
        ]).fill({ color: 0xffffff, alpha: 0.85 });
    }

    /**
     * ETAP 5.1: Rysowanie profilowanego lemiesza próżniowego z pasami ostrzegawczymi
     */
    private renderVacuumBlade(toolId: string): void {
        let halfH = 10;
        let width = 8;
        let startX = 9;

        if (toolId === 'tool-t6-harvester') {
            halfH = 22;
            width = 15;
            startX = 8;
        } else if (toolId === 'tool-t5-vacuum' || toolId === 'vacuum-heavy') {
            halfH = 18;
            width = 13;
            startX = 8;
        } else if (toolId === 'tool-t4-turbine') {
            halfH = 15;
            width = 11;
            startX = 9;
        } else if (toolId === 'tool-t3-broom' || toolId === 'broom-industrial') {
            halfH = 13;
            width = 10;
            startX = 9;
        } else if (toolId === 'tool-t2-brush') {
            halfH = 11;
            width = 9;
            startX = 9;
        }

        const endX = startX + width;
        const chamfer = 3.5;

        // Stalowa tuleja montażowa / gardziel
        this.graphics.roundRect(startX - 2, -5, 4, 10, 1.5)
            .fill({ color: 0x1E293B })
            .stroke({ width: 1.5, color: 0x0F172A });

        // Profilowany lemiesz: trapez ze ściętymi rogami w kolorze stalowo-ciemnym (0x334155)
        this.graphics.poly([
            { x: startX, y: -halfH + chamfer },
            { x: startX + chamfer, y: -halfH },
            { x: endX - chamfer, y: -halfH * 0.9 },
            { x: endX, y: -halfH * 0.9 + chamfer },
            { x: endX, y: halfH * 0.9 - chamfer },
            { x: endX - chamfer, y: halfH * 0.9 },
            { x: startX + chamfer, y: halfH },
            { x: startX, y: halfH - chamfer },
        ]).fill({ color: 0x334155 }).stroke({ width: 2, color: 0x0F172A });

        // Przednia żółto-stalowa listwa czołowa (0xEAB308)
        this.graphics.poly([
            { x: endX - 3.5, y: -halfH * 0.82 },
            { x: endX, y: -halfH * 0.9 + chamfer },
            { x: endX, y: halfH * 0.9 - chamfer },
            { x: endX - 3.5, y: halfH * 0.82 },
        ]).fill({ color: 0xEAB308 }).stroke({ width: 1, color: 0x0F172A });

        // Czarne pasy ostrzegawcze (Hazard Stripes) na krawędzi czołowej
        const stripeStep = 5;
        for (let sy = -halfH * 0.75; sy < halfH * 0.75; sy += stripeStep) {
            this.graphics.moveTo(endX - 3.5, sy)
                .lineTo(endX, sy + 3)
                .stroke({ width: 1.2, color: 0x0F172A });
        }

        // Ciemny wlot próżniowy (suction nozzle slot)
        this.graphics.ellipse(endX, 0, 1.5, Math.min(5, halfH * 0.35))
            .fill({ color: 0x0A0D14 });
    }

    /**
     * ETAP 5.2 / FIX: Dynamiczny stożek próżniowy (Vacuum Vortex) dopasowany do zasięgu narzędzia
     */
    private renderSuctionAndHeadlight(): void {
        this.headlightGfx.clear();
        this.suctionGfx.clear();

        const config = getToolConeConfig(this.currentToolId);

        if (this.isSweeping) {
            // Dynamiczny stożek zasysania w kolorze cyjanowo-błękitnym (0x38BDF8, alpha: 0.22)
            // Kształt to rozszerzający się stożek z zaokrąglonym łukiem czołowym (arc)
            const nozzleX = 18;
            const coneLength = config.reachDistance;
            const endRadius = config.endRadius;
            const startRadius = Math.max(8, endRadius * 0.35);

            // Zewnętrzny stożek zasysania
            this.suctionGfx.moveTo(nozzleX, -startRadius);
            this.suctionGfx.lineTo(nozzleX + coneLength, -endRadius);
            // Zaokrąglony łuk czołowy stożka (arc/quadratic curve)
            this.suctionGfx.quadraticCurveTo(
                nozzleX + coneLength + endRadius * 0.35, 0,
                nozzleX + coneLength, endRadius
            );
            this.suctionGfx.lineTo(nozzleX, startRadius);
            this.suctionGfx.closePath();
            this.suctionGfx.fill({ color: 0x38BDF8, alpha: 0.22 });

            // Jaśniejszy rdzeń wiru wewnętrznego
            const innerLength = coneLength * 0.55;
            const innerEndRadius = endRadius * 0.45;
            const innerStartRadius = startRadius * 0.5;

            this.suctionGfx.moveTo(nozzleX, -innerStartRadius);
            this.suctionGfx.lineTo(nozzleX + innerLength, -innerEndRadius);
            this.suctionGfx.quadraticCurveTo(
                nozzleX + innerLength + innerEndRadius * 0.35, 0,
                nozzleX + innerLength, innerEndRadius
            );
            this.suctionGfx.lineTo(nozzleX, innerStartRadius);
            this.suctionGfx.closePath();
            this.suctionGfx.fill({ color: 0xBAE6FD, alpha: 0.26 });

            // Jeśli narzędzie to Mega-Harvester z szerokim lemieszem, dorysuj poświatę lemiesza
            if (config.hasBladeBar && config.bladeWidth) {
                const halfW = config.bladeWidth * 0.5;
                this.suctionGfx.roundRect(nozzleX, -halfW, 10, config.bladeWidth, 3)
                    .fill({ color: 0x38BDF8, alpha: 0.15 });
            }

            // 3 animowane łuki fal podciśnienia wpadające od zewnątrz do gardzieli
            for (let i = 0; i < 3; i++) {
                const waveProgress = 1.0 - ((this.animTimer * 2.4 + i * 0.33) % 1.0);
                const arcDist = nozzleX + 4 + waveProgress * (coneLength - 6);
                const arcSpread = startRadius + waveProgress * (endRadius - startRadius);
                const arcAlpha = Math.sin(waveProgress * Math.PI) * 0.65;

                this.suctionGfx.moveTo(arcDist, -arcSpread)
                    .quadraticCurveTo(arcDist - 6 * waveProgress, 0, arcDist, arcSpread)
                    .stroke({ width: 2.0, color: 0xE0F2FE, alpha: arcAlpha });
            }
        } else {
            // Reflektor eksploracyjny (subtelny, spójny snop światła o zminimalizowanym kontraście)
            const headDist = Math.max(90, config.reachDistance + 35);
            const headSpread = Math.max(26, config.endRadius * 0.85);

            // 1. Zewnętrzny snop światła (delikatna ciepła poświata)
            this.headlightGfx.poly([
                { x: 14, y: -6 },
                { x: 14 + headDist, y: -headSpread },
                { x: 14 + headDist, y: headSpread },
                { x: 14, y: 6 },
            ]).fill({ color: 0xfde047, alpha: 0.08 });

            // 2. Wewnętrzny rdzeń światła (kontrast obniżony z 0.15 do 0.04, kolor ujednolicony z poświatą)
            this.headlightGfx.poly([
                { x: 14, y: -4 },
                { x: 14 + headDist * 0.75, y: -headSpread * 0.55 },
                { x: 14 + headDist * 0.75, y: headSpread * 0.55 },
                { x: 14, y: 4 },
            ]).fill({ color: 0xfde047, alpha: 0.04 });

            // Żarówki reflektorów na zderzaku
            this.headlightGfx.circle(13, -7, 1.8).fill({ color: 0xffffff, alpha: 0.9 });
            this.headlightGfx.circle(13, 7, 1.8).fill({ color: 0xffffff, alpha: 0.9 });
        }
    }

    public setTool(toolId: string): void {
        this.renderPlayer(toolId);
    }

    public update(dt: number, input: PlayerInput, mouseWorldPos?: { x: number; y: number }): void {
        // 1. Steering Physics (Kierowanie łazikiem)
        // Klawisze A / D: bezpośredni skręt kół / obrót podwozia
        if (input.left) {
            this.rotation -= this.turnSpeed * dt;
        } else if (input.right) {
            this.rotation += this.turnSpeed * dt;
        } else if (mouseWorldPos) {
            // Wspomaganie myszką (Mouse Steering): płynny obrót w stronę kursora z maks. prędkością turnSpeed * dt
            const toMouseX = mouseWorldPos.x - this.x;
            const toMouseY = mouseWorldPos.y - this.y;
            const distToMouse = Math.hypot(toMouseX, toMouseY);

            // Gdy myszka nie leży bezpośrednio w środku łazika (martwa strefa 22px)
            if (distToMouse > 22) {
                const targetAngle = Math.atan2(toMouseY, toMouseX);
                let angleDiff = targetAngle - this.rotation;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                const maxTurn = this.turnSpeed * dt;
                if (Math.abs(angleDiff) > 0.02) {
                    this.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxTurn);
                }
            }
        }

        // Normalizacja kąta podwozia do zakresu [-PI, PI]
        while (this.rotation < -Math.PI) this.rotation += Math.PI * 2;
        while (this.rotation > Math.PI) this.rotation -= Math.PI * 2;

        // 2. Tempomat & Throttle (Gaz, hamulec, wsteczny i tempomat)
        // Naciśnięcie S (hamulec) rozłącza tempomat
        if (input.down && this.cruiseControl) {
            this.cruiseControl = false;
        }

        const isAcceleratingForward = input.up || this.cruiseControl;
        const isBrakingOrReverse = input.down;

        // Turbo-Glide [Shift] Logic
        const isRolling = Math.abs(this.currentLinearSpeed) > 15 || isAcceleratingForward;
        if (input.boost && isRolling && this.boostEnergy > 3) {
            this.isBoosting = true;
            this.boostEnergy = Math.max(0, this.boostEnergy - 30 * dt); // ~3.3s full burn
        } else {
            this.isBoosting = false;
            // Recharges in ~4 seconds
            this.boostEnergy = Math.min(this.maxBoostEnergy, this.boostEnergy + 25 * dt);
        }

        const maxForwardSpeed = this.isBoosting ? this.speed * this.boostMultiplier : this.speed;
        const maxReverseSpeed = this.speed * this.maxReverseSpeedRatio;

        // Linear Speed Simulation (Bruno Simon car physics)
        if (isAcceleratingForward) {
            if (this.currentLinearSpeed < 0) {
                // Hamowanie podczas toczenia w tył
                this.currentLinearSpeed += this.brakeDeceleration * dt;
            } else {
                // Przyspieszanie w przód
                this.currentLinearSpeed = Math.min(maxForwardSpeed, this.currentLinearSpeed + this.acceleration * dt);
            }
        } else if (isBrakingOrReverse) {
            if (this.currentLinearSpeed > 0) {
                // Hamowanie podczas jazdy w przód
                this.currentLinearSpeed = Math.max(0, this.currentLinearSpeed - this.brakeDeceleration * dt);
            } else {
                // Bieg wsteczny
                this.currentLinearSpeed = Math.max(-maxReverseSpeed, this.currentLinearSpeed - this.acceleration * dt);
            }
        } else {
            // Bezwładność / tarcie naturalne podłoża Wenus
            if (this.currentLinearSpeed > 0) {
                this.currentLinearSpeed = Math.max(0, this.currentLinearSpeed - this.deceleration * dt);
            } else if (this.currentLinearSpeed < 0) {
                this.currentLinearSpeed = Math.min(0, this.currentLinearSpeed + this.deceleration * dt);
            }
        }

        // Animate Dual Thruster Exhaust Plumes
        this.renderThrusters();

        // ETAP 5: Animacja wiązki próżniowej / reflektorów
        this.animTimer += dt;
        this.renderSuctionAndHeadlight();
        this.renderGuideArrow();

        // Ruch wzdłuż osi podwozia (łazik porusza się w kierunku przodu/tyłu)
        if (Math.abs(this.currentLinearSpeed) > 0.1) {
            this.x += Math.cos(this.rotation) * this.currentLinearSpeed * dt;
            this.y += Math.sin(this.rotation) * this.currentLinearSpeed * dt;

            // Clamp within world boundary
            const margin = this.radius + 4;
            this.x = Math.max(margin, Math.min(this.worldWidth - margin, this.x));
            this.y = Math.max(margin, Math.min(this.worldHeight - margin, this.y));
        }

        this.container.x = this.x;
        this.container.y = this.y;
        this.container.rotation = this.rotation;

        // Synchronize Headless PlayerModel state
        this.model.x = this.x;
        this.model.y = this.y;
        this.model.rotation = this.rotation;
        this.model.speed = this.speed;
        this.model.boostEnergy = this.boostEnergy;
        this.model.isBoosting = this.isBoosting;
        this.model.isSweeping = this.isSweeping;
    }

    /**
     * Renders dual rocket thruster exhaust flares when Turbo-Glide is active.
     */
    private renderThrusters(): void {
        this.thrustersGfx.clear();
        if (!this.isBoosting) return;

        const flameLength = 14 + Math.random() * 12;
        const flameWidth = 5 + Math.random() * 2;

        // Dual exhaust nozzles on rear flanks (y = -7 and y = +7, x = -14)
        const nozzleOffsets = [-7, 7];
        for (const ny of nozzleOffsets) {
            // Outer hot orange flare
            this.thrustersGfx.poly([
                { x: -14, y: ny - flameWidth * 0.5 },
                { x: -14 - flameLength, y: ny },
                { x: -14, y: ny + flameWidth * 0.5 },
            ]).fill({ color: 0xf97316, alpha: 0.85 });

            // Inner white-hot cyan core
            this.thrustersGfx.poly([
                { x: -14, y: ny - flameWidth * 0.25 },
                { x: -14 - flameLength * 0.65, y: ny },
                { x: -14, y: ny + flameWidth * 0.25 },
            ]).fill({ color: 0x38bdf8, alpha: 0.95 });
        }
    }

    public setGuideTarget(target: { x: number; y: number } | null): void {
        this.guideTarget = target;
    }

    private renderGuideArrow(): void {
        this.guideArrowGfx.clear();
        if (!this.guideTarget) return;

        const dx = this.guideTarget.x - this.x;
        const dy = this.guideTarget.y - this.y;
        const dist = Math.hypot(dx, dy);

        // Hide arrow if player is close to target (< 85px)
        if (dist < 85) return;

        const worldAngle = Math.atan2(dy, dx);
        const relAngle = worldAngle - this.rotation;

        const pulse = Math.sin(this.animTimer * 5.5) * 3;
        const arrowDist = 38 + pulse;

        const ax = Math.cos(relAngle) * arrowDist;
        const ay = Math.sin(relAngle) * arrowDist;

        const tipX = ax + Math.cos(relAngle) * 14;
        const tipY = ay + Math.sin(relAngle) * 14;
        const leftX = ax + Math.cos(relAngle + 2.5) * 8;
        const leftY = ay + Math.sin(relAngle + 2.5) * 8;
        const rightX = ax + Math.cos(relAngle - 2.5) * 8;
        const rightY = ay + Math.sin(relAngle - 2.5) * 8;

        this.guideArrowGfx.poly([
            { x: tipX, y: tipY },
            { x: leftX, y: leftY },
            { x: ax, y: ay },
            { x: rightX, y: rightY },
        ])
        .fill({ color: 0xF59E0B, alpha: 0.95 })
        .stroke({ color: 0x0F172A, width: 2.2 });

        this.guideArrowGfx.circle(ax + Math.cos(relAngle) * 4, ay + Math.sin(relAngle) * 4, 1.8)
            .fill({ color: 0xFFFBEB });
    }

    public teleportTo(newX: number, newY: number): void {
        this.x = newX;
        this.y = newY;
        this.container.x = newX;
        this.container.y = newY;
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    public getToolConeConfig(): ToolConeConfig {
        return getToolConeConfig(this.currentToolId);
    }

    public getFrontBrushPosition(toolRadius: number = 16): { x: number; y: number } {
        const config = getToolConeConfig(this.currentToolId);
        const nozzleDistance = 18 + config.reachDistance * 0.7;
        return {
            x: this.x + Math.cos(this.rotation) * nozzleDistance,
            y: this.y + Math.sin(this.rotation) * nozzleDistance,
        };
    }

    public destroy(): void {
        this.container.destroy({ children: true });
    }
}

