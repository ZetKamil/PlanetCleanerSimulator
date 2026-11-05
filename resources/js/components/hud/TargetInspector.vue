<template>
  <transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 translate-y-2 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-2 scale-95"
  >
    <div
      v-if="gameStore.isAltMode && target"
      class="pointer-events-none select-none flex flex-col gap-1 w-80 font-mono"
    >
      <!-- Tactical Target Card -->
      <div
        class="venus-panel p-3 transition-all duration-200"
        :class="borderClasses"
      >
        <!-- Header: Indicator Pill & Source -->
        <div class="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-800 font-tech">
          <div class="flex items-center gap-1.5 font-bold tracking-wider" :class="accentTextClasses">
            <span class="inline-block w-2 h-2 rounded-full animate-ping" :class="accentDotClasses"></span>
            <span>{{ target.source === 'cursor' ? '🎯 CEL POD KURSOREM [ALT]' : '📍 LOKALIZACJA ŁAZIKA [ALT]' }}</span>
          </div>
          <span class="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-400 font-mono">
            {{ target.type }}
          </span>
        </div>

      <!-- Main Target Title & Subtitle -->
      <div class="pt-2 pb-1.5">
        <div class="text-sm font-bold tracking-wide flex items-center justify-between font-tech" :class="titleColorClasses">
          <span>{{ target.title }}</span>
          <span v-if="target.isClaimed" class="text-xs text-amber-300 font-semibold font-tech">★ BONUS</span>
        </div>
        <div class="text-[10px] text-slate-400 pt-0.5 truncate font-sans">
          {{ target.subtitle }}
        </div>
      </div>

      <!-- Cleanliness Progress Bar (for Sectors) -->
      <div v-if="target.cleanPct !== undefined" class="flex flex-col gap-1 py-1">
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-slate-400 font-tech">Stan Oczyszczenia:</span>
          <span
            class="font-bold font-data"
            :class="target.cleanPct >= 96 ? 'text-cyan-400' : (target.cleanPct > 50 ? 'text-amber-400' : 'text-slate-300')"
          >
            {{ target.cleanPct }}%
          </span>
        </div>
        <div class="venus-progress-bar w-full">
          <div
            class="venus-progress-bar-fill"
            :class="progressBarClasses"
            :style="{ width: `${Math.min(100, target.cleanPct)}%` }"
          ></div>
        </div>
      </div>

      <!-- Thermal Temperature Bar (for Craters) -->
      <div v-else-if="target.temperature !== undefined" class="flex flex-col gap-1 py-1">
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-slate-400 font-tech">Temperatura Strefy:</span>
          <span class="font-bold text-rose-400 font-data">+{{ target.temperature }}°C</span>
        </div>
        <div class="venus-progress-bar w-full">
          <div
            class="venus-progress-bar-fill bg-gradient-to-r from-amber-500 via-rose-500 to-red-600"
            :style="{ width: `${Math.min(100, (target.temperature / 800) * 100)}%` }"
          ></div>
        </div>
      </div>

      <!-- Status Badge Pill -->
      <div class="pt-1.5 flex items-center gap-1.5 text-[10px]">
        <div
          class="px-2 py-0.5 rounded font-semibold tracking-wide border flex items-center gap-1"
          :class="badgeClasses"
        >
          <span>{{ target.statusBadge }}</span>
        </div>
      </div>

      <!-- Economic Bonus / Extra Details -->
      <div v-if="target.bonusText || target.extraDetails" class="pt-2 text-[10px] text-slate-400 flex flex-col gap-0.5 border-t border-slate-900 mt-2">
        <div v-if="target.bonusText" class="text-amber-300/90 font-semibold flex items-center gap-1">
          <span>⚡</span>
          <span>{{ target.bonusText }}</span>
        </div>
        <div v-if="target.extraDetails" class="text-slate-400 italic">
          {{ target.extraDetails }}
        </div>
      </div>
    </div>
  </div>
</transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore, type InspectorTarget } from '@/stores/useGameStore';

const gameStore = useGameStore();

const target = computed<InspectorTarget | null>(() => gameStore.inspectorTarget);

const borderClasses = computed(() => {
  if (!target.value) return 'border-slate-800 ring-1 ring-slate-800/40';
  switch (target.value.accentColor) {
    case 'cyan':
      return 'border-cyan-500/50 ring-1 ring-cyan-500/30';
    case 'rose':
      return 'border-rose-500/50 ring-1 ring-rose-500/30';
    case 'emerald':
      return 'border-emerald-500/50 ring-1 ring-emerald-500/30';
    case 'purple':
      return 'border-purple-500/50 ring-1 ring-purple-500/30';
    case 'amber':
    default:
      return 'border-amber-500/50 ring-1 ring-amber-500/30';
  }
});

const accentTextClasses = computed(() => {
  if (!target.value) return 'text-slate-400';
  switch (target.value.accentColor) {
    case 'cyan':
      return 'text-cyan-400';
    case 'rose':
      return 'text-rose-400';
    case 'emerald':
      return 'text-emerald-400';
    case 'purple':
      return 'text-purple-400';
    case 'amber':
    default:
      return 'text-amber-400';
  }
});

const accentDotClasses = computed(() => {
  if (!target.value) return 'bg-slate-400';
  switch (target.value.accentColor) {
    case 'cyan':
      return 'bg-cyan-400';
    case 'rose':
      return 'bg-rose-400';
    case 'emerald':
      return 'bg-emerald-400';
    case 'purple':
      return 'bg-purple-400';
    case 'amber':
    default:
      return 'bg-amber-400';
  }
});

const titleColorClasses = computed(() => {
  if (!target.value) return 'text-white';
  switch (target.value.accentColor) {
    case 'cyan':
      return 'text-cyan-200';
    case 'rose':
      return 'text-rose-200';
    case 'emerald':
      return 'text-emerald-200';
    case 'purple':
      return 'text-purple-200';
    case 'amber':
    default:
      return 'text-amber-200';
  }
});

const progressBarClasses = computed(() => {
  if (!target.value) return 'bg-slate-500';
  if (target.value.cleanPct !== undefined && target.value.cleanPct >= 96) {
    return 'bg-gradient-to-r from-cyan-500 to-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]';
  }
  return 'bg-gradient-to-r from-amber-600 via-yellow-500 to-emerald-500';
});

const badgeClasses = computed(() => {
  if (!target.value) return 'bg-slate-900 border-slate-800 text-slate-400';
  switch (target.value.accentColor) {
    case 'cyan':
      return 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300';
    case 'rose':
      return 'bg-rose-950/70 border-rose-500/40 text-rose-300 animate-pulse';
    case 'emerald':
      return 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300';
    case 'purple':
      return 'bg-purple-950/70 border-purple-500/40 text-purple-300';
    case 'amber':
    default:
      return 'bg-amber-950/70 border-amber-500/40 text-amber-300';
  }
});
</script>

