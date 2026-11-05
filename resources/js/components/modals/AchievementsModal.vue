<template>
  <div
    v-if="achievementStore.isModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-fadeIn"
    @click.self="achievementStore.closeModal()"
  >
    <!-- Modal Dialog Box -->
    <div
      class="bg-slate-950/95 border border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-amber-500/20"
      @keydown.esc="achievementStore.closeModal()"
    >
      <!-- Header -->
      <div class="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
            🏆
          </div>
          <div class="flex flex-col font-mono text-left">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-slate-100 font-sans tracking-wide">
                CENTRUM OSIĄGNIĘĆ I KAMIENI MILOWYCH
              </h2>
              <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                WENUS 2D
              </span>
            </div>
            <p class="text-xs text-slate-400 font-sans mt-0.5">
              Eksploruj planetę, odkopuj sondy Venera, automatyzuj kolonię i odbieraj nagrody kredytowe.
            </p>
          </div>
        </div>

        <button
          @click="achievementStore.closeModal()"
          class="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center text-sm transition cursor-pointer"
          title="Zamknij [ESC]"
        >
          ✕
        </button>
      </div>

      <!-- Global Progression Overview Bar -->
      <div class="px-6 py-4 bg-slate-900/40 border-b border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
        <div class="flex-1 w-full">
          <div class="flex items-center justify-between text-xs mb-1.5">
            <span class="text-slate-300 font-sans font-medium flex items-center gap-2">
              <span>📊</span> Całkowity postęp ekspedycji:
            </span>
            <span class="font-bold text-amber-300">
              {{ achievementStore.unlockedCount }} / {{ achievementStore.totalCount }} ({{ achievementStore.completionPct }}%)
            </span>
          </div>

          <!-- Master Progress Bar -->
          <div class="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700/80 relative">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 shadow-sm"
              :style="{ width: `${achievementStore.completionPct}%` }"
            ></div>
          </div>
        </div>

        <!-- Claim All Rewards Button -->
        <button
          v-if="achievementStore.unclaimedCount > 0"
          @click="handleClaimAll"
          class="shrink-0 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs font-mono shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer border border-emerald-300/40 animate-pulse"
        >
          <span>🎁</span>
          <span>ODBIERZ WSZYSTKIE (+{{ achievementStore.unclaimedRewardsTotal }} CR)</span>
        </button>
      </div>

      <!-- Category Filter Tabs -->
      <div class="px-6 py-3 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto bg-slate-950 text-xs font-mono">
        <button
          v-for="tab in filterTabs"
          :key="tab.id"
          @click="achievementStore.setFilter(tab.id as any)"
          class="px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 border"
          :class="achievementStore.activeFilter === tab.id
            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold shadow-md'
            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'"
        >
          <span>{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 ml-0.5">
            {{ getCategoryCount(tab.id) }}
          </span>
        </button>
      </div>

      <!-- Achievement Cards Grid -->
      <div class="p-6 overflow-y-auto flex-1 flex flex-col gap-3 font-mono">
        <div
          v-for="ach in achievementStore.filteredAchievements"
          :key="ach.id"
          class="p-4 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          :class="ach.isUnlocked
            ? (ach.rewardClaimed
              ? 'bg-slate-900/40 border-slate-700/60 opacity-80'
              : 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30')
            : 'bg-slate-900/70 border-slate-800'"
        >
          <!-- Left: Icon & Info -->
          <div class="flex items-start gap-3.5 flex-1">
            <div
              class="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-2xl border shadow-inner transition-transform group-hover:scale-105"
              :class="tierIconBg(ach.tier, ach.isUnlocked)"
            >
              {{ ach.icon }}
            </div>

            <div class="flex flex-col text-left">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border" :class="tierBadge(ach.tier)">
                  {{ tierName(ach.tier) }}
                </span>
                <span class="text-[10px] text-slate-500 uppercase">{{ categoryName(ach.category) }}</span>
                <span v-if="ach.unlockedAt" class="text-[10px] text-emerald-400 font-sans">
                  • Odblokowano: {{ formatDate(ach.unlockedAt) }}
                </span>
              </div>

              <h3 class="text-sm font-bold text-slate-100 font-sans mt-0.5">
                {{ ach.title }}
              </h3>

              <p class="text-xs text-slate-400 font-sans mt-0.5 leading-relaxed">
                {{ ach.description }}
              </p>

              <!-- Progress Bar -->
              <div class="w-full max-w-md mt-2 flex flex-col gap-1">
                <div class="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{{ ach.subtitle }}</span>
                  <span class="font-bold" :class="ach.isUnlocked ? 'text-emerald-400' : 'text-amber-300'">
                    {{ ach.currentProgress }} / {{ ach.maxProgress }}
                  </span>
                </div>

                <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :class="ach.isUnlocked ? 'bg-emerald-400' : 'bg-amber-400'"
                    :style="{ width: `${Math.min(100, Math.round((ach.currentProgress / ach.maxProgress) * 100))}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Action / Reward Status -->
          <div class="shrink-0 flex items-center gap-3 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
            <!-- Unlocked & Unclaimed Reward -->
            <button
              v-if="ach.isUnlocked && !ach.rewardClaimed"
              @click="handleClaim(ach.id)"
              class="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs font-mono shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-1.5 border border-emerald-300/40 animate-pulse"
            >
              <span>🎁</span>
              <span>ODBIERZ +{{ ach.rewardCredits }} CR</span>
            </button>

            <!-- Claimed Badge -->
            <div
              v-else-if="ach.isUnlocked && ach.rewardClaimed"
              class="bg-slate-800/80 border border-slate-700 text-emerald-400 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5"
            >
              <span>✅</span>
              <span>ODEBRANO (+{{ ach.rewardCredits }} CR)</span>
            </div>

            <!-- Locked / In Progress Badge -->
            <div
              v-else
              class="bg-slate-900/90 border border-slate-800 text-slate-500 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5"
            >
              <span>🔒</span>
              <span>W TOKU (+{{ ach.rewardCredits }} CR)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3.5 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between text-xs font-mono text-slate-400">
        <div class="flex items-center gap-2">
          <span>💡 Skrót klawiszowy:</span>
          <kbd class="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">Y</kbd>
          <span>lub kliknij w pasek Znajdziek</span>
        </div>
        <div>
          <span>Baza danych: </span>
          <span class="text-emerald-400 font-bold">Zsynchronizowano</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAchievementStore } from '@/stores/useAchievementStore';
import type { AchievementCategory, AchievementTier } from '@/engine/achievements/AchievementTypes';

const achievementStore = useAchievementStore();

const filterTabs = [
  { id: 'all', label: 'Wszystkie', icon: '🌐' },
  { id: 'exploration', label: 'Eksploracja', icon: '🏺' },
  { id: 'cleaning', label: 'Czyszczenie', icon: '🧹' },
  { id: 'automation', label: 'Automatyzacja', icon: '⚡' },
  { id: 'survival', label: 'Przetrwanie', icon: '🌧️' },
  { id: 'endgame', label: 'Kamienie Milowe', icon: '🚀' },
];

const getCategoryCount = (tabId: string) => {
  if (tabId === 'all') return achievementStore.achievements.length;
  return achievementStore.achievements.filter(a => a.category === tabId).length;
};

const categoryName = (cat: AchievementCategory) => {
  switch (cat) {
    case 'exploration': return 'Eksploracja';
    case 'cleaning': return 'Czyszczenie';
    case 'automation': return 'Automatyzacja';
    case 'survival': return 'Przetrwanie';
    case 'endgame': return 'Kamień Milowy';
  }
};

const tierName = (tier: AchievementTier) => {
  switch (tier) {
    case 'platinum': return 'Platynowy';
    case 'gold': return 'Złoty';
    case 'silver': return 'Srebrny';
    case 'bronze': return 'Brązowy';
  }
};

const tierBadge = (tier: AchievementTier) => {
  switch (tier) {
    case 'platinum': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    case 'gold': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'silver': return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    case 'bronze': return 'bg-amber-800/20 text-amber-600 border-amber-800/40';
  }
};

const tierIconBg = (tier: AchievementTier, isUnlocked: boolean) => {
  if (!isUnlocked) return 'bg-slate-900 border-slate-800 text-slate-600';
  switch (tier) {
    case 'platinum': return 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 ring-2 ring-cyan-500/20';
    case 'gold': return 'bg-amber-950/60 border-amber-500/60 text-amber-300 ring-2 ring-amber-500/20';
    case 'silver': return 'bg-slate-800/80 border-slate-400 text-slate-200';
    case 'bronze': return 'bg-amber-950/40 border-amber-700 text-amber-500';
  }
};

const formatDate = (isoString: string) => {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Niedawno';
  }
};

const handleClaim = (id: string) => {
  const credits = achievementStore.claimReward(id);
  const win = window as any;
  if (win.__gameEngine?.soundSystem) {
    win.__gameEngine.soundSystem.playCleanDing(4);
  }
};

const handleClaimAll = () => {
  const credits = achievementStore.claimAllRewards();
  const win = window as any;
  if (win.__gameEngine?.soundSystem) {
    win.__gameEngine.soundSystem.playCleanDing(4);
  }
};
</script>
