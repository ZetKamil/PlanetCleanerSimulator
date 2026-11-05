import type { IPlanetConfig } from './PlanetConfig';

/**
 * Chapter 1: Venus Configuration
 * Matches the warm inked industrial Factorio/RimWorld aesthetic from background.jpg and venus-style-concept.jpg.
 */
export const VENUS_PLANET_CONFIG: IPlanetConfig = {
    id: 'venus',
    name: 'Wenus',
    chapterNumber: 1,
    chapterTitle: 'Rozdział 1: Piekielne Pustynie Wenus',
    baseTemperatureC: 460,
    colors: {
        cleanGroundHex: 0xb45309,    // Ciepły miedziany piasek bazaltowy
        gridLineHex: 0x9a3412,       // Terakota podziałki siatki
        dustPrimaryHex: 0x27272a,    // Ciemny pył wulkaniczny (dark steel)
        dustSecondaryHex: 0x7c2d12,  // Spieczony pył bazaltowy
        cliffShadowHex: 0x0a0a10,    // Głęboki tusz wulkaniczny
    },
    weatherHazard: {
        type: 'acid_rain',
        name: 'Opad Kwasu Siarkowego',
        intervalSeconds: 240,
        durationSeconds: 45,
        slowMultiplier: 0.75, // Spowolnienie kół o 25%
    },
    economy: {
        rawDustPricePerKg: 0.10,
        currencySymbol: '$',
        tier1ItemName: 'Worek Pyłu Bazaltowego',
        tier2ItemName: 'Brykiet Węglowo-Bazaltowy',
        tier3ItemName: 'Utwardzona Płyta Kompozytowa',
    },
    relics: [
        {
            id: 'RELIC-VENERA-7',
            name: 'Lądownik Venera 7',
            year: 1970,
            rewardCredits: 25,
            description: 'Pierwsza w historii ziemska sonda, która pomyślnie wylądowała na Wenus.',
            perkDescription: '+10% do prędkości analizy relikwii',
        },
        {
            id: 'RELIC-VENERA-9',
            name: 'Lądownik Venera 9',
            year: 1975,
            rewardCredits: 25,
            description: 'Przesłała pierwsze w historii panoramiczne zdjęcia powierzchni Wenus.',
            perkDescription: '+15% zasięgu radaru minimapy',
        },
        {
            id: 'RELIC-VENERA-13',
            name: 'Sonda Venera 13',
            year: 1982,
            rewardCredits: 25,
            description: 'Pobrała próbki bazaltu i zarejestrowała pierwszy kolorowy dźwięk wiatru wenusjańskiego.',
            perkDescription: '+10% ceny skupu surowego pyłu',
        },
        {
            id: 'RELIC-VENERA-14',
            name: 'Lądownik Sejsmiczny Venera 14',
            year: 1982,
            rewardCredits: 25,
            description: 'Wykonała odwierty w skorupie i badała fale sejsmiczne tektoniki Wenus.',
            perkDescription: 'Ostrzeżenia przed wybuchem gejzerów z 10s wyprzedzeniem',
        },
        {
            id: 'RELIC-VEGA-1',
            name: 'Gondola Balonowa Vega 1',
            year: 1985,
            rewardCredits: 25,
            description: 'Przelotowa stacja aerozolowa badająca kwasowe chmury siarkowe.',
            perkDescription: '+20% odporności na kwasowy deszcz',
        },
        {
            id: 'RELIC-APHRODITE-CORE',
            name: 'Kapsuła Danych Stacji Afrodyta',
            year: 2024,
            rewardCredits: 25,
            description: 'Nowoczesny zasobnik badawczy korporacji z tajnymi schematami turbin.',
            perkDescription: '+15% efektywności silników ssących',
        },
    ],
};

