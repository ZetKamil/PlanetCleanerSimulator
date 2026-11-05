<template>
  <transition
    enter-active-class="transition duration-400 ease-out"
    enter-from-class="transform translate-x-full opacity-0 scale-95"
    enter-to-class="transform translate-x-0 opacity-100 scale-100"
    leave-active-class="transition duration-300 ease-in"
    leave-from-class="transform translate-x-0 opacity-100 scale-100"
    leave-to-class="transform translate-x-full opacity-0 scale-95"
  >
    <div
      v-if="achievementStore.recentToast"
      @click="openModal"
      class="fixed bottom-6 right-6 pointer-events-auto z-50 cursor-pointer select-none group"
    >
      <div
        class="bg-slate-950/95 backdrop-blur-xl border px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3.5 max-w-sm ring-1 transition-all duration-200 group-hover:scale-102"
        :class="tierClass(achievementStore.recentToast.tier)"
      >
        <!-- Icon & Glow -->
        <div class="relative shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 shadow-inner">
          <span class="text-2xl group-hover:scale-110 transition-transform">
            {{ achievementStore.recentToast.icon }}
          </span>
          <span class="absolute -top-1 -right-1 text-xs">🏆</span>
        </div>

        <!-- Content -->
        <div class="flex flex-col text-left font-mono">
          <div class="flex items-center gap-2 leading-tight">
            <span class="text-[9px] uppercase tracking-wider font-bold" :class="tierTextClass(achievementStore.recentToast.tier)">
              {{ tierLabel(achievementStore.recentToast.tier) }}
            </span>
            <span class="text-[9px] text-slate-500">•</span>
            <span class="text-[9px] text-emerald-400 font-bold">+{{ achievementStore.recentToast.rewardCredits }} CR</span>
          </div>

          <h4 class="text-sm font-bold text-slate-100 font-sans tracking-wide leading-snug mt-0.5">
            {{ achievementStore.recentToast.title }}
          </h4>

          <p class="text-[11px] text-slate-400 font-sans leading-tight line-clamp-1 mt-0.5">
            {{ achievementStore.recentToast.subtitle }}
          </p>
        </div>

        <!-- Dismiss indicator -->
        <div class="text-slate-500 group-hover:text-slate-300 text-xs pl-1">
          ›
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useAchievementStore } from '@/stores/useAchievementStore';
import type { AchievementTier } from '@/engine/achievements/AchievementTypes';

const achievementStore = useAchievementStore();

const tierClass = (tier: AchievementTier) => {
  switch (tier) {
    case 'platinum':
      return 'border-cyan-400/80 shadow-cyan-500/20 ring-cyan-400/30';
    case 'gold':
      return 'border-amber-400/90 shadow-amber-500/25 ring-amber-400/40';
    case 'silver':
      return 'border-slate-300/80 shadow-slate-500/20 ring-slate-300/30';
    case 'bronze':
    default:
      return 'border-amber-600/70 shadow-amber-700/20 ring-amber-600/30';
  }
};

const tierTextClass = (tier: AchievementTier) => {
  switch (tier) {
    case 'platinum':
      return 'text-cyan-300';
    case 'gold':
      return 'text-amber-300';
    case 'silver':
      return 'text-slate-200';
    case 'bronze':
    default:
      return 'text-amber-500';
  }
};

const tierLabel = (tier: AchievementTier) => {
  switch (tier) {
    case 'platinum':
      return '⭐ PLATYNOWY KAMIEŃ MILOWY';
    case 'gold':
      return '🏆 ZŁOTE OSIĄGNIĘCIE';
    case 'silver':
      return '🥈 SREBRNE OSIĄGNIĘCIE';
    case 'bronze':
    default:
      return '🥉 BRĄZOWE OSIĄGNIĘCIE';
  }
};

const openModal = () => {
  achievementStore.openModal();
};

// Play audio fanfare on achievement toast
watch(
  () => achievementStore.recentToast,
  (newVal) => {
    if (newVal) {
      const win = window as any;
      if (win.__gameEngine?.soundSystem) {
        win.__gameEngine.soundSystem.playAchievementUnlocked();
      }
    }
  }
);
</script>
