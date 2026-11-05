<template>
  <div
    v-if="contractStore.isContractWidgetVisible && contract"
    class="select-none transition-all duration-300 font-mono"
  >
    <!-- Collapsed View (Minimal Pill) -->
    <div
      v-if="isCollapsed"
      @click="isCollapsed = false"
      class="venus-panel border-amber-500/40 hover:border-amber-400/60 px-3 py-1.5 flex items-center gap-2 cursor-pointer text-xs text-slate-200 group transition-all"
    >
      <span class="text-base group-hover:scale-110 transition-transform">{{ contract.icon }}</span>
      <div class="flex items-center gap-1.5 font-bold font-tech">
        <span class="text-amber-400">V.S.D.:</span>
        <span class="text-slate-300 max-w-[130px] truncate">{{ contract.title.split(':')[1]?.trim() ?? contract.title }}</span>
      </div>
      <span
        v-if="contract.isCompleted && !contract.isClaimed"
        class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"
      ></span>
      <span class="text-[10px] text-slate-500 group-hover:text-amber-300">▼</span>
    </div>

    <!-- Expanded Card View -->
    <div
      v-else
      class="venus-panel border-amber-500/50 p-3.5 w-72 sm:w-80 flex flex-col gap-2.5 text-slate-200 ring-1 ring-amber-500/20"
    >
      <!-- Header -->
      <div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
        <div class="flex items-center gap-2 text-[11px] font-bold text-amber-400 font-tech">
          <span class="text-base">{{ contract.icon }}</span>
          <span class="tracking-wider">ZLECENIE V.S.D. [{{ contractStore.completedCount + 1 }}/{{ contractStore.totalCount }}]</span>
        </div>

        <button
          @click="isCollapsed = true"
          class="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer text-xs"
          title="Zwiń widget"
        >
          ▲
        </button>
      </div>

      <!-- Body Info -->
      <div>
        <h4 class="text-xs font-bold text-white font-tech">
          {{ contract.title }}
        </h4>
        <p class="text-[11px] text-slate-400 font-sans mt-0.5 leading-snug">
          {{ contract.subtitle }}
        </p>

        <!-- Progress bar -->
        <div class="mt-2.5 space-y-1">
          <div class="flex items-center justify-between text-[10px] font-mono">
            <span class="text-slate-400 font-tech">Postęp:</span>
            <span class="font-bold text-amber-300 font-data">
              {{ contract.currentProgress }} / {{ contract.targetProgress }}
            </span>
          </div>

          <div class="venus-progress-bar w-full">
            <div
              class="venus-progress-bar-fill bg-gradient-to-r from-amber-500 to-emerald-400"
              :style="{ width: `${progressPct}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Action Button / Claim Reward -->
      <div class="pt-1">
        <!-- Claimable Reward Button -->
        <button
          v-if="contract.isCompleted && contract.currentProgress >= contract.targetProgress && !contract.isClaimed"
          @click="claimReward"
          class="w-full py-1.5 venus-panel bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 animate-pulse font-tech border-emerald-400/60"
        >
          <span>🎉</span>
          <span>ODBIERZ GRANT (+${{ contract.rewardCredits }})</span>
        </button>

        <!-- In-progress info pill -->
        <div
          v-else-if="!contract.isCompleted"
          class="w-full py-1 bg-slate-950/70 border border-slate-800 rounded-xl text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5"
        >
          <span class="text-amber-400">Premia:</span>
          <span class="font-bold text-emerald-400">+${{ contract.rewardCredits }} Kredytów</span>
          <span v-if="contract.rewardTierUnlock" class="text-cyan-300 font-bold">+ Tier {{ contract.rewardTierUnlock }}</span>
        </div>

        <!-- All contracts completed -->
        <div
          v-else
          class="w-full py-1 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-center text-[10px] text-emerald-300 font-bold"
        >
          ✓ ZLECENIE WYKONANE
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useContractStore } from '@/stores/useContractStore';

const contractStore = useContractStore();
const isCollapsed = ref(false);

const contract = computed(() => contractStore.currentContract);

const progressPct = computed(() => {
  if (!contract.value || contract.value.targetProgress <= 0) return 0;
  return Math.min(100, Math.round((contract.value.currentProgress / contract.value.targetProgress) * 100));
});

const claimReward = () => {
  if (contract.value) {
    contractStore.claimContractReward(contract.value.id);
  }
};
</script>

