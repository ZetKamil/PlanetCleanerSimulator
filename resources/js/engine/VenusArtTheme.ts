import { Graphics } from 'pixi.js';

/**
 * Venus Warm Inked Industrial Theme
 * Wzorowany na stylu artystycznym z venus-style-concept.jpg
 * Ciepły, rysowany industrial (Cozy Factorio / Don't Starve meets RimWorld).
 */
export const VENUS_THEME = {
    // Tusz / Komiksowy obrys
    ink: 0x0a0a10,
    inkOutlineWidth: 3.0,
    inkOutlineHeavy: 3.5,

    // Ciepła paleta przemysłowa
    terracottaLight: 0xc2410c,
    terracottaBase: 0x9a3412,
    terracottaDark: 0x7c2d12,

    copperLight: 0xb45309,
    copperBase: 0x92400e,
    copperDark: 0x78350f,

    industrialCream: 0xfef3c7,
    industrialBeige: 0xfde68a,
    industrialAmber: 0xf59e0b,

    warmRust: 0xea580c,
    brightOrange: 0xf97316,

    // Hazard Stripes (Pasy ostrzegawcze)
    hazardYellow: 0xfacc15,
    hazardDark: 0x18181b,

    // Metale i płyty
    darkSteel: 0x18181b,
    midSteel: 0x27272a,
    lightSteel: 0x52525b,
    rivetColor: 0x71717a,

    // Szkło inspekcyjne & Emisja
    glassCyan: 0x38bdf8,
    glassDeep: 0x0284c7,
    glassReflection: 0xffffff,
    glowAmber: 0xfbbf24,
    glowGreen: 0x22c55e,
    glowRed: 0xef4444,

    // Taśmy transportowe
    beltBed: 0x27272a,
    beltRubber: 0x1c1917,
    beltRib: 0x3f3f46,
    beltArrow: 0xfacc15,
    beltArrowMk2: 0x38bdf8,
    beltBorder: 0x0a0a10,
};

/**
 * Rysuje panel z zaokrąglonymi rogami i grubym, komiksowym tuszowym obrysem.
 */
export function drawInkedPanel(
    gfx: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number = 6,
    fillColor: number = VENUS_THEME.terracottaBase,
    strokeColor: number = VENUS_THEME.ink,
    strokeWidth: number = VENUS_THEME.inkOutlineWidth
): void {
    gfx.roundRect(x, y, w, h, radius)
        .fill({ color: fillColor })
        .stroke({ width: strokeWidth, color: strokeColor, join: 'round', cap: 'round' });
}

/**
 * Rysuje metalowe nity w rogach płyty pancerza.
 */
export function drawRivets(
    gfx: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    inset: number = 5,
    rivetRadius: number = 1.5,
    color: number = VENUS_THEME.rivetColor
): void {
    const corners = [
        { cx: x + inset, cy: y + inset },
        { cx: x + w - inset, cy: y + inset },
        { cx: x + inset, cy: y + h - inset },
        { cx: x + w - inset, cy: y + h - inset },
    ];
    for (const c of corners) {
        // Cień pod nitem
        gfx.circle(c.cx, c.cy + 0.5, rivetRadius).fill({ color: 0x000000, alpha: 0.5 });
        // Główka nita
        gfx.circle(c.cx, c.cy, rivetRadius).fill({ color });
        // Odbłysk światła
        gfx.circle(c.cx - 0.5, c.cy - 0.5, 0.6).fill({ color: 0xffffff, alpha: 0.8 });
    }
}

/**
 * Rysuje pasy ostrzegawcze (hazard stripes) w stylu industrialnym.
 */
export function drawHazardStripes(
    gfx: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    stripeWidth: number = 6
): void {
    // Tło żółte
    gfx.rect(x, y, w, h).fill({ color: VENUS_THEME.hazardYellow });

    // Skośne czarne pasy wyznaczone poligonami w granicach prostokąta
    const step = stripeWidth * 2;
    for (let ox = -h; ox < w + h; ox += step) {
        const poly = [
            { x: Math.max(x, Math.min(x + w, x + ox)), y: y },
            { x: Math.max(x, Math.min(x + w, x + ox + stripeWidth)), y: y },
            { x: Math.max(x, Math.min(x + w, x + ox + stripeWidth - h)), y: y + h },
            { x: Math.max(x, Math.min(x + w, x + ox - h)), y: y + h },
        ];
        gfx.poly(poly).fill({ color: VENUS_THEME.hazardDark });
    }

    // Tuszowy obrys wokół pasów
    gfx.rect(x, y, w, h).stroke({ width: 1.5, color: VENUS_THEME.ink });
}

/**
 * Rysuje przeszklone okno inspekcyjne z błękitnym szkłem i ukośnymi refleksami świetlnymi.
 */
export function drawGlassWindow(
    gfx: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number = 4
): void {
    // Tło komory wewnętrznej
    gfx.roundRect(x, y, w, h, radius)
        .fill({ color: 0x090d16 })
        .stroke({ width: 2, color: VENUS_THEME.ink });

    // Błękitna tafla szkła
    gfx.roundRect(x + 1, y + 1, w - 2, h - 2, Math.max(1, radius - 1))
        .fill({ color: VENUS_THEME.glassCyan, alpha: 0.35 });

    // Ukośny biały refleks świetlny 1
    const rw1 = Math.min(6, w * 0.25);
    gfx.poly([
        { x: x + 3, y: y + 2 },
        { x: x + 3 + rw1, y: y + 2 },
        { x: x + 2, y: y + 2 + rw1 },
        { x: x + 2, y: y + 2 },
    ]).fill({ color: VENUS_THEME.glassReflection, alpha: 0.5 });

    // Ukośny biały pasek refleksu 2
    gfx.poly([
        { x: x + w * 0.45, y: y + 2 },
        { x: x + w * 0.60, y: y + 2 },
        { x: x + 2, y: y + h * 0.70 },
        { x: x + 2, y: y + h * 0.50 },
    ]).fill({ color: VENUS_THEME.glassReflection, alpha: 0.25 });
}

/**
 * Rysuje retro-industrialną zębatkę (cog/gear) z zębami.
 */
export function drawCog(
    gfx: Graphics,
    cx: number,
    cy: number,
    radius: number = 8,
    teeth: number = 6,
    angleOffset: number = 0,
    color: number = VENUS_THEME.copperLight,
    strokeColor: number = VENUS_THEME.ink
): void {
    const points: { x: number; y: number }[] = [];
    const step = (Math.PI * 2) / teeth;
    const toothH = radius * 0.35;
    const rOuter = radius + toothH;
    const rInner = radius;

    for (let i = 0; i < teeth; i++) {
        const a0 = i * step + angleOffset;
        const a1 = a0 + step * 0.25;
        const a2 = a0 + step * 0.50;
        const a3 = a0 + step * 0.75;

        // Baza zęba
        points.push({ x: cx + Math.cos(a0) * rInner, y: cy + Math.sin(a0) * rInner });
        // Wierzchołek zęba
        points.push({ x: cx + Math.cos(a1) * rOuter, y: cy + Math.sin(a1) * rOuter });
        points.push({ x: cx + Math.cos(a2) * rOuter, y: cy + Math.sin(a2) * rOuter });
        // Powrót do bazy
        points.push({ x: cx + Math.cos(a3) * rInner, y: cy + Math.sin(a3) * rInner });
    }

    // Korpus zębatki
    gfx.poly(points)
        .fill({ color })
        .stroke({ width: 1.5, color: strokeColor });

    // Centralny otwór zębatki (oś)
    gfx.circle(cx, cy, radius * 0.35)
        .fill({ color: VENUS_THEME.ink })
        .stroke({ width: 1, color: VENUS_THEME.copperDark });
}

