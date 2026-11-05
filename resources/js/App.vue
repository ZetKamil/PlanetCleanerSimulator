<template>
  <main class="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
    <!-- Game Canvas (PixiJS Layer) -->
    <GameCanvas class="absolute inset-0 w-full h-full" />

    <!-- TopBar HUD (Streamlined Survival Telemetry & Triggers) -->
    <TopBar class="fixed top-0 left-0 right-0 z-30" />

    <!-- 3-Krokowy Onboarding dla Nowych Graczy (Etap 5) -->
    <OnboardingBanner />

    <!-- Corporate Contracts V.S.D. Widget -->
    <ContractWidget class="fixed top-16 left-4 z-20" />

    <!-- Tactical Target Inspector (Etap 10 - widoczny wyłącznie w trybie Alt [Alt-Mode]) -->
    <TargetInspector v-if="gameStore.isAltMode" class="fixed bottom-24 left-4 z-20" />

    <!-- Tactical Minimap Radar Widget (Etap 9 & 10) -->
    <MinimapRadar
      :world-width="6144"
      :world-height="6144"
      :player-x="gameStore.playerCoords.x"
      :player-y="gameStore.playerCoords.y"
      :player-rotation="gameStore.playerRotation"
      :temperature="gameStore.temperature"
      :overheat-percent="gameStore.overheatPercent"
      :sectors="gameStore.minimapSectors"
      :craters="gameStore.minimapCraters"
      :geysers="gameStore.minimapGeysers"
      :relics="gameStore.minimapRelics"
      :bots="gameStore.minimapBots"
      :claimed-count="gameStore.claimedSectorsCount"
      :total-sectors="gameStore.minimapSectors.length || 144"
      :analyzed-relics="gameStore.analyzedRelicsCount"
    />

    <!-- Thermal Overheat Screen Hazard Vignette (Etap 9) -->
    <div
      v-if="gameStore.overheatPercent > 10"
      class="pointer-events-none fixed inset-0 z-10 transition-opacity duration-150 ring-inset ring-8 ring-rose-500/60 bg-rose-950/20"
      :style="{ opacity: gameStore.overheatPercent / 100 }"
    ></div>

    <!-- Action Matrix HUD (Zastępuje długi dolny Hotbar - układ z venus-style-concept.jpg) -->
    <ActionMatrixHUD />

    <!-- Consolidated Command Hub [C] (Stats, R&D, Shop, Achievements, Relics) -->
    <CommandHubModal />

    <!-- System Menu & Pause Dialog [ESC] (Resume, Controls, Audio/Video, Multiplayer) -->
    <SystemMenuModal />

    <!-- Steam-Style Achievement Toast Notification -->
    <AchievementToast />
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import GameCanvas from '@/components/GameCanvas.vue';
import TopBar from '@/components/hud/TopBar.vue';
import OnboardingBanner from '@/components/hud/OnboardingBanner.vue';
import ContractWidget from '@/components/hud/ContractWidget.vue';
import TargetInspector from '@/components/hud/TargetInspector.vue';
import MinimapRadar from '@/components/hud/MinimapRadar.vue';
import ActionMatrixHUD from '@/components/hud/ActionMatrixHUD.vue';
import CommandHubModal from '@/components/modals/CommandHubModal.vue';
import SystemMenuModal from '@/components/modals/SystemMenuModal.vue';
import AchievementToast from '@/components/hud/AchievementToast.vue';
import { useGameStore } from '@/stores/useGameStore';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

const gameStore = useGameStore();
const achievementStore = useAchievementStore();
const settingsStore = useSettingsStore();

const handleGlobalKeyDown = (e: KeyboardEvent) => {
  // Ignore input keystrokes when typing in inputs/textareas
  const targetTag = (e.target as HTMLElement)?.tagName;
  if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
    if (e.code === 'Escape') {
      (e.target as HTMLElement).blur();
    }
    return;
  }

  // Hierarchical ESC handler
  if (e.code === 'Escape') {
    e.preventDefault();
    // 1. If placing a building, cancel placement first
    if (gameStore.selectedBuilding !== null) {
      gameStore.setSelectedBuilding(null);
      return;
    }
    // 2. If Command Hub is open, close it
    if (gameStore.isCommandHubOpen) {
      gameStore.closeCommandHub();
      return;
    }
    // 3. Toggle System Menu
    gameStore.toggleSystemMenu();
    return;
  }

  // Key C: Toggle Command Hub (defaults to 'stats' or last tab)
  if (e.code === 'KeyC') {
    e.preventDefault();
    gameStore.toggleCommandHub();
    return;
  }

  // Key V: Open/toggle Command Hub on Shop/Equipment tab
  if (e.code === 'KeyV') {
    e.preventDefault();
    if (gameStore.isCommandHubOpen && gameStore.commandHubTab === 'shop') {
      gameStore.closeCommandHub();
    } else {
      gameStore.openCommandHub('shop');
    }
    return;
  }

  // Key Y: Open/toggle Command Hub on Achievements tab
  if (e.code === 'KeyY') {
    e.preventDefault();
    if (gameStore.isCommandHubOpen && gameStore.commandHubTab === 'achievements') {
      gameStore.closeCommandHub();
    } else {
      gameStore.openCommandHub('achievements');
    }
    return;
  }

  // Key H: Play Exploration Horn
  if (e.code === 'KeyH') {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('venus-play-horn'));
    return;
  }

  // Key M: Open/toggle Command Hub on Planetary Map tab [7]
  if (e.code === 'KeyM') {
    e.preventDefault();
    if (gameStore.isCommandHubOpen && gameStore.commandHubTab === 'map') {
      gameStore.closeCommandHub();
    } else {
      gameStore.openCommandHub('map');
    }
    return;
  }

  // When Command Hub is open, quick-switch tabs using 1-7 keys
  if (gameStore.isCommandHubOpen) {
    if (e.code === 'Digit1') gameStore.commandHubTab = 'stats';
    else if (e.code === 'Digit2') gameStore.commandHubTab = 'tech';
    else if (e.code === 'Digit3') gameStore.commandHubTab = 'shop';
    else if (e.code === 'Digit4') gameStore.commandHubTab = 'fleet';
    else if (e.code === 'Digit5') gameStore.commandHubTab = 'achievements';
    else if (e.code === 'Digit6') gameStore.commandHubTab = 'relics';
    else if (e.code === 'Digit7') gameStore.commandHubTab = 'map';
  } else if (!gameStore.isSystemMenuOpen) {
    // When playing in world: Keys 1, 2 switch HUD Modes (Clean, Build); Key 3 opens Fleet Hub
    if (e.code === 'Digit1') gameStore.setHudMode('clean');
    else if (e.code === 'Digit2') gameStore.setHudMode('build');
    else if (e.code === 'Digit3') gameStore.openCommandHub('fleet');
  }
};

onMounted(() => {
  achievementStore.initialize();
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown);
});
</script>
