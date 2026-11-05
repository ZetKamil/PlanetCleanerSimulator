<template>
  <div
    v-if="gameStore.isShopOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-in fade-in duration-150"
    @click.self="gameStore.closeShop()"
  >
    <div
      class="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden text-slate-200"
      @keydown.esc="gameStore.closeShop()"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🛒</span>
          <div>
            <h2 class="text-base font-bold text-white font-mono tracking-wide">SKLEP ULEPSZEŃ WENUS</h2>
            <p class="text-xs text-slate-400 font-sans">Kupuj wydajniejsze miotły, odkurzacze oraz większe zbiorniki urobku.</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Balance Badge -->
          <div class="bg-emerald-950/70 border border-emerald-500/50 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-mono">
            <span class="text-emerald-400">Stan konta:</span>
            <span class="text-emerald-300 font-bold text-sm">${{ playerStore.credits.toFixed(2) }}</span>
          </div>

          <!-- Close Button -->
          <button
            @click="gameStore.closeShop()"
            class="text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg p-1.5 transition-colors cursor-pointer"
            title="Zamknij (ESC lub B)"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Modal Body (Two Sections: Tools & Backpacks) -->
      <div class="p-6 overflow-y-auto max-h-[75vh] flex flex-col gap-6">
        <!-- Section 1: Tools (Narzędzia Zamiatające) -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
              <span>🧹</span> Narzędzia i Odkurzacze
            </h3>
            <span class="text-[11px] text-slate-400 font-mono">Aktywne: {{ playerStore.currentTool.name }}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              v-for="tool in AVAILABLE_TOOLS"
              :key="tool.id"
              class="bg-slate-800/50 border rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all relative overflow-hidden"
              :class="playerStore.currentTool.id === tool.id ? 'border-amber-400/80 bg-amber-950/20 ring-1 ring-amber-400/30' : 'border-slate-700/60 hover:border-slate-600'"
            >
              <!-- Equipped Badge ribbon -->
              <div
                v-if="playerStore.currentTool.id === tool.id"
                class="absolute top-2 right-2 text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold"
              >
                AKTYWNE
              </div>

              <div>
                <h4 class="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                  {{ tool.name }}
                </h4>
                <p class="text-[11px] text-slate-400 mt-1 leading-snug">
                  {{ tool.description }}
                </p>

                <!-- Stats specs -->
                <div class="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-col gap-1 text-[11px] font-mono">
                  <div class="flex justify-between text-slate-300">
                    <span class="text-slate-400">Promień pędzla:</span>
                    <strong class="text-cyan-300">{{ tool.radius }} px</strong>
                  </div>
                  <div class="flex justify-between text-slate-300">
                    <span class="text-slate-400">Szybkość zbierania:</span>
                    <strong class="text-emerald-300">{{ tool.sweepRate }} kg/s</strong>
                  </div>
                </div>
              </div>

              <!-- Action Button -->
              <div class="mt-2">
                <!-- Already Equipped -->
                <button
                  v-if="playerStore.currentTool.id === tool.id"
                  disabled
                  class="w-full py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-700/60 text-amber-300/80 border border-amber-500/20 cursor-default"
                >
                  ✓ WYPOSAŻONO
                </button>

                <!-- Owned but not equipped -->
                <button
                  v-else-if="playerStore.isToolPurchased(tool.id)"
                  @click="playerStore.equipTool(tool)"
                  class="w-full py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 transition-all cursor-pointer"
                >
                  WYPOSAŻ
                </button>

                <!-- Not purchased yet -->
                <button
                  v-else
                  :disabled="playerStore.credits < tool.cost"
                  @click="playerStore.buyTool(tool)"
                  class="w-full py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  :class="playerStore.credits >= tool.cost ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'"
                >
                  <span>KUP ZA</span>
                  <span class="font-bold">${{ tool.cost }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Backpacks (Zasobniki Plecakowe) -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
              <span>🎒</span> Zasobniki Plecakowe
            </h3>
            <span class="text-[11px] text-slate-400 font-mono">Aktywne: {{ playerStore.currentBackpack.name }}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              v-for="pack in AVAILABLE_BACKPACKS"
              :key="pack.id"
              class="bg-slate-800/50 border rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all relative overflow-hidden"
              :class="playerStore.currentBackpack.id === pack.id ? 'border-cyan-400/80 bg-cyan-950/20 ring-1 ring-cyan-400/30' : 'border-slate-700/60 hover:border-slate-600'"
            >
              <!-- Equipped Badge ribbon -->
              <div
                v-if="playerStore.currentBackpack.id === pack.id"
                class="absolute top-2 right-2 text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded font-bold"
              >
                AKTYWNE
              </div>

              <div>
                <h4 class="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                  {{ pack.name }}
                </h4>
                <p class="text-[11px] text-slate-400 mt-1 leading-snug">
                  {{ pack.description }}
                </p>

                <!-- Stats specs -->
                <div class="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-col gap-1 text-[11px] font-mono">
                  <div class="flex justify-between text-slate-300">
                    <span class="text-slate-400">Pojemność urobku:</span>
                    <strong class="text-cyan-300 font-bold">{{ pack.capacity }} kg</strong>
                  </div>
                  <div class="flex justify-between text-slate-300">
                    <span class="text-slate-400">Mnożnik ładunku:</span>
                    <span class="text-amber-300 font-bold">{{ (pack.capacity / 8).toFixed(1) }}x bazowy</span>
                  </div>
                </div>
              </div>

              <!-- Action Button -->
              <div class="mt-2">
                <!-- Already Equipped -->
                <button
                  v-if="playerStore.currentBackpack.id === pack.id"
                  disabled
                  class="w-full py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-700/60 text-cyan-300/80 border border-cyan-500/20 cursor-default"
                >
                  ✓ WYPOSAŻONO
                </button>

                <!-- Owned but not equipped -->
                <button
                  v-else-if="playerStore.isBackpackPurchased(pack.id)"
                  @click="playerStore.equipBackpack(pack)"
                  class="w-full py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 transition-all cursor-pointer"
                >
                  WYPOSAŻ
                </button>

                <!-- Not purchased yet -->
                <button
                  v-else
                  :disabled="playerStore.credits < pack.cost"
                  @click="playerStore.buyBackpack(pack)"
                  class="w-full py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  :class="playerStore.credits >= pack.cost ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'"
                >
                  <span>KUP ZA</span>
                  <span class="font-bold">${{ pack.cost }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3 bg-slate-800/40 border-t border-slate-700/60 flex items-center justify-between text-xs font-mono text-slate-400">
        <span>Skrót klawiszowy: <kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 text-[10px]">B</kbd> lub <kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 text-[10px]">TAB</kbd> otwiera / zamyka sklep</span>
        <button
          @click="gameStore.closeShop()"
          class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-600/80 cursor-pointer transition-colors"
        >
          Zamknij
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore, AVAILABLE_TOOLS, AVAILABLE_BACKPACKS } from '@/stores/usePlayerStore';

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const handleGlobalKeydown = (e: KeyboardEvent) => {
  // Toggle shop on KeyV or Tab
  if (e.code === 'KeyV') {
    gameStore.toggleShop();
  } else if (e.code === 'Escape' && gameStore.isShopOpen) {
    gameStore.closeShop();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

