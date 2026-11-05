<template>
  <div class="pointer-events-auto fixed bottom-4 right-4 z-30 select-none flex flex-col items-end gap-2">
    <!-- Active Building Placement Top Helper (Only in Build Mode when building selected) -->
    <div
      v-if="gameStore.hudMode === 'build' && gameStore.selectedBuilding"
      class="venus-panel border-amber-500/60 px-3 py-1.5 flex items-center gap-2.5 text-xs font-mono text-amber-300 animate-in fade-in slide-in-from-bottom-2"
    >
      <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
      <span class="truncate max-w-[130px]"><strong>{{ activeBuildingName }}</strong></span>
      <button
        @click="gameStore.rotatePlacement()"
        class="bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1 cursor-pointer transition-colors font-tech"
      >
        <span>[{{ gameStore.selectedDirection }}]</span>
        <kbd class="text-[9px] bg-slate-900 px-1 py-0.2 rounded text-slate-400">R</kbd>
      </button>
      <button
        @click="gameStore.setSelectedBuilding(null)"
        class="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-500/30 text-[10px] cursor-pointer font-tech"
      >
        Anuluj (ESC)
      </button>
    </div>

    <!-- Main Action Matrix Box (Styled after venus-style-concept.jpg) -->
    <div class="w-80 md:w-84 venus-panel p-2.5 flex flex-col gap-2 ring-1 ring-white/5">
      <!-- Mode Tabs Switcher Header [1] [2] -->
      <div class="grid grid-cols-2 gap-1 p-0.5 bg-slate-950/80 rounded-lg border border-slate-800">
        <button
          @click="gameStore.setHudMode('clean')"
          class="flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold transition-all cursor-pointer font-tech"
          :class="gameStore.hudMode === 'clean'
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'"
        >
          <span class="text-[10px] font-mono text-slate-500 font-normal">[1]</span>
          <span>🧹 Sprzątaj</span>
        </button>

        <button
          @click="gameStore.setHudMode('build')"
          class="flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold transition-all cursor-pointer font-tech"
          :class="gameStore.hudMode === 'build'
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'"
        >
          <span class="text-[10px] font-mono text-slate-500 font-normal">[2]</span>
          <span>🔨 Buduj</span>
        </button>
      </div>

      <!-- ============================================== -->
      <!-- TRYB 1: SPRZĄTANIE / NARZĘDZIA (Clean Mode)     -->
      <!-- ============================================== -->
      <div v-if="gameStore.hudMode === 'clean'" class="flex flex-col gap-2">
        <!-- Rover Tool & Backpack Status -->
        <div class="bg-slate-800/50 border border-slate-700/60 rounded-lg p-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">🧹</span>
            <div>
              <p class="text-xs font-bold text-amber-300 font-tech leading-tight">{{ playerStore.currentTool.name }}</p>
              <p class="text-[10px] text-slate-400 font-mono">Promień: {{ playerStore.currentTool.radius * 2 }} px</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs font-mono font-bold font-data" :class="playerStore.isBackpackFull ? 'text-rose-400 animate-pulse' : 'text-slate-300'">
              {{ playerStore.currentDust.toFixed(1) }} / {{ playerStore.currentBackpack.capacity }} kg
            </span>
            <div class="venus-progress-bar w-20 h-2 mt-1">
              <div
                class="venus-progress-bar-fill"
                :class="playerStore.isBackpackFull ? 'bg-rose-500' : 'bg-amber-400'"
                :style="{ width: `${Math.min(100, (playerStore.currentDust / playerStore.currentBackpack.capacity) * 100)}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Fleet Status Link Button (Etap 2) -->
        <button
          @click="gameStore.openCommandHub('fleet')"
          class="bg-slate-800/70 hover:bg-slate-700/70 active:scale-95 border border-slate-700/70 rounded-lg px-2.5 py-1.5 flex items-center justify-between cursor-pointer transition-colors group"
          title="Zarządzaj flotą robotów i punktami zrzutu w Hubie Dowodzenia [4 / C]"
        >
          <div class="flex items-center gap-2">
            <span class="text-base group-hover:scale-110 transition-transform">🤖</span>
            <div class="text-left leading-tight">
              <p class="text-[11px] font-bold text-slate-200 group-hover:text-emerald-300 transition-colors font-sans">
                Flota: <strong class="text-emerald-400">{{ gameStore.minimapBots.length }} aktywnych botów</strong>
              </p>
              <p class="text-[9px] text-slate-400 font-mono">
                Polityka: {{ gameStore.botDropoffPolicy === 'silos_first' ? 'Silosy (Priorytet)' : (gameStore.botDropoffPolicy === 'nearest_any' ? 'Najbliższy' : 'Tylko Baza') }}
              </p>
            </div>
          </div>
          <span class="text-[9px] font-mono text-amber-300 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 group-hover:border-amber-400">
            Flota [C] ➔
          </span>
        </button>

        <!-- 6 Action Tiles (Matching venus-style-concept.jpg) -->
        <div class="grid grid-cols-3 gap-1.5">
          <!-- Dron-Muł [G] -->
          <button
            @click="triggerKey('KeyG')"
            class="h-14 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700 rounded-xl flex flex-col items-center justify-center p-1 cursor-pointer transition-all group relative"
            :class="gameStore.muleStatus !== 'IDLE' ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-950/60' : ''"
          >
            <span class="absolute top-1 left-1.5 text-[8px] font-mono text-slate-400 font-bold">G</span>
            <span class="text-base">🛸</span>
            <span class="text-[9px] font-bold mt-0.5" :class="gameStore.muleStatus !== 'IDLE' ? 'text-amber-400' : 'text-slate-200'">
              {{ muleLabel }}
            </span>
          </button>

          <!-- Kapsuła Zrzutowa [B] -->
          <button
            @click="triggerKey('KeyB')"
            class="h-14 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700 rounded-xl flex flex-col items-center justify-center p-1 cursor-pointer transition-all group relative"
          >
            <span class="absolute top-1 left-1.5 text-[8px] font-mono text-slate-400 font-bold">B</span>
            <span class="text-base">🚀</span>
            <span class="text-[9px] font-bold text-cyan-300 mt-0.5">Zrzut ($50)</span>
          </button>

          <!-- Sklep Sprzętu [V] -->
          <button
            @click="openShop"
            class="h-14 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700 rounded-xl flex flex-col items-center justify-center p-1 cursor-pointer transition-all group relative"
          >
            <span class="absolute top-1 left-1.5 text-[8px] font-mono text-slate-400 font-bold">V</span>
            <span class="text-base">🛒</span>
            <span class="text-[9px] font-bold text-emerald-300 mt-0.5">Sklep</span>
          </button>

          <!-- Alt-Mode [ALT] -->
          <button
            @click="gameStore.toggleAltMode()"
            class="h-14 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700 rounded-xl flex flex-col items-center justify-center p-1 cursor-pointer transition-all group relative"
            :class="gameStore.isAltMode ? 'ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/60' : ''"
          >
            <span class="absolute top-1 left-1.5 text-[8px] font-mono text-slate-400 font-bold">ALT</span>
            <span class="text-base">🔍</span>
            <span class="text-[9px] font-bold mt-0.5" :class="gameStore.isAltMode ? 'text-cyan-300' : 'text-slate-300'">
              {{ gameStore.isAltMode ? 'Alt: ON' : 'Alt-Mode' }}
            </span>
          </button>

          <!-- Klakson Łazika [H] -->
          <button
            @click="playHorn"
            class="h-14 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700 rounded-xl flex flex-col items-center justify-center p-1 cursor-pointer transition-all group relative"
          >
            <span class="absolute top-1 left-1.5 text-[8px] font-mono text-slate-400 font-bold">H</span>
            <span class="text-base">🎺</span>
            <span class="text-[9px] font-bold text-amber-300 mt-0.5">Klakson</span>
          </button>

          <!-- Baza Hub [C] -->
          <button
            @click="gameStore.openCommandHub('stats')"
            class="h-14 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700 rounded-xl flex flex-col items-center justify-center p-1 cursor-pointer transition-all group relative"
          >
            <span class="absolute top-1 left-1.5 text-[8px] font-mono text-slate-400 font-bold">C</span>
            <span class="text-base">🏛️</span>
            <span class="text-[9px] font-bold text-slate-300 mt-0.5">Hub Bazy</span>
          </button>
        </div>

        <!-- Safeguard indicator footer -->
        <div class="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center justify-between text-[10px] text-emerald-300 font-sans">
          <span>🛡️ Bezpieczny PPM: LPM zamiata, PPM nie niszczy maszyn</span>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- TRYB 2: BUDOWANIE I DEMONTAŻ (Build Mode)       -->
      <!-- ============================================== -->
      <div v-else-if="gameStore.hudMode === 'build'" class="flex flex-col gap-2">
        <!-- Category Filter Tabs -->
        <div class="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
          <button
            v-for="cat in BUILD_CATEGORIES"
            :key="cat.id"
            @click="selectedCategory = cat.id"
            class="px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer shrink-0"
            :class="selectedCategory === cat.id
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-slate-800 text-slate-400 hover:text-white'"
          >
            {{ cat.name }}
          </button>
        </div>

        <!-- Buildings Matrix Grid (Max 8-10 visible, scrollable if more) -->
        <div class="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
          <button
            v-for="(b, idx) in filteredBuildings"
            :key="b.type"
            @click="selectBuilding(b.type)"
            class="h-13 rounded-xl flex flex-col items-center justify-center p-1 border transition-all cursor-pointer relative group"
            :class="gameStore.selectedBuilding === b.type
              ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 text-amber-200'
              : (playerStore.credits >= b.cost ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200' : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60')"
          >
            <span v-if="idx < 10" class="absolute top-0.5 left-1 text-[7px] font-mono text-slate-400 font-bold group-hover:text-amber-300">
              {{ idx === 9 ? '0' : idx + 1 }}
            </span>
            <span class="text-sm leading-none mt-0.5">{{ b.icon }}</span>
            <span class="text-[8px] font-mono font-bold leading-none mt-0.5" :class="playerStore.credits >= b.cost ? 'text-emerald-400' : 'text-slate-500'">
              ${{ b.cost }}
            </span>

            <!-- Tooltip -->
            <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
              <div class="bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg shadow-xl text-center whitespace-nowrap">
                <p class="text-xs font-bold text-white font-sans">{{ b.name }}</p>
                <p class="text-[10px] text-amber-300 font-mono">Koszt: ${{ b.cost }} • {{ b.size }}</p>
                <p class="text-[10px] text-slate-400 font-sans mt-0.5">{{ b.desc }}</p>
              </div>
            </div>
          </button>
        </div>

        <!-- Demolish Safeguard & Drag-Demolish notice -->
        <div class="px-2 py-1 bg-amber-950/40 border border-amber-500/30 rounded-lg flex items-center justify-between text-[10px] text-amber-300 font-sans">
          <span>🗑️ <strong>PPM (Przytrzymaj i przeciągnij):</strong> Płynne wyburzanie (100% zwrotu)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore, type BuildType } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import type { BuildingType } from '@/engine/entities/BuildingEntity';

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const selectedCategory = ref<'all' | 'logistics' | 'industry' | 'power'>('all');

const BUILD_CATEGORIES = [
  { id: 'all' as const, name: 'Wszystko' },
  { id: 'logistics' as const, name: 'Logistyka' },
  { id: 'industry' as const, name: 'Przemysł' },
  { id: 'power' as const, name: 'Energia' },
];

interface MatrixBuildingItem {
  type: BuildingType;
  category: 'logistics' | 'industry' | 'power';
  name: string;
  cost: number;
  icon: string;
  size: string;
  desc: string;
}

const ALL_BUILDINGS: MatrixBuildingItem[] = [
  // Logistyka
  { type: 'conveyor', category: 'logistics', name: 'Taśma Mk1', cost: 2, icon: '➡️', size: '1x1', desc: 'Przesuwa urobek (2 kafle/s)' },
  { type: 'conveyor_mk2', category: 'logistics', name: 'Taśma Mk2', cost: 8, icon: '⏩', size: '1x1', desc: 'Szybki taśmociąg (4 kafle/s)' },
  { type: 'splitter', category: 'logistics', name: 'Rozdzielacz 50/50', cost: 18, icon: '🔀', size: '2x1', desc: 'Równomiernie rozdziela na 2 taśmy' },
  { type: 'smart_splitter', category: 'logistics', name: 'Smart Rozdzielacz', cost: 45, icon: '⚡', size: '2x1', desc: 'Filtruje: brykiety L, płyty P, pył środek' },
  { type: 'merger', category: 'logistics', name: 'Łącznik 2->1', cost: 20, icon: '⏬', size: '2x1', desc: 'Łączy dwa strumienie w jedną taśmę' },
  { type: 'underground_belt', category: 'logistics', name: 'Tunel Taśmy', cost: 15, icon: '🚇', size: '1x1', desc: 'Transportuje pod ziemią do 6 kafelków' },
  { type: 'pipe', category: 'logistics', name: 'Rurociąg Kwasowy', cost: 5, icon: '🧪', size: '1x1', desc: 'Transportuje stężony kwas siarkowy' },

  // Przemysł
  { type: 'packager', category: 'industry', name: 'Prasa Urobku', cost: 75, icon: '📦', size: '2x2', desc: '10kg pyłu -> Blok żużlu ($22)' },
  { type: 'smelter', category: 'industry', name: 'Piec Hutniczy', cost: 180, icon: '🔥', size: '2x2', desc: 'Przetapia brykiety na Płyty Kompozytowe ($75)' },
  { type: 'silo', category: 'industry', name: 'Magazyn Silo', cost: 60, icon: '🏛️', size: '2x2', desc: 'Buforuje do 150 szt. urobku' },
  { type: 'awesome_sink', category: 'industry', name: 'Mielarka SINK', cost: 110, icon: '⚙️', size: '2x2', desc: 'Mieli nadmiar surowców ze 100% wartością' },
  { type: 'acid_refinery', category: 'industry', name: 'Rafineria Chemiczna', cost: 320, icon: '⚗️', size: '2x2', desc: 'Kwas -> Ogniwa Kwasowe ($180)' },

  // Zasilanie i Ochrona
  { type: 'solar', category: 'power', name: 'Generator Słoneczny', cost: 45, icon: '⚡', size: '2x2', desc: 'Wytwarza 50 kW czystej energii' },
  { type: 'geothermal', category: 'power', name: 'Geotermia', cost: 280, icon: '🌋', size: '2x2', desc: 'Energia z kaldery (+80 kW)' },
  { type: 'power_pylon', category: 'power', name: 'Słup Kablowy', cost: 15, icon: '🗼', size: '1x1', desc: 'Przesyła prąd kablami do 10 kafelków' },
  { type: 'vacuum_turret', category: 'power', name: 'Wieżyczka Ssąca', cost: 220, icon: '🌀', size: '2x2', desc: 'Odkurza promień 220 px i pakuje urobki' },
  { type: 'shield_pylon', category: 'power', name: 'Pylon Tarczy', cost: 350, icon: '🛡️', size: '2x2', desc: 'Kopuła ochronna przed kwasem' },
  { type: 'acid_pump', category: 'power', name: 'Ekstraktor Gejzerowy', cost: 140, icon: '⛽', size: '2x2', desc: 'Wydobywa kwas z gejzerów' },
  { type: 'dock', category: 'power', name: 'Stacja Dokująca', cost: 70, icon: '🔋', size: '1x1', desc: 'Stacja ładowania i zrzutu botów' },
];

const filteredBuildings = computed(() => {
  if (selectedCategory.value === 'all') return ALL_BUILDINGS;
  return ALL_BUILDINGS.filter(b => b.category === selectedCategory.value);
});

const activeBuildingName = computed(() => {
  const found = ALL_BUILDINGS.find(b => b.type === gameStore.selectedBuilding);
  return found?.name ?? '';
});

const muleLabel = computed(() => {
  switch (gameStore.muleStatus) {
    case 'FLYING_TO_PLAYER': return 'LECI';
    case 'EXTRACTING': return 'ODSYS';
    case 'RETURNING': return 'WRACA';
    case 'UNLOADING': return 'ROZŁ';
    case 'IDLE':
    default:
      return 'Dron-Muł';
  }
});

const selectBuilding = (type: BuildType) => {
  if (gameStore.selectedBuilding === type) {
    gameStore.setSelectedBuilding(null);
  } else {
    gameStore.setSelectedBuilding(type);
  }
};

const triggerKey = (code: string) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }));
};

const playHorn = () => {
  window.dispatchEvent(new CustomEvent('venus-play-horn'));
};

const openShop = () => {
  gameStore.openCommandHub('shop');
};
</script>
