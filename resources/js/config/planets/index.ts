import type { IPlanetConfig, PlanetId } from './PlanetConfig';
import { VENUS_PLANET_CONFIG } from './VenusPlanetConfig';

export * from './PlanetConfig';
export * from './VenusPlanetConfig';

const PLANET_REGISTRY: Record<PlanetId, IPlanetConfig> = {
    venus: VENUS_PLANET_CONFIG,
    mars: {
        ...VENUS_PLANET_CONFIG,
        id: 'mars',
        name: 'Mars',
        chapterNumber: 2,
        chapterTitle: 'Rozdział 2: Rdzawe Kaniony Marsa',
        baseTemperatureC: -60,
        weatherHazard: {
            type: 'sandstorm',
            name: 'Burza Piaskowa z Pyłem Żelaznym',
            intervalSeconds: 300,
            durationSeconds: 60,
            slowMultiplier: 0.6,
        },
    },
    europa: {
        ...VENUS_PLANET_CONFIG,
        id: 'europa',
        name: 'Europa',
        chapterNumber: 3,
        chapterTitle: 'Rozdział 3: Lodowe Szczeliny Europy',
        baseTemperatureC: -160,
        weatherHazard: {
            type: 'blizzard',
            name: 'Zamieć Kriowulkaniczna',
            intervalSeconds: 220,
            durationSeconds: 40,
            slowMultiplier: 0.5,
        },
    },
    orbital_junkyard: {
        ...VENUS_PLANET_CONFIG,
        id: 'orbital_junkyard',
        name: 'Orbitalne Złomowisko',
        chapterNumber: 4,
        chapterTitle: 'Rozdział 4: Cmentarzysko Satelitów',
        baseTemperatureC: -270,
        weatherHazard: {
            type: 'solar_flare',
            name: 'Rozbłysk Słoneczny EMP',
            intervalSeconds: 360,
            durationSeconds: 30,
            slowMultiplier: 0.7,
        },
    },
};

let activePlanetId: PlanetId = 'venus';

export function getActivePlanet(): IPlanetConfig {
    return PLANET_REGISTRY[activePlanetId] ?? VENUS_PLANET_CONFIG;
}

export function setActivePlanet(id: PlanetId): void {
    if (PLANET_REGISTRY[id]) {
        activePlanetId = id;
    }
}

