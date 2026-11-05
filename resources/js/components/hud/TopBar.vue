<template>
  <header class="fixed top-0 left-0 right-0 pointer-events-none p-3 z-30">
    <!-- Main Bar Row (fixed position at the top, never moves) -->
    <div class="w-full flex justify-between items-start gap-4">
      <!-- Left: Thermal & Power Grid Survival Telemetry -->
      <div class="pointer-events-auto flex items-center gap-3 venus-panel px-3.5 py-2 text-xs font-mono text-slate-300">
        <!-- Planet Chapter Badge -->
        <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono tracking-wider">
          CH.1 WENUS
        </span>

        <span class="text-slate-600">|</span>

        <!-- Status indicator dot -->
        <span
          class="inline-block w-2.5 h-2.5 rounded-full"
          :class="playerStore.isBackpackFull ? 'bg-rose-500 animate-pulse' : (gameStore.isSweeping ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400')"
          :title="playerStore.isBackpackFull ? 'Zbiornik pełny' : (gameStore.isSweeping ? 'Zamiata' : 'Łazik gotowy')"
        ></span>

        <!-- Termostat Wenus -->
        <div class="flex items-center gap-1.5 font-mono font-semibold" :class="gameStore.overheatPercent > 20 ? 'text-rose-400 animate-pulse' : 'text-slate-300'">
          <span>{{ gameStore.overheatPercent > 20 ? '🔥' : '🌡️' }}</span>
          <span>{{ gameStore.temperature }}°C</span>
          <span v-if="gameStore.overheatPercent > 0" class="text-rose-400 font-bold text-[10px]">
            [{{ gameStore.overheatPercent }}%]
          </span>
        </div>

        <span class="text-slate-600">|</span>

        <!-- Power Grid Indicator -->
        <div class="flex items-center gap-1.5" :class="gameStore.powerGrid.deficit ? 'text-rose-400 animate-pulse' : 'text-lime-300'">
          <span>⚡</span>
          <span>{{ gameStore.powerGrid.produced }} / {{ gameStore.powerGrid.consumed }} kW</span>
        </div>

        <span class="text-slate-600">|</span>

        <!-- Planetary Terraformation Index (PTI) -->
        <div class="flex items-center gap-1.5 text-cyan-300 font-bold cursor-help" :title="gameStore.ptiStage">
          <span>🌍</span>
          <span>PTI: {{ gameStore.ptiPercent.toFixed(1) }}%</span>
        </div>

        <!-- FPS (subtle) -->
        <span class="text-slate-600">|</span>
        <span class="text-slate-400 text-[11px]">{{ gameStore.fps }} FPS</span>
      </div>

      <!-- Center: Backpack Capacity Bar & Full Warning -->
      <div class="pointer-events-auto flex flex-col items-center gap-1 min-w-[280px] max-w-[360px] flex-1">
        <div
          class="w-full venus-panel px-4 py-2 flex flex-col gap-1.5 transition-all duration-200"
          :class="playerStore.isBackpackFull ? 'border-rose-500/90 bg-rose-950/40 ring-2 ring-rose-500/30' : ''"
        >
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-slate-300 font-sans font-medium flex items-center gap-1.5">
              <span>🎒</span> {{ playerStore.currentBackpack.name }}
            </span>
            <span class="font-bold font-data" :class="playerStore.isBackpackFull ? 'text-rose-400 animate-pulse' : 'text-amber-300'">
              {{ playerStore.currentDust.toFixed(1) }} / {{ playerStore.currentBackpack.capacity }} kg
            </span>
          </div>

          <!-- Single-Type Clean Industrial Progress Bar Track -->
          <div class="venus-progress-bar w-full">
            <div
              class="venus-progress-bar-fill"
              :class="playerStore.isBackpackFull ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'"
              :style="{ width: `${playerStore.dustPercentage}%` }"
            ></div>
          </div>

          <!-- Bottom: Status & Warning Alert -->
          <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span v-if="playerStore.isBackpackFull" class="text-rose-400 font-bold animate-pulse">
              ⚠️ ZBIORNIK PEŁNY — OPRÓŻNIJ W BAZIE LUB SILO!
            </span>
            <span v-else class="text-slate-500 font-mono">
              Pył Wenus ($0.10 / kg)
            </span>
            <span class="font-bold text-slate-300 font-data">
              {{ playerStore.dustPercentage }}%
            </span>
          </div>
        </div>

        <!-- Turbo-Glide [Shift] Nitro Gauge & Tempomat [Q] -->
        <div class="w-full venus-panel px-3 py-1 flex items-center justify-between text-[11px] font-mono gap-1.5">
          <span class="flex items-center gap-1.5" :class="playerStore.isBoosting ? 'text-amber-400 font-bold animate-pulse' : 'text-slate-300'">
            <span>{{ playerStore.isBoosting ? '🔥' : '⚡' }}</span>
            <span class="font-semibold font-tech">[Shift] TURBO</span>
          </span>
          <div class="venus-progress-bar w-24 mx-1">
            <div
              class="venus-progress-bar-fill"
              :class="playerStore.isBoosting ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'"
              :style="{ width: `${playerStore.boostEnergy}%` }"
            ></div>
          </div>
          <span class="text-[10px] text-slate-400 w-7 text-right font-bold font-data">{{ Math.round(playerStore.boostEnergy) }}%</span>

          <!-- Tempomat [Q] Badge & Button -->
          <button
            @click="toggleCruise"
            class="ml-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 transition-all border cursor-pointer"
            :class="playerStore.cruiseControl
              ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 ring-1 ring-emerald-400/50 animate-pulse'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'"
            title="Tempomat: samoczynne utrzymywanie prędkości jazdy do przodu [Klawisz Q]"
          >
            <span>🚗</span>
            <span class="font-tech">[Q] TEMPOMAT: {{ playerStore.cruiseControl ? 'WŁ' : 'WYŁ' }}</span>
          </button>
        </div>
      </div>

      <!-- Right: Survival Acid Alert, Credits, Command Hub [C] & Options [ESC] -->
      <div class="pointer-events-auto flex items-center gap-2.5">
        <!-- Acid Rain Warning & Corrosion Pill (Etap 7 & Survival) -->
        <div
          v-if="gameStore.acidRainActive"
          class="venus-panel px-3 py-1.5 text-xs font-mono flex items-center gap-2 transition-all duration-200"
          :class="gameStore.isPlayerShielded ? 'border-cyan-500/60 text-cyan-300' : 'border-rose-500/80 text-rose-300 ring-2 ring-rose-500/40 animate-pulse'"
        >
          <span class="text-sm">{{ gameStore.isPlayerShielded ? '🛡️' : '🌧️' }}</span>
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5 leading-tight">
              <span class="font-bold">KWAS: {{ gameStore.acidRainTimer }}s</span>
              <span v-if="gameStore.isPlayerShielded" class="text-[10px] text-cyan-400 font-bold tracking-wide">[OSŁONIĘTY]</span>
              <span v-else class="text-[10px] text-rose-400 font-bold tracking-wide">[KOROZJA {{ gameStore.acidCorrosion }}%]</span>
            </div>
            <!-- Pasek postępu korozji poza tarczą -->
            <div v-if="!gameStore.isPlayerShielded && gameStore.acidCorrosion > 0" class="venus-progress-bar w-full h-1.5 mt-1">
              <div
                class="venus-progress-bar-fill bg-gradient-to-r from-amber-400 via-rose-500 to-red-600"
                :style="{ width: `${gameStore.acidCorrosion}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Credits Card -->
        <div class="venus-panel border-emerald-500/40 px-3 py-2 text-xs font-mono flex items-center gap-2">
          <span class="text-sm">💰</span>
          <div class="flex flex-col">
            <span class="text-[10px] text-slate-400 leading-tight uppercase tracking-wider font-tech">Kredyty:</span>
            <span class="text-emerald-400 font-bold text-sm leading-tight font-data">${{ playerStore.credits.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Command Hub Modal Trigger [C] -->
        <button
          @click="gameStore.toggleCommandHub()"
          class="venus-panel bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 font-bold px-3 py-2 text-xs font-tech transition-all flex items-center gap-2 cursor-pointer border-amber-500/60 relative"
          title="Otwórz Centrum Dowodzenia (Statystyki, R&D, Sklep, Osiągnięcia) - Klawisz C"
        >
          <span class="text-base">🛸</span>
          <span class="hidden sm:inline">CENTRUM</span>
          <kbd class="px-1.5 py-0.5 bg-amber-500/30 text-amber-200 text-[10px] font-mono font-extrabold">C</kbd>
          <span
            v-if="achievementStore.unclaimedCount > 0"
            class="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-[10px] flex items-center justify-center animate-bounce shadow-md border-2 border-slate-900 z-10"
            title="Nagrody do odebrania!"
          >
            {{ achievementStore.unclaimedCount }}
          </span>
        </button>

        <!-- Planetary Map Trigger [M] -->
        <button
          @click="gameStore.openCommandHub('map')"
          class="venus-panel hover:border-slate-500 px-2.5 py-2 text-xs font-mono text-slate-300 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
          title="Pełna Mapa Planety [M]"
        >
          <span class="text-sm">🗺️</span>
          <kbd class="px-1 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 rounded text-[10px] font-mono">M</kbd>
        </button>

        <!-- Sound Mute Toggle (Click only - no shortcut conflict) -->
        <button
          @click="settingsStore.toggleMute()"
          class="venus-panel hover:border-slate-500 px-2.5 py-2 text-xs font-mono text-slate-300 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
          :class="settingsStore.isMuted ? 'border-rose-500/60 bg-rose-950/30 text-rose-300' : ''"
          title="Wycisz / włącz dźwięk"
        >
          <span class="text-sm">{{ settingsStore.isMuted ? '🔇' : '🔊' }}</span>
        </button>

        <!-- System Menu / Options Trigger [ESC] -->
        <button
          @click="gameStore.toggleSystemMenu()"
          class="venus-panel hover:border-slate-500 px-3 py-2 text-xs font-mono text-slate-300 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
          title="Menu Systemowe i Opcje (Klawisz ESC)"
        >
          <span class="text-sm">⚙️</span>
          <kbd class="px-1 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 rounded text-[10px] font-mono">ESC</kbd>
        </button>
      </div>
    </div>

    <!-- Floating Toast / Banner Announcement (positioned below TopBar HUD, no layout shift) -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform -translate-y-4 opacity-0 scale-95"
      enter-to-class="transform translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100 scale-100"
      leave-to-class="transform -translate-y-4 opacity-0 scale-95"
    >
      <div
        v-if="gameStore.bannerNotification"
        class="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold shadow-2xl flex items-center gap-3 border backdrop-blur-md z-40 whitespace-nowrap"
        :class="gameStore.bannerNotification.type === 'warning'
          ? 'bg-rose-950/90 text-rose-300 border-rose-500/80 ring-2 ring-rose-500/40 animate-pulse'
          : 'bg-emerald-950/90 text-emerald-300 border-emerald-400/80 ring-2 ring-emerald-400/40'"
      >
        <span class="text-base">{{ gameStore.bannerNotification.type === 'warning' ? '🚨' : '✨' }}</span>
        <span>{{ gameStore.bannerNotification.text }}</span>
      </div>
    </transition>
  </header>
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const achievementStore = useAchievementStore();
const settingsStore = useSettingsStore();

const toggleCruise = () => {
  const newState = playerStore.toggleCruiseControl();
  window.dispatchEvent(new CustomEvent('venus-toggle-cruise', { detail: { active: newState } }));
};
</script>
