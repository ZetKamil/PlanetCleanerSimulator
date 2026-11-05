<template>
  <div class="pointer-events-auto flex flex-col items-center gap-2 select-none">
    <!-- Active Placement Helper Bar (Shown when building is selected) -->
    <div
      v-if="gameStore.selectedBuilding"
      class="bg-slate-900/90 backdrop-blur-md border border-amber-500/50 px-4 py-1.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-mono text-amber-300 animate-in fade-in slide-in-from-bottom-2"
    >
      <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
      <span>TRYB BUDOWANIA: <strong>{{ activeBuildingName }}</strong></span>
      <span class="text-slate-600">|</span>
      <button
        @click="gameStore.rotatePlacement()"
        class="bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1 cursor-pointer transition-colors"
      >
        <span>Kierunek: <strong>[{{ gameStore.selectedDirection }}]</strong></span>
        <kbd class="text-[10px] bg-slate-900 px-1 py-0.2 rounded text-slate-400">R</kbd>
      </button>
      <span v-if="gameStore.selectedBuilding === 'conveyor'" class="text-slate-400 text-[11px] font-sans">
        💡 Przytrzymaj LPM i przeciągnij, aby położyć linię!
      </span>
      <span class="text-slate-600">|</span>
      <button
        @click="gameStore.setSelectedBuilding(null)"
        class="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30 text-[11px] cursor-pointer transition-colors"
      >
        Anuluj (ESC / PPM)
      </button>
    </div>

    <!-- Hotbar Slots Row + Utility Controls -->
    <div class="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-2xl shadow-2xl flex items-center gap-1.5 max-w-[95vw] overflow-x-auto">
      <!-- Building Slots 1..10 -->
      <button
        v-for="(item, idx) in HOTBAR_ITEMS"
        :key="item.name"
        @click="selectSlot(item.type)"
        class="relative w-12 h-12 rounded-xl flex flex-col items-center justify-center p-1 border transition-all cursor-pointer group shrink-0"
        :class="gameStore.selectedBuilding === item.type
          ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 text-amber-200'
          : (playerStore.credits >= item.cost ? 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-slate-200' : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60')"
      >
        <!-- Hotkey Badge -->
        <span class="absolute top-0.5 left-1 text-[8px] font-mono text-slate-400 group-hover:text-amber-300 font-bold">
          {{ idx === 9 ? '0' : idx + 1 }}
        </span>

        <!-- Icon -->
        <span class="text-sm leading-none mt-1">{{ item.icon }}</span>

        <!-- Cost -->
        <span class="text-[8px] font-mono font-bold leading-none mt-0.5" :class="playerStore.credits >= item.cost ? 'text-emerald-400' : 'text-slate-500'">
          ${{ item.cost }}
        </span>

        <!-- Tooltip -->
        <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
          <div class="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg shadow-xl text-center whitespace-nowrap">
            <p class="text-xs font-bold text-white font-sans">{{ item.name }}</p>
            <p class="text-[10px] text-amber-300 font-mono">Koszt: ${{ item.cost }} • {{ item.size }}</p>
            <p class="text-[10px] text-slate-400 font-sans mt-0.5">{{ item.desc }}</p>
          </div>
        </div>
      </button>

      <!-- Divider -->
      <div class="w-px h-10 bg-slate-700/60 mx-1 shrink-0"></div>

      <!-- Dron-Muł Transportowy [G] (Etap 12) -->
      <button
        @click="triggerMuleKey"
        class="relative w-12 h-12 rounded-xl flex flex-col items-center justify-center p-1 border transition-all cursor-pointer group shrink-0"
        :class="gameStore.muleStatus !== 'IDLE'
          ? 'bg-amber-950/80 border-amber-400 text-amber-300 ring-2 ring-amber-500/50 animate-pulse'
          : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-amber-300'"
      >
        <span class="absolute top-0.5 left-1 text-[8px] font-mono text-slate-400 font-bold">G</span>
        <span class="text-sm leading-none mt-1">🛸</span>
        <span class="text-[8px] font-mono font-bold leading-none mt-0.5" :class="gameStore.muleStatus !== 'IDLE' ? 'text-amber-400' : 'text-slate-400'">
          {{ muleLabel }}
        </span>

        <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
          <div class="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg shadow-xl text-center whitespace-nowrap">
            <p class="text-xs font-bold text-amber-300 font-sans">Dron-Muł Transportowy [G]</p>
            <p class="text-[10px] text-slate-400 font-sans mt-0.5">Wzywa drona do odebrania pyłu z plecaka i zrzutu w Bazie</p>
          </div>
        </div>
      </button>

      <!-- Kapsuła Zrzutowa Orbity [B] (Ekspresowy rozładunek urobku w terenie) -->
      <button
        @click="triggerDropPodKey"
        class="relative w-12 h-12 rounded-xl flex flex-col items-center justify-center p-1 border transition-all cursor-pointer group shrink-0 bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-cyan-300"
      >
        <span class="absolute top-0.5 left-1 text-[8px] font-mono text-slate-400 font-bold">B</span>
        <span class="text-sm leading-none mt-1">🚀</span>
        <span class="text-[8px] font-mono font-bold leading-none mt-0.5 text-cyan-400">
          $50
        </span>

        <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
          <div class="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg shadow-xl text-center whitespace-nowrap">
            <p class="text-xs font-bold text-cyan-300 font-sans">Kapsuła Zrzutowa Orbity [B]</p>
            <p class="text-[10px] text-amber-300 font-mono">Koszt: $50.00 • Do 50 kg urobku</p>
            <p class="text-[10px] text-slate-400 font-sans mt-0.5">Ląduje z orbity i skupuje pył bezpośrednio w terenie</p>
          </div>
        </div>
      </button>

      <!-- Alt-Mode [Alt] (Krok 5.2 - Warstwa Informacyjna) -->
      <button
        @click="gameStore.toggleAltMode()"
        class="relative w-12 h-12 rounded-xl flex flex-col items-center justify-center p-1 border transition-all cursor-pointer group shrink-0"
        :class="gameStore.isAltMode
          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/50'
          : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-400'"
      >
        <span class="absolute top-0.5 left-1 text-[7px] font-mono text-slate-400 font-bold">ALT</span>
        <span class="text-sm leading-none mt-1">🔍</span>
        <span class="text-[8px] font-mono font-bold leading-none mt-0.5" :class="gameStore.isAltMode ? 'text-cyan-400' : 'text-slate-500'">
          {{ gameStore.isAltMode ? 'ON' : 'OFF' }}
        </span>

        <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
          <div class="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg shadow-xl text-center whitespace-nowrap">
            <p class="text-xs font-bold text-cyan-300 font-sans">Tryb Informacyjny [Alt]</p>
            <p class="text-[10px] text-slate-400 font-sans mt-0.5">Wizualizacja stanu i zawartości maszyn na planszy</p>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useGameStore, type BuildType } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const HOTBAR_ITEMS = [
  { type: 'conveyor' as BuildType, name: 'Taśma Mk1', cost: 5, icon: '➡️', size: '1x1', desc: 'Przesuwa urobek (2 kafle/sek)' },
  { type: 'conveyor_mk2' as BuildType, name: 'Taśma Mk2', cost: 15, icon: '⏩', size: '1x1', desc: 'Szybki taśmociąg (5 kafli/sek)' },
  { type: 'splitter' as BuildType, name: 'Rozdzielacz 50/50', cost: 30, icon: '🔀', size: '2x1', desc: 'Równomiernie rozdziela strumień na 2 taśmy' },
  { type: 'merger' as BuildType, name: 'Łącznik 2->1', cost: 35, icon: '⏬', size: '2x1', desc: 'Łączy dwa napływające strumienie w jedną taśmę' },
  { type: 'underground_belt' as BuildType, name: 'Tunel Taśmy', cost: 25, icon: '🚇', size: '1x1', desc: 'Transportuje urobek pod ziemią do 6 kafelków' },
  { type: 'power_pylon' as BuildType, name: 'Słup Kablowy', cost: 20, icon: '🗼', size: '1x1', desc: 'Przesyła prąd kablami do odległych megakalder' },
  { type: 'vacuum_turret' as BuildType, name: 'Wieżyczka Ssąca', cost: 400, icon: '🌀', size: '2x2', desc: 'Odkurza promień 220 px i pakuje worki pyłu' },
  { type: 'packager' as BuildType, name: 'Prasa Urobku', cost: 300, icon: '📦', size: '2x2', desc: '10kg pyłu -> Blok żużlu ($15)' },
  { type: 'smelter' as BuildType, name: 'Piec Hutniczy', cost: 450, icon: '🔥', size: '2x2', desc: 'Przetapia brykiety na Płyty Kompozytowe ($60)' },
  { type: 'silo' as BuildType, name: 'Magazyn Silo', cost: 350, icon: '🏛️', size: '2x2', desc: 'Buforuje do 150 szt. urobku' },
  { type: 'solar' as BuildType, name: 'Solary', cost: 150, icon: '⚡', size: '2x2', desc: 'Zasila fabrykę (+50kW)' },
  { type: 'geothermal' as BuildType, name: 'Geotermia', cost: 500, icon: '🌋', size: '2x2', desc: 'Czysta energia z kaldery (+80kW)' },
  { type: 'shield_pylon' as BuildType, name: 'Pylon Tarczy', cost: 600, icon: '🛡️', size: '2x2', desc: 'Kopuła ochronna 280m przed kwasem i ciepłem' },
];

const activeBuildingName = computed(() => {
  const found = HOTBAR_ITEMS.find((i) => i.type === gameStore.selectedBuilding);
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
      return 'MUŁ';
  }
});

const selectSlot = (type: BuildType) => {
  if (gameStore.selectedBuilding === type) {
    gameStore.setSelectedBuilding(null);
  } else {
    gameStore.setSelectedBuilding(type);
  }
};

const triggerMuleKey = () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG' }));
};

const triggerDropPodKey = () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }));
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Digit1') selectSlot('conveyor');
  else if (e.code === 'Digit2') selectSlot('conveyor_mk2');
  else if (e.code === 'Digit3') selectSlot('splitter');
  else if (e.code === 'Digit4') selectSlot('packager');
  else if (e.code === 'Digit5') selectSlot('smelter');
  else if (e.code === 'Digit6') selectSlot('silo');
  else if (e.code === 'Digit7') selectSlot('solar');
  else if (e.code === 'Digit8') selectSlot('geothermal');
  else if (e.code === 'Digit9') selectSlot('shield_pylon');
  else if (e.code === 'KeyR' && gameStore.selectedBuilding) {
    gameStore.rotatePlacement();
  } else if (e.code === 'Escape' && gameStore.selectedBuilding) {
    gameStore.setSelectedBuilding(null);
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>
