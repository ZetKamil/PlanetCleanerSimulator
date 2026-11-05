export type BuildingType =
    | 'conveyor'
    | 'conveyor_mk2'
    | 'splitter'
    | 'smart_splitter'
    | 'merger'
    | 'underground_belt'
    | 'power_pylon'
    | 'vacuum_turret'
    | 'packager'
    | 'smelter'
    | 'silo'
    | 'awesome_sink'
    | 'dock'
    | 'solar'
    | 'geothermal'
    | 'shield_pylon'
    | 'pipe'
    | 'acid_pump'
    | 'acid_refinery';

export interface BuildingConfig {
    type: BuildingType;
    name: string;
    cost: number;
    widthTiles: number;
    heightTiles: number;
    powerUsage: number; // kW (negative = generates)
    description?: string;
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
    conveyor: {
        type: 'conveyor',
        name: 'Taśmociąg Mk1',
        cost: 2,
        widthTiles: 1,
        heightTiles: 1,
        powerUsage: 0,
        description: 'Standardowy taśmociąg transportowy (2 kafelki/s).',
    },
    conveyor_mk2: {
        type: 'conveyor_mk2',
        name: 'Szybki Taśmociąg Mk2',
        cost: 8,
        widthTiles: 1,
        heightTiles: 1,
        powerUsage: 0,
        description: 'Wzmocniony taśmociąg o podwójnej prędkości (4 kafelki/s).',
    },
    splitter: {
        type: 'splitter',
        name: 'Rozdzielacz 50/50',
        cost: 18,
        widthTiles: 2,
        heightTiles: 1,
        powerUsage: 0,
        description: 'Rozdziela napływające przedmioty naprzemiennie na dwie linie.',
    },
    smart_splitter: {
        type: 'smart_splitter',
        name: 'Inteligentny Rozdzielacz',
        cost: 45,
        widthTiles: 2,
        heightTiles: 1,
        powerUsage: 0,
        description: 'Filtruje urobek: kieruje brykiety w lewo, płyty w prawo, a nadmiar (overflow) prosto.',
    },
    merger: {
        type: 'merger',
        name: 'Łącznik Taśm 2->1',
        cost: 20,
        widthTiles: 2,
        heightTiles: 1,
        powerUsage: 0,
        description: 'Łączy dwa napływające strumienie urobku w jedną główną linię transportową.',
    },
    underground_belt: {
        type: 'underground_belt',
        name: 'Tunel Podziemny Taśmy',
        cost: 15,
        widthTiles: 1,
        heightTiles: 1,
        powerUsage: 0,
        description: 'Transportuje przedmioty pod ziemią na odległość do 6 kafelków, omijając skały i skrzyżowania.',
    },
    power_pylon: {
        type: 'power_pylon',
        name: 'Słup Linii Przesyłowej',
        cost: 15,
        widthTiles: 1,
        heightTiles: 1,
        powerUsage: 0,
        description: 'Rozprowadza energię napowietrznymi liniami przesyłowymi do odległych megakalder (zasięg 10 kafelków).',
    },
    vacuum_turret: {
        type: 'vacuum_turret',
        name: 'Wieżyczka Zasysająca Mk I',
        cost: 220,
        widthTiles: 2,
        heightTiles: 2,
        powerUsage: 20,
        description: 'Stacjonarna głowica ssąca odkurzająca promień 220 px z wbudowanym pakowaczem urobku.',
    },
    packager: {
        type: 'packager',
        name: 'Prasa Urobku',
        cost: 75,
        widthTiles: 2,
        heightTiles: 2,
        powerUsage: 15,
        description: 'Prasuje zebrany pył w Brykiety Bazaltowe ($22/szt.).',
    },
    smelter: {
        type: 'smelter',
        name: 'Piec Hutniczy',
        cost: 180,
        widthTiles: 2,
        heightTiles: 2,
        powerUsage: 12,
        description: 'Wytapia Brykiety w Płyty Kompozytowe Wenus ($75/szt.).',
    },
    silo: {
        type: 'silo',
        name: 'Magazyn Zasobnikowy',
        cost: 60,
        widthTiles: 2,
        heightTiles: 2,
        powerUsage: 0,
        description: 'Buforuje do 150 sztuk urobku, zapobiegając zatorom na taśmach.',
    },
    awesome_sink: {
        type: 'awesome_sink',
        name: 'Mielarka Urobku SINK',
        cost: 110,
        widthTiles: 2,
        heightTiles: 2,
        powerUsage: 10,
        description: 'Mieli nadmiar surowców i zapobiega zatorom na taśmach, skupując każdy urobek ze 100% wartością.',
    },
    dock: {
        type: 'dock',
        name: 'Stacja Dokująca',
        cost: 70,
        widthTiles: 1,
        heightTiles: 1,
        powerUsage: 5,
        description: 'Stacja ładująca dla robotów zamiatających Sweep-Bot.',
    },
    solar: {
        type: 'solar',
        name: 'Generator Słoneczny',
        cost: 45,
        widthTiles: 2,
        heightTiles: 2,
        powerUsage: -50, // Generuje 50 kW
        description: 'Wytwarza 50 kW energii z promieniowania słonecznego.',
    },
    geothermal: {
        type: 'geothermal',
        name: 'Generator Geotermalny',
        cost: 280,
        widthTiles: 2,
        heightTiles: 2,
        powerUsage: -80, // Generuje 80 kW
        description: 'Wykorzystuje ciepło kraterów wulkanicznych, wytwarzając aż 80 kW energii.',
    },
    shield_pylon: {
        type: 'shield_pylon',
        name: 'Pylon Tarczy Elektrostatycznej',
        cost: 350,
        widthTiles: 2,
        heightTiles: 2,
        powerUsage: 25,
        description: 'Generuje kopułę siłową chroniącą fabrykę przed deszczem kwasu.',
    },
    pipe: {
        type: 'pipe',
        name: 'Rurociąg Kwasowy',
        cost: 5,
        widthTiles: 1,
        heightTiles: 1,
        powerUsage: 0,
        description: 'Hermetyczny rurociąg tytanowy transportujący stężony kwas siarkowy.',
    },
    acid_pump: {
        type: 'acid_pump',
        name: 'Ekstraktor Gejzerowy',
        cost: 140,
        widthTiles: 2,
        heightTiles: 2,
        powerUsage: 10,
        description: 'Wydobywa ciekły kwas siarkowy z gejzerów i wtłacza go do sieci rurociągów.',
    },
    acid_refinery: {
        type: 'acid_refinery',
        name: 'Rafineria Chemiczna',
        cost: 320,
        widthTiles: 2,
        heightTiles: 2,
        powerUsage: 20,
        description: 'Przetwarza kwas siarkowy w wysokoenergetyczne Ogniwa Kwasowe ($180/szt.).',
    },
};

