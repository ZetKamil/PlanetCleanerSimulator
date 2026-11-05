/**
 * Planet Cleaner Simulator - Planet Configuration Schema
 * Prepares the simulation for multi-planet expansions (Venus, Mars, Europa, Orbital Junkyard).
 * Pure data model without engine/renderer dependencies.
 */

export type PlanetId = 'venus' | 'mars' | 'europa' | 'orbital_junkyard';

export type WeatherHazardType = 'acid_rain' | 'sandstorm' | 'blizzard' | 'solar_flare';

export interface PlanetRelicConfig {
    id: string;
    name: string;
    year: number | string;
    rewardCredits: number;
    description: string;
    perkDescription?: string;
}

export interface IPlanetConfig {
    id: PlanetId;
    name: string;
    chapterNumber: number;
    chapterTitle: string;
    baseTemperatureC: number;
    colors: {
        cleanGroundHex: number;
        gridLineHex: number;
        dustPrimaryHex: number;
        dustSecondaryHex: number;
        cliffShadowHex: number;
    };
    weatherHazard: {
        type: WeatherHazardType;
        name: string;
        intervalSeconds: number;
        durationSeconds: number;
        slowMultiplier: number;
    };
    economy: {
        rawDustPricePerKg: number;
        currencySymbol: string;
        tier1ItemName: string;
        tier2ItemName: string;
        tier3ItemName: string;
    };
    relics: PlanetRelicConfig[];
}

