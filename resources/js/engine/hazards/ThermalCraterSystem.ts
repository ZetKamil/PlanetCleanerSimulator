import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { SoundSystem } from '../SoundSystem';
import type { DirtSystem } from '../DirtSystem';

export type CraterArchetype = 'caldera' | 'pit' | 'vent';

export interface ThermalCraterConfig {
    id: string;               // Unikalny identyfikator, np. 'CRATER-01'
    name: string;             // Nazwa wulkanu / kaldery
    x: number;                // Pozycja X w świecie gry
    y: number;                // Pozycja Y w świecie gry
    radius: number;           // Promień strefy krateru w pikselach
    hasLava?: boolean;        // Czy krater posiada fizycznie wrzącą lawę (jeśli false: zimny, nie parzy!)
    peakTemp?: number;        // Temperatura w centrum w °C (domyślnie 890 dla lawy, 460 dla zimnego)
    heatRate?: number;        // Szybkość nagrzewania pojazdu (0.20 dla lawy, 0.0 dla zimnego)
    coolingRate?: number;     // Szybkość chłodzenia (domyślnie 0.25 / s)
    description?: string;     // Opis naukowy / taktyczny
    isVolcanicActive?: boolean; // Czy krater jest aktywny geotermalnie
    type?: CraterArchetype;   // Typ archetypu: caldera (lawowa), pit (bazaltowa bez lawy), vent (szczelinowa)
    isDiscovered?: boolean;   // Czy krater został już odkryty (oczyszczony z pyłu)
    cleanPct?: number;        // Procent oczyszczenia pyłu [0 - 100]
    yieldKW?: number;         // Moc wyjściowa elektrowni geotermalnej (+80 kW)
}

export interface FissureBranch {
    points: { x: number; y: number }[];
    branch?: { x: number; y: number }[];
}

/**
 * Samodzielny obiekt krateru na Wenus.
 * Posiada asymetryczną, organiczną geometrię wielokątową (stylizowaną na background.jpg od grafika).
 * Rozróżnia kratery GORĄCE Z PŁYNNĄ LAWĄ (parzące i dające +80 kW zasilania geotermalnego)
 * od ZIMNYCH LEJÓW BAZALTOWYCH (bezpiecznych termicznie, dających +80 kW z głębinowego ciepła).
 */
export class ThermalCrater {
    public readonly id: string;
    public name: string;
    public x: number;
    public y: number;
    public radius: number;
    public hasLava: boolean;
    public isHot: boolean;
    public peakTemp: number;
    public heatRate: number;
    public coolingRate: number;
    public description: string;
    public isVolcanicActive: boolean;
    public type: CraterArchetype;
    public readonly yieldKW: number = 80;

    // Discovery & cleaning state (odsłanianie krateru spod pyłu)
    public isDiscovered: boolean = false;
    public cleanPct: number = 0;

    // Radiating magma fissures (żyły magmy wychodzące w bazalt)
    public fissures: FissureBranch[] = [];

    constructor(config: ThermalCraterConfig) {
        this.id = config.id;
        this.name = config.name;
        this.x = config.x;
        this.y = config.y;
        this.radius = config.radius;
        this.type = config.type ?? (config.hasLava ? 'caldera' : 'pit');
        this.hasLava = config.hasLava ?? (this.type === 'caldera');
        this.isHot = this.hasLava;
        this.isVolcanicActive = config.isVolcanicActive ?? true;
        this.yieldKW = config.yieldKW ?? 80;
        this.isDiscovered = config.isDiscovered ?? false;
        this.cleanPct = config.cleanPct ?? 0;

        if (this.hasLava) {
            // Krater z lawą: kaldera magmowa o wysokiej emisji ciepła i potężnym potencjale geotermalnym (+80 kW)
            this.peakTemp = config.peakTemp ?? 890;
            this.heatRate = config.heatRate ?? 0.22;
            this.description = config.description ?? 'Aktywna kaldera magmowa z odsłoniętym jeziorem wrzącej lawy. Źródło energii geotermalnej (+80 kW).';
            this.initFissures();
        } else {
            // Krater wygasły / bez lawy: bezpieczny, temperatura otoczenia 460°C, zero nagrzewania
            this.peakTemp = 460;
            this.heatRate = 0.0;
            this.description = config.description ?? 'Wygasły krater bazaltowy / zapadlisko skalne. Brak powierzchniowej lawy, głębinowe ciepło geotermalne (+80 kW).';
        }

        this.coolingRate = config.coolingRate ?? 0.25;
    }

    /**
     * Inicjalizuje deterministyczne, rozgałęzione pęknięcia magmowe (żyły lawy)
     * promieniście rozchodzące się ze skraju kaldery w otaczający ciemny bazalt.
     */
    public initFissures(): void {
        if (!this.hasLava) {
            this.fissures = [];
            return;
        }

        const seedVal = Math.abs(Math.sin(this.x * 3.71 + this.y * 7.13) * 43758.5453);
        const fissureCount = 4 + Math.floor((seedVal % 4)); // 4 do 7 żył magmowych
        this.fissures = [];

        for (let k = 0; k < fissureCount; k++) {
            const baseAngle = (k / fissureCount) * Math.PI * 2 + ((seedVal * (k + 1) * 0.43) % 0.8) - 0.4;
            const startR = this.radius * 0.94;
            let curX = this.x + Math.cos(baseAngle) * startR;
            let curY = this.y + Math.sin(baseAngle) * startR;

            const points: { x: number; y: number }[] = [{ x: curX, y: curY }];
            let curAngle = baseAngle;
            const lengthSeed = Math.abs(Math.sin(this.y * 2.3 + k * 17.1));
            const totalLength = this.radius * (0.40 + lengthSeed * 0.50); // Zasięg w głąb skały
            const segCount = 4 + Math.floor(lengthSeed * 3);
            const segLength = totalLength / segCount;

            let branchPoints: { x: number; y: number }[] | undefined = undefined;

            for (let s = 0; s < segCount; s++) {
                const stepSeed = Math.sin(this.x * 1.7 + k * 5.3 + s * 11.9);
                curAngle += stepSeed * 0.38;
                curX += Math.cos(curAngle) * segLength;
                curY += Math.sin(curAngle) * segLength;
                points.push({ x: curX, y: curY });

                // Szansa na rozgałęzienie pęknięcia w segmencie 1 lub 2
                if (s === 1 && !branchPoints && Math.abs(Math.cos(this.y * 3.1 + k * 2.9)) > 0.35) {
                    branchPoints = [{ x: curX, y: curY }];
                    let bAngle = curAngle + (stepSeed > 0 ? 0.65 : -0.65);
                    let bx = curX;
                    let by = curY;
                    const bSegs = 2 + Math.floor(Math.abs(stepSeed) * 2);
                    for (let bs = 0; bs < bSegs; bs++) {
                        bAngle += Math.sin(bs * 5.7 + k) * 0.32;
                        bx += Math.cos(bAngle) * (segLength * 0.75);
                        by += Math.sin(bAngle) * (segLength * 0.75);
                        branchPoints.push({ x: bx, y: by });
                    }
                }
            }

            this.fissures.push({ points, branch: branchPoints });
        }
    }

    /**
     * Promień strefy czyszczenia, która musi zostać odsłonięta z pyłu, aby zaliczyć odkrycie krateru.
     * Reprezentuje rdzeń kaldery / dno niecki.
     */
    public get discoveryRadius(): number {
        return Math.max(32, Math.min(this.radius * 0.68, 90));
    }

    public setRadius(r: number): void {
        this.radius = Math.max(10, r);
        this.initFissures();
    }

    public setPeakTemp(temp: number): void {
        this.peakTemp = temp;
    }

    public setHeatRate(rate: number): void {
        this.heatRate = Math.max(0, rate);
    }

    public setCoolingRate(rate: number): void {
        this.coolingRate = Math.max(0.01, rate);
    }

    public setActive(active: boolean): void {
        this.isVolcanicActive = active;
    }

    public setPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
        this.initFissures();
    }

    public containsPoint(px: number, py: number): boolean {
        return Math.hypot(px - this.x, py - this.y) <= this.radius;
    }

    /**
     * Nieliniowy przyrost ciepła wokół krateru z lawą (Gradient Radialny).
     * - Krawędź wału krateru (dist ≈ radius): przyrost ciepła = 0.0 (bezpieczne odkurzanie obrzeży).
     * - Połowa odległości (dist = 0.5 * radius): umiarkowane ciepło (0.25).
     * - Centrum jeziora lawy (dist -> 0): skrajne wrzenie magmowe (1.0).
     * Jeśli krater NIE MA LAWY (hasLava = false), zwraca 0.0 (nie parzy w ogóle!).
     */
    public getThermalIntensity(px: number, py: number): number {
        if (!this.isVolcanicActive || !this.hasLava || !this.isHot) return 0;
        const dist = Math.hypot(px - this.x, py - this.y);
        if (dist >= this.radius) return 0;
        const norm = 1.0 - (dist / this.radius);
        return Math.pow(norm, 2.0);
    }

    /**
     * Generuje punkty organicznego, asymetrycznego wielokąta wulkanicznego.
     * Zastępuje sztuczny okrąg naturalną, poszarpaną strukturą skalną jak z ilustracji background.jpg.
     */
    private getOrganicPolygon(radiusMultiplier: number, vertexCount: number = 32): number[] {
        const poly: number[] = [];
        // Deterministyczne ziarno z koordynatów krateru
        const seedVal = Math.abs(Math.sin(this.x * 12.9898 + this.y * 78.233) * 43758.5453);
        const p1 = (seedVal * 1.7) % (Math.PI * 2);
        const p2 = (seedVal * 3.1) % (Math.PI * 2);
        const p3 = (seedVal * 5.3) % (Math.PI * 2);

        // Fale harmoniczne modelujące wulkaniczne zbocza
        const amp1 = 0.09 + ((seedVal * 0.03) % 0.05); // Eliptyczne spłaszczenie
        const amp2 = 0.06 + ((seedVal * 0.02) % 0.04); // Występy skalne
        const amp3 = 0.03;                             // Mikroszarpanie krawędzi

        for (let i = 0; i < vertexCount; i++) {
            const angle = (i / vertexCount) * Math.PI * 2;
            const distortion = 1.0
                + amp1 * Math.sin(2 * angle + p1)
                + amp2 * Math.cos(3 * angle + p2)
                + amp3 * Math.sin(5 * angle + p3);

            const r = this.radius * radiusMultiplier * distortion;
            poly.push(this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r);
        }
        return poly;
    }

    /**
     * Rysuje krater wiernie według stylistyki background.jpg i venus-surface.jpg:
     * - Rozchodzące się w skałę rozgałęzione żyły magmy (Magma Fissures)
     * - Cienie kierunkowe (światło z góry-lewej)
     * - Asymetryczne wały wulkaniczne
     * - Żarzące jezioro lawy z promienistym gradientem ciepła (bez sztucznych czarnych kółek)
     * - Głębokie, wielopoziomowe niecki bazaltowe dla wygasłych kraterów
     */
    public render(gfx: Graphics): void {
        const r = this.radius;

        // ==============================================================
        // 1. ROZCHODZĄCE SIĘ ŻYŁY MAGMY (MAGMA FISSURES W SKALE BAZALTOWEJ)
        // ==============================================================
        if (this.hasLava && this.fissures.length > 0) {
            // Warstwa A: Szeroka poświata żaru magmy (czerwień / pomarańcz)
            for (const fissure of this.fissures) {
                if (fissure.points.length >= 2) {
                    gfx.moveTo(fissure.points[0].x, fissure.points[0].y);
                    for (let p = 1; p < fissure.points.length; p++) {
                        gfx.lineTo(fissure.points[p].x, fissure.points[p].y);
                    }
                    gfx.stroke({ width: 5.5, color: 0xea580c, alpha: 0.65 });
                }
                if (fissure.branch && fissure.branch.length >= 2) {
                    gfx.moveTo(fissure.branch[0].x, fissure.branch[0].y);
                    for (let p = 1; p < fissure.branch.length; p++) {
                        gfx.lineTo(fissure.branch[p].x, fissure.branch[p].y);
                    }
                    gfx.stroke({ width: 4.2, color: 0xea580c, alpha: 0.55 });
                }
            }

            // Warstwa B: Płynna gorąca magma (pomarańcz)
            for (const fissure of this.fissures) {
                if (fissure.points.length >= 2) {
                    gfx.moveTo(fissure.points[0].x, fissure.points[0].y);
                    for (let p = 1; p < fissure.points.length; p++) {
                        gfx.lineTo(fissure.points[p].x, fissure.points[p].y);
                    }
                    gfx.stroke({ width: 2.8, color: 0xf97316, alpha: 0.90 });
                }
                if (fissure.branch && fissure.branch.length >= 2) {
                    gfx.moveTo(fissure.branch[0].x, fissure.branch[0].y);
                    for (let p = 1; p < fissure.branch.length; p++) {
                        gfx.lineTo(fissure.branch[p].x, fissure.branch[p].y);
                    }
                    gfx.stroke({ width: 2.0, color: 0xf97316, alpha: 0.85 });
                }
            }

            // Warstwa C: Rozżarzony rdzeń pęknięcia (złoto-białe jądro)
            for (const fissure of this.fissures) {
                if (fissure.points.length >= 2) {
                    gfx.moveTo(fissure.points[0].x, fissure.points[0].y);
                    for (let p = 1; p < fissure.points.length; p++) {
                        gfx.lineTo(fissure.points[p].x, fissure.points[p].y);
                    }
                    gfx.stroke({ width: 1.2, color: 0xfef08a, alpha: 1.0 });
                }
                if (fissure.branch && fissure.branch.length >= 2) {
                    gfx.moveTo(fissure.branch[0].x, fissure.branch[0].y);
                    for (let p = 1; p < fissure.branch.length; p++) {
                        gfx.lineTo(fissure.branch[p].x, fissure.branch[p].y);
                    }
                    gfx.stroke({ width: 0.9, color: 0xfef08a, alpha: 0.95 });
                }
            }
        }

        // ==============================================================
        // 2. KRAWĘDŹ I WAŁ KRATERU
        // ==============================================================
        // Cień zewnętrzny rzucany w kierunku SE (światło z góry-lewej)
        const shadowPoly = this.getOrganicPolygon(1.14);
        for (let i = 0; i < shadowPoly.length; i += 2) {
            shadowPoly[i] += r * 0.06;
            shadowPoly[i + 1] += r * 0.10;
        }
        gfx.poly(shadowPoly, true).fill({ color: 0x120a07, alpha: 0.45 });

        // Zewnętrzna strefa osmaleń i spękanego bazaltu (Apron)
        const apronPoly = this.getOrganicPolygon(1.20);
        gfx.poly(apronPoly, true).fill({ color: 0x271912, alpha: 0.60 });

        // Główny wyniesiony wał bazaltowy (Crater Rim)
        const rimPoly = this.getOrganicPolygon(1.02);
        gfx.poly(rimPoly, true).fill({ color: 0x362319, alpha: 0.96 });

        // Rozświetlona krawędź wału wulkanicznego (północno-zachodni łuk)
        const highlightPoly = this.getOrganicPolygon(1.02, 32);
        for (let i = 18; i < 30; i++) {
            const idx1 = i * 2;
            const idx2 = ((i + 1) % 32) * 2;
            gfx.moveTo(highlightPoly[idx1], highlightPoly[idx1 + 1])
                .lineTo(highlightPoly[idx2], highlightPoly[idx2 + 1])
                .stroke({ width: 4.0, color: 0x6e4533, alpha: 0.88 });
        }

        // Wewnętrzny uskok ściany krateru (Inner Cliff)
        const innerSlopePoly = this.getOrganicPolygon(0.82);
        gfx.poly(innerSlopePoly, true).fill({ color: 0x1c110b, alpha: 1.0 });

        // Wewnętrzny cień rzucany przez wał do środka niecki
        const innerShadowPoly = this.getOrganicPolygon(0.74);
        for (let i = 0; i < innerShadowPoly.length; i += 2) {
            innerShadowPoly[i] -= r * 0.04;
            innerShadowPoly[i + 1] -= r * 0.04;
        }
        gfx.poly(innerShadowPoly, true).fill({ color: 0x0c0604, alpha: 0.65 });

        // ==============================================================
        // 3. WNĘTRZE: WRZĄCA LAWOWA KALDERA vs ZIMNA NIECKA BAZALTOWA
        // ==============================================================
        if (this.hasLava) {
            // === AKTYWNA KALDERA MAGMOWA ===
            // Subtelna poświata termiczna w tle
            gfx.circle(this.x, this.y, r * 0.66)
                .fill({ color: 0xea580c, alpha: 0.22 });

            // Brzeg stygnącej magmy (głęboka czerwień)
            const lavaShore = this.getOrganicPolygon(0.56);
            gfx.poly(lavaShore, true).fill({ color: 0x9a3412, alpha: 1.0 });

            // Płynna, wrząca lawa (czerwień-pomarańcz)
            const lavaCore = this.getOrganicPolygon(0.46);
            gfx.poly(lavaCore, true).fill({ color: 0xc2410c, alpha: 1.0 });

            // Rozżarzone jądro lawowe (pomarańcz)
            const lavaHot = this.getOrganicPolygon(0.36);
            gfx.poly(lavaHot, true).fill({ color: 0xea580c, alpha: 1.0 });

            // Płynny żar (jasny bursztyn)
            const lavaGlow = this.getOrganicPolygon(0.26);
            gfx.poly(lavaGlow, true).fill({ color: 0xf97316, alpha: 1.0 });

            // Punkt wrzenia 900°C+ (złoto-żółty)
            const lavaPeak = this.getOrganicPolygon(0.16);
            gfx.poly(lavaPeak, true).fill({ color: 0xfacc15, alpha: 1.0 });

            // Incandescentne centrum (jasne białe złoto)
            const lavaCenter = this.getOrganicPolygon(0.08);
            gfx.poly(lavaCenter, true).fill({ color: 0xfef08a, alpha: 1.0 });

            // Drobne, organiczne pęcherze gazu / jaśniejsze plamki żaru (zgodne z background.jpg)
            const seed = Math.abs(Math.sin(this.x * 5.1 + this.y * 13.7));
            const bubbleCount = 2 + Math.floor(seed * 3);
            for (let b = 0; b < bubbleCount; b++) {
                const bAngle = (b * 2.2 + seed * 4.1) % (Math.PI * 2);
                const bDist = r * (0.15 + (b * 0.08));
                const bx = this.x + Math.cos(bAngle) * bDist;
                const by = this.y + Math.sin(bAngle) * bDist;
                const bRadius = r * (0.035 + (b * 0.015));
                gfx.circle(bx, by, bRadius).fill({ color: 0xfef08a, alpha: 0.65 });
            }

        } else {
            // === ZIMNY KRATER BEZ LAWY (BASALT PIT) ===
            // Zero lawy! Ciemna otchłań z tarasowymi półkami bazaltu (jak na dole grafiki background.jpg)
            const abyssPoly = this.getOrganicPolygon(0.50);
            gfx.poly(abyssPoly, true).fill({ color: 0x140d09, alpha: 1.0 });

            // Środkowa półka skalna
            const stepPoly = this.getOrganicPolygon(0.36);
            gfx.poly(stepPoly, true).fill({ color: 0x0c0705, alpha: 1.0 });

            // Głębokie czarne dno
            const floorPoly = this.getOrganicPolygon(0.22);
            gfx.poly(floorPoly, true).fill({ color: 0x050302, alpha: 1.0 });

            // Kanciaste odłamki bazaltowe rozsypane na krawędzi krateru
            const rockSeeds = [0.3, 1.5, 2.7, 3.8, 5.0];
            for (const ang of rockSeeds) {
                const rx = this.x + Math.cos(ang) * (r * 0.90);
                const ry = this.y + Math.sin(ang) * (r * 0.90);
                const stoneRadius = r * 0.045;

                // Cień kamienia
                gfx.rect(rx + 2, ry + 2, stoneRadius * 1.6, stoneRadius * 1.2)
                    .fill({ color: 0x000000, alpha: 0.55 });
                // Odłamek skalny
                gfx.rect(rx, ry, stoneRadius * 1.5, stoneRadius * 1.1)
                    .fill({ color: 0x422c21, alpha: 1.0 });
            }
        }
    }
}

export interface ThermalState {
    temperature: number; // 460 - 950 °C
    overheatPercent: number; // 0 - 100%
    isInCrater: boolean;
    activeCraterName?: string;
    isMeltdown: boolean;
}

export class ThermalCraterSystem {
    public container: Container;
    public craters: ThermalCrater[] = [];
    public newlyDiscoveredCrater: ThermalCrater | null = null;

    private craterVisualGraphics: Graphics;
    private emberGraphics: Graphics;
    private labelsContainer: Container;
    private soundSystem: SoundSystem;

    // Thermal simulation state
    public overheat: number = 0; // 0.0 to 1.0
    private warningBeepTimer: number = 0;
    private pulseTimer: number = 0;
    private discoveryCheckTimer: number = 0;

    constructor(soundSystem: SoundSystem) {
        this.soundSystem = soundSystem;
        this.container = new Container();
        this.container.label = 'thermal-craters-system';

        this.craterVisualGraphics = new Graphics();
        this.emberGraphics = new Graphics();
        this.labelsContainer = new Container();
        this.labelsContainer.label = 'thermal-craters-labels';

        this.container.addChild(this.craterVisualGraphics);
        this.container.addChild(this.emberGraphics);
        this.container.addChild(this.labelsContainer);

        this.initializeBackgroundCraters();
    }

    public setCraters(craters: ThermalCrater[]): void {
        this.craters = craters;
        this.renderAllCraters();
        this.renderLabels();
    }

    public renderAllCraters(): void {
        this.craterVisualGraphics.clear();
        this.emberGraphics.clear();

        for (const crater of this.craters) {
            crater.render(this.craterVisualGraphics);
        }
    }

    /**
     * Rysuje czytelne etykiety taktyczne nad ODSŁONIĘTYMI kraterami (styl z zrzutu ekranu gracza).
     * Wyświetla nazwę, moc geotermalną (+80 kW) oraz typ geologiczny (MAGMA vs BAZALT).
     */
    public renderLabels(): void {
        this.labelsContainer.removeChildren();

        for (const crater of this.craters) {
            if (!crater.isDiscovered) continue;

            const isLava = crater.hasLava;
            const style = new TextStyle({
                fontFamily: 'monospace',
                fontSize: 10,
                fontWeight: 'bold',
                fill: isLava ? 0xfbbf24 : 0x38bdf8,
                dropShadow: {
                    alpha: 0.92,
                    angle: Math.PI / 2,
                    blur: 3,
                    color: 0x000000,
                    distance: 1.5,
                },
            });

            const typeTag = isLava ? 'MAGMA' : 'BAZALT';
            const labelText = `${crater.name.toUpperCase()} [+${crater.yieldKW} kW • ${typeTag}]`;
            const txt = new Text({ text: labelText, style });
            txt.anchor.set(0.5, 1);
            txt.x = crater.x;
            txt.y = crater.y - crater.radius - 10;
            this.labelsContainer.addChild(txt);
        }
    }

    /**
     * Odsłania natychmiast wszystkie kratery (pomocne w trybie debugowania F3).
     */
    public discoverAllCraters(): void {
        for (const c of this.craters) {
            c.isDiscovered = true;
            c.cleanPct = 100;
        }
        this.renderLabels();
    }

    /**
     * Kratery z background.jpg:
     * - Calderas (Maat, Cleopatra, Sif, Theia, Ishtar, Diana, Mead) POSIADAJĄ LAWĘ (parzą).
     * - Pits (Danilova, Meitner, Ganis, Golubkina) TO WYGASŁE LEJE BEZ LAWY (nie parzą!).
     */
    public initializeBackgroundCraters(): void {
        const backgroundCraterConfigs: ThermalCraterConfig[] = [
            {
                id: 'CRATER-01',
                name: 'Megakaldera Zachodnia (Maat Mons)',
                x: 475,
                y: 545,
                radius: 210,
                hasLava: true,
                peakTemp: 920,
                heatRate: 0.22,
                type: 'caldera',
                description: 'Główna megakaldera wulkaniczna z rozgałęzionym jeziorem płynnej lawy.',
            },
            {
                id: 'CRATER-02',
                name: 'Kocioł Północno-Zachodni (Cleopatra)',
                x: 1062,
                y: 340,
                radius: 65,
                hasLava: true,
                peakTemp: 840,
                heatRate: 0.17,
                type: 'caldera',
                description: 'Średniej wielkości krater lawowy o wysokiej emisji cieplnej.',
            },
            {
                id: 'CRATER-03',
                name: 'Kocioł Północny (Sif Mons)',
                x: 1484,
                y: 72,
                radius: 70,
                hasLava: true,
                peakTemp: 830,
                heatRate: 0.16,
                type: 'caldera',
                description: 'Północny krater geotermalny z aktywnym żarem magmowym.',
            },
            {
                id: 'CRATER-04',
                name: 'Krater Skrajny Zachodni (Danilova)',
                x: 20,
                y: 812,
                radius: 80,
                hasLava: false, // BEZ LAWY - ZIMNY
                type: 'pit',
                description: 'Wygasły krater impaktowy na krawędzi uskoku bazaltowego. Bezpieczny.',
            },
            {
                id: 'CRATER-05',
                name: 'Kocioł Środkowo-Zachodni (Theia)',
                x: 1082,
                y: 828,
                radius: 85,
                hasLava: true,
                peakTemp: 850,
                heatRate: 0.18,
                type: 'caldera',
                description: 'Aktywny punkt magmowy w centrum formacji wulkanicznej.',
            },
            {
                id: 'CRATER-06',
                name: 'Krater Magmowy Zachodni (Ishtar)',
                x: 185,
                y: 1107,
                radius: 115,
                hasLava: true,
                peakTemp: 880,
                heatRate: 0.19,
                type: 'caldera',
                description: 'Głęboki krater z widocznym jeziorem płynnej, wrzącej lawy.',
            },
            {
                id: 'CRATER-07',
                name: 'Krater Południowo-Zachodni (Meitner)',
                x: 844,
                y: 1518,
                radius: 95,
                hasLava: false, // BEZ LAWY - ZIMNY
                type: 'pit',
                description: 'Wygasła niecka bazaltowa w południowej strefie. Brak emisji ciepła.',
            },
            {
                id: 'CRATER-08',
                name: 'Megakaldera Centralna (Diana Chasma)',
                x: 1680,
                y: 1810,
                radius: 185,
                hasLava: true,
                peakTemp: 940,
                heatRate: 0.22,
                type: 'caldera',
                description: 'Wielka kaldera centralna otoczona pajęczyną pęknięć skorupy i magmą.',
            },
            {
                id: 'CRATER-09',
                name: 'Kocioł Południowy (Ganis Chasma)',
                x: 2128,
                y: 2210,
                radius: 75,
                hasLava: false, // BEZ LAWY - ZIMNY
                type: 'pit',
                description: 'Południowy wygasły krater skalny przy granicy mapy. Brak zagrożenia.',
            },
            {
                id: 'CRATER-10',
                name: 'Megakaldera Południowa (Mead Megacaldera)',
                x: 344,
                y: 2139,
                radius: 230,
                hasLava: true,
                peakTemp: 960,
                heatRate: 0.24,
                type: 'caldera',
                description: 'Potężna megakaldera wulkaniczna z ogromnym jeziorem magmy.',
            },
            {
                id: 'CRATER-11',
                name: 'Krater Wschodni (Golubkina)',
                x: 4060,
                y: 1680,
                radius: 70,
                hasLava: false, // BEZ LAWY - ZIMNY
                type: 'pit',
                description: 'Odosobniony, wygasły krater uderzeniowy na wschodnim płaskowyżu.',
            },
        ];

        this.craters = backgroundCraterConfigs.map(cfg => new ThermalCrater(cfg));
        this.renderAllCraters();
    }

    public getCrater(id: string): ThermalCrater | undefined {
        return this.craters.find(c => c.id === id);
    }

    /**
     * Sprawdza, czy w danym punkcie świata znajduje się odsłonięty krater gotowy pod montaż elektrowni geotermalnej (+80 kW).
     * Używane do walidacji stawiania elektrowni geotermalnych w GridSystem oraz zasilania w SimulationLoop.
     * Obejmuje zarówno gorące kaldery z lawą, jak i głębokie leje bazaltowe (obie czerpią energię geotermalną).
     */
    public hasActiveHotCrater(worldX: number, worldY: number, tolerance: number = 64): boolean {
        if (this.craters.length === 0) return false;
        return this.craters.some(c => c.isVolcanicActive && c.isDiscovered && Math.hypot(worldX - c.x, worldY - c.y) <= (c.radius + tolerance));
    }

    /**
     * Zwraca krater na danych współrzędnych świata (z tolerancją na krawędź wału).
     */
    public getCraterAt(worldX: number, worldY: number, tolerance: number = 64): ThermalCrater | null {
        if (this.craters.length === 0) return null;
        for (const c of this.craters) {
            if (Math.hypot(worldX - c.x, worldY - c.y) <= (c.radius + tolerance)) {
                return c;
            }
        }
        return null;
    }

    /**
     * Sprawdza, czy w danym punkcie świata znajduje się jakikolwiek krater wulkaniczny (niezależnie od stanu odsłonięcia).
     */
    public hasCrater(worldX: number, worldY: number, tolerance: number = 64): boolean {
        return this.getCraterAt(worldX, worldY, tolerance) !== null;
    }

    public update(
        dt: number,
        playerPos: { x: number; y: number },
        isProtected: boolean = false,
        dirtSystem?: DirtSystem,
        hasInsulationPerk: boolean = false
    ): ThermalState {
        this.pulseTimer += dt * 3.0;

        // Throttled sprawdzanie odsłonięcia kraterów z pyłu (co ~120 ms)
        if (dirtSystem) {
            this.discoveryCheckTimer += dt;
            if (this.discoveryCheckTimer >= 0.12) {
                this.discoveryCheckTimer = 0;
                for (const crater of this.craters) {
                    if (crater.isDiscovered) continue;
                    const cleanPct = dirtSystem.getCleanPercentageInCircle(crater.x, crater.y, crater.discoveryRadius);
                    crater.cleanPct = cleanPct;

                    // Próg odsłonięcia kaldery/niecki: 65% zebrania pyłu z jej centrum
                    if (cleanPct >= 65) {
                        crater.isDiscovered = true;
                        this.newlyDiscoveredCrater = crater;
                        this.renderLabels();
                    }
                }
            }
        }

        let insideCrater: ThermalCrater | null = null;
        let highestIntensity = 0;
        let effectiveHeatRate = 0;
        let activePeakTemp = 460;
        let activeHazardName: string | undefined = undefined;

        // Sprawdź czy gracz znajduje się w strefie KRATERU Z LAWĄ
        if (!isProtected) {
            for (const crater of this.craters) {
                // Tylko kratery z lawą (hasLava = true) emitują ciepło!
                if (!crater.hasLava) continue;

                const intensity = crater.getThermalIntensity(playerPos.x, playerPos.y);
                if (intensity > highestIntensity) {
                    highestIntensity = intensity;
                    insideCrater = crater;
                    const heatMult = hasInsulationPerk ? 0.60 : 1.0;
                    effectiveHeatRate = crater.heatRate * intensity * heatMult;
                    activePeakTemp = crater.peakTemp;
                    activeHazardName = crater.name;
                }
            }
        }

        // Żarzenie/iskry unoszące się WYŁĄCZNIE nad kraterami z lawą
        this.emberGraphics.clear();
        const pulseAlpha = 0.18 + Math.sin(this.pulseTimer) * 0.09;
        for (const crater of this.craters) {
            if (!crater.isVolcanicActive || !crater.hasLava) continue;
            this.emberGraphics.circle(crater.x, crater.y, crater.radius * 0.38)
                .fill({ color: 0xf97316, alpha: pulseAlpha });
        }

        const isInHazard = !!insideCrater;
        if (isInHazard && effectiveHeatRate > 0) {
            this.overheat = Math.min(1.0, this.overheat + effectiveHeatRate * dt);

            const beepInterval = Math.max(0.12, 0.65 - this.overheat * 0.5);
            this.warningBeepTimer += dt;
            if (this.warningBeepTimer >= beepInterval) {
                this.warningBeepTimer = 0;
                this.soundSystem.playThermalWarning();
            }
        } else {
            // Chłodzenie aktywne poza strefami gorącymi (również wewnątrz zimnych kraterów bazaltowych!)
            const coolingRate = 0.25;
            this.overheat = Math.max(0.0, this.overheat - coolingRate * dt);
            this.warningBeepTimer = 0;
        }

        const currentTemp = Math.round(460 + this.overheat * (activePeakTemp - 460));
        const overheatPercent = Math.round(this.overheat * 100);

        let isMeltdown = false;
        if (this.overheat >= 1.0) {
            isMeltdown = true;
            this.overheat = 0.0;
            this.soundSystem.playOverheatDeath();
        }

        return {
            temperature: currentTemp,
            overheatPercent,
            isInCrater: isInHazard,
            activeCraterName: activeHazardName,
            isMeltdown,
        };
    }

    public destroy(): void {
        this.craterVisualGraphics.destroy();
        this.emberGraphics.destroy();
        this.labelsContainer.destroy({ children: true });
        this.container.destroy({ children: true });
    }
}
