<template>
  <div class="relative pointer-events-auto select-none" ref="dropdownRef">
    <!-- Main Progress Pill -->
    <button
      @click="toggleDropdown"
      type="button"
      class="group flex items-center gap-2.5 bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md border border-amber-500/40 hover:border-amber-400/70 px-3 py-1.5 rounded-xl text-xs font-mono shadow-xl transition-all duration-200 cursor-pointer active:scale-98"
      :class="{ 'ring-2 ring-amber-400/40': isDropdownOpen }"
      title="Kliknij, aby zobaczyć stan historycznych sond programu Venera"
    >
      <span class="text-base group-hover:scale-110 transition-transform">🏺</span>
      
      <div class="flex flex-col text-left">
        <div class="flex items-center justify-between gap-3 leading-tight">
          <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">ZNAJDŹKI WENUS:</span>
          <span class="font-bold text-amber-300">
            {{ discoveredCount }} / {{ totalCount }}
          </span>
        </div>

        <!-- Mini Progress Bar -->
        <div class="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700/60 relative">
          <div
            class="h-full rounded-full transition-all duration-300 ease-out"
            :class="discoveredCount === totalCount ? 'bg-gradient-to-r from-amber-400 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-amber-300'"
            :style="{ width: `${progressPct}%` }"
          ></div>
        </div>
      </div>

      <!-- Arrow indicator -->
      <span class="text-[9px] text-slate-500 transition-transform duration-150" :class="{ 'rotate-180': isDropdownOpen }">
        ▼
      </span>
    </button>

    <!-- Dropdown Details Popover -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform opacity-0 scale-95 -translate-y-2"
      enter-to-class="transform opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform opacity-100 scale-100 translate-y-0"
      leave-to-class="transform opacity-0 scale-95 -translate-y-2"
    >
      <div
        v-if="isDropdownOpen"
        class="absolute top-full mt-2 left-0 w-80 bg-slate-950/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-3.5 shadow-2xl z-50 text-xs font-mono flex flex-col gap-2.5 ring-1 ring-amber-500/20"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <div class="flex items-center gap-1.5">
            <span class="text-amber-400 font-bold">📜 DZIENNIK WYKOPALISK</span>
            <span class="text-[10px] text-slate-400">({{ discoveredCount }}/{{ totalCount }})</span>
          </div>
          <button
            @click="openExplorationAchievements"
            class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer transition font-bold"
          >
            🏆 Osiągnięcia [Y]
          </button>
        </div>

        <p class="text-[11px] text-slate-400 leading-relaxed font-sans">
          Oczyszczaj pył bazaltowy odkurzaczem, aby odkopać zaginione radzieckie próbniki atmosferyczne i lądowniki Venera.
        </p>

        <!-- List of 6 Relics -->
        <div class="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
          <div
            v-for="relic in relicsDisplayList"
            :key="relic.id"
            class="p-2 rounded-xl border flex flex-col gap-1 transition-all"
            :class="relic.isAnalyzed
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : (relic.isUncovered
                ? 'bg-amber-950/30 border-amber-500/50 text-amber-200 ring-1 ring-amber-500/30 animate-pulse'
                : 'bg-slate-900/60 border-slate-800 text-slate-500')"
          >
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-bold flex items-center gap-1">
                <span>{{ relic.isAnalyzed ? '✅' : (relic.isUncovered ? '🔍' : '🔒') }}</span>
                <span>{{ relic.name }}</span>
                <span class="text-[9px] text-slate-400">({{ relic.year }})</span>
              </span>
              <span
                class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                :class="relic.isAnalyzed
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : (relic.isUncovered
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-slate-800 text-slate-500')"
              >
                {{ relic.isAnalyzed ? 'Zbadany' : (relic.isUncovered ? 'Wymaga [E]' : 'Pod pyłem') }}
              </span>
            </div>

            <p class="text-[10px] font-sans leading-tight" :class="relic.isUncovered ? 'text-slate-300' : 'text-slate-600'">
              {{ relic.description }}
            </p>

            <div v-if="relic.isUncovered" class="flex items-center justify-between text-[9px] pt-0.5">
              <span class="text-slate-400">Nagroda naukowa:</span>
              <span class="font-bold text-emerald-400">+{{ relic.rewardCredits }} CR</span>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '@/stores/useGameStore';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { VENERA_RELIC_TEMPLATES } from '@/engine/archaeology/VeneraArchaeologySystem';

const gameStore = useGameStore();
const achievementStore = useAchievementStore();

const isDropdownOpen = ref(false);
const dropdownRef = ref<HTMLDivElement | null>(null);

const totalCount = computed(() => gameStore.totalRelicsCount || 6);
const discoveredCount = computed(() => gameStore.discoveredRelicsCount || gameStore.minimapRelics.filter(r => r.isUncovered || r.isAnalyzed).length);
const progressPct = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.min(100, Math.round((discoveredCount.value / totalCount.value) * 100));
});

const relicsDisplayList = computed(() => {
  return VENERA_RELIC_TEMPLATES.map((tmpl, idx) => {
    const live = gameStore.relicsList.find(r => r.id === tmpl.id);
    const minimapItem = gameStore.minimapRelics[idx];
    const isUncovered = live?.isUncovered ?? minimapItem?.isUncovered ?? false;
    const isAnalyzed = live?.isAnalyzed ?? minimapItem?.isAnalyzed ?? false;

    return {
      ...tmpl,
      isUncovered,
      isAnalyzed,
    };
  });
});

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

const openExplorationAchievements = () => {
  isDropdownOpen.value = false;
  achievementStore.openModal('exploration');
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
