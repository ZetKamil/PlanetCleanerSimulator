<template>
  <div
    v-if="gameStore.isTechTreeOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
    @click.self="gameStore.toggleTechTree()"
  >
    <div
      class="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🔬</span>
          <div>
            <h2 class="text-lg font-bold text-amber-300 font-mono tracking-wide">
              TERMINAL BADAŃ I ROZWOJU (R&D)
            </h2>
            <p class="text-xs text-slate-400">
              Kamienie Milowe & Winda Kosmiczna Wenus (Satisfactory / Factorio Loop)
            </p>
          </div>
        </div>
        <button
          @click="gameStore.toggleTechTree()"
          class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/60 transition cursor-pointer text-lg"
        >
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-4">
        <!-- Tier 1 -->
        <div class="p-4 rounded-xl border bg-slate-950/60 border-emerald-500/40 flex items-center justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                TIER 1: AKTYWNY
              </span>
              <h3 class="text-sm font-bold text-slate-200">Faza Pionierska (Fundamenty)</h3>
            </div>
            <p class="text-xs text-slate-400">
              Podstawowy taśmociąg, generator energii słonecznej oraz stacja bazowa.
            </p>
          </div>
          <span class="text-xs font-mono text-emerald-400 font-bold">UKOŃCZONE ✓</span>
        </div>

        <!-- Tier 2 -->
        <div
          class="p-4 rounded-xl border transition-all"
          :class="isTierUnlocked(2)
            ? 'bg-slate-950/60 border-emerald-500/40'
            : (playerStore.credits >= 100 ? 'bg-slate-900 border-amber-500/60' : 'bg-slate-950/40 border-slate-800 opacity-70')"
        >
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                  :class="isTierUnlocked(2) ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-amber-950 text-amber-400 border border-amber-700'"
                >
                  TIER 2
                </span>
                <h3 class="text-sm font-bold text-slate-200">Faza Przemysłowa (Automatyzacja)</h3>
              </div>
              <p class="text-xs text-slate-400">
                Odblokowuje: Rozdzielacz Taśm 50/50, Prasa Urobku ($15/szt.), Piec Hutniczy ($60/szt.) i Magazyn Silo.
              </p>
              <div class="text-[11px] font-mono text-amber-300">
                Wymóg: $100 Kredytów
              </div>
            </div>

            <div v-if="isTierUnlocked(2)" class="text-xs font-mono text-emerald-400 font-bold">
              UKOŃCZONE ✓
            </div>
            <button
              v-else
              @click="unlockTier(2, 100)"
              :disabled="playerStore.credits < 100"
              class="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-bold text-xs font-mono rounded-lg transition cursor-pointer disabled:opacity-40"
            >
              ODBLOKUJ ($100)
            </button>
          </div>
        </div>

        <!-- Tier 3: Fluid Network & Rocket Silo -->
        <div
          class="p-4 rounded-xl border transition-all"
          :class="isTierUnlocked(3)
            ? 'bg-slate-950/60 border-cyan-500/50'
            : (isTierUnlocked(2) && playerStore.credits >= 300 ? 'bg-slate-900 border-cyan-500/40' : 'bg-slate-950/40 border-slate-800 opacity-70')"
        >
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                  :class="isTierUnlocked(3) ? 'bg-cyan-950 text-cyan-400 border border-cyan-700' : 'bg-slate-800 text-slate-400 border border-slate-700'"
                >
                  TIER 3: ENDGAME
                </span>
                <h3 class="text-sm font-bold text-slate-200">Kopuły Ochronne i Ekspedycja Orbitalna</h3>
              </div>
              <p class="text-xs text-slate-400">
                Odblokowuje: Pylon Tarczy Siłowej (ochrona przed kwasem i ciepłem) oraz Wyrzutnię Rakiety Orbitalnej.
              </p>
              <div class="text-[11px] font-mono text-cyan-300">
                Wymóg: Ukończony Tier 2 + $300 Kredytów
              </div>
            </div>

            <div v-if="isTierUnlocked(3)" class="text-xs font-mono text-cyan-400 font-bold">
              GOTOWA DO STARTU 🚀
            </div>
            <button
              v-else
              @click="unlockTier(3, 300)"
              :disabled="!isTierUnlocked(2) || playerStore.credits < 300"
              class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-slate-950 font-bold text-xs font-mono rounded-lg transition cursor-pointer disabled:opacity-40"
            >
              ODBLOKUJ ($300)
            </button>
          </div>
        </div>

        <!-- Launch Rocket Final Action Banner (When Tier 3 is unlocked) -->
        <div v-if="isTierUnlocked(3)" class="p-4 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-emerald-950/60 border border-cyan-500/50 rounded-xl space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-mono uppercase text-cyan-300 font-bold">
                Wyrzutnia Orbitalna Gotowa do Odpału
              </div>
              <p class="text-[11px] text-slate-300">
                Sektor Wenus jest przygotowany. Odpalenie rakiety transportowej wieńczy misję ekspedycyjną!
              </p>
            </div>
            <button
              @click="launchRocket"
              class="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 active:scale-95 text-slate-950 font-extrabold text-xs font-mono rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🚀</span>
              <span>ODPAL RAKIETĘ!</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const isTierUnlocked = (tier: number) => {
  return gameStore.unlockedTiers.includes(tier);
};

const unlockTier = (tier: number, cost: number) => {
  if (playerStore.credits >= cost) {
    playerStore.spendCredits(cost);
    gameStore.unlockTier(tier);
    gameStore.showBanner(`🏆 ODBLOKOWANO TIER ${tier} TECHNOLOGII!`, 'success');
    window.dispatchEvent(new CustomEvent('venus-tier-unlocked', { detail: { tier } }));
  }
};

const launchRocket = () => {
  gameStore.launchRocket();
  gameStore.toggleTechTree();
  gameStore.showBanner(`🚀 RAKIETA ORBITALNA WYSTARTOWAŁA! MISJA WENUS ZAKOŃCZONA SUKCESEM!`, 'success', 8000);
  window.dispatchEvent(new CustomEvent('venus-launch-rocket'));
};
</script>

