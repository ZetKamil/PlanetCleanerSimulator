<template>
  <div class="relative w-full h-full overflow-hidden bg-slate-950 select-none">
    <!-- PIXI Rendering Canvas Mount Target -->
    <div ref="canvasContainer" class="w-full h-full absolute inset-0 cursor-crosshair"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { GameEngine } from '@/engine/GameEngine';
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useContractStore } from '@/stores/useContractStore';
import { BUILDING_CONFIGS, type BuildingType } from '@/engine/entities/BuildingEntity';
import { getWorldConfig, resetWorldConfig, type WorldConfig } from '@/engine/world/WorldConfig';

const canvasContainer = ref<HTMLDivElement | null>(null);
const gameStore = useGameStore();
const playerStore = usePlayerStore();
const achievementStore = useAchievementStore();
const settingsStore = useSettingsStore();
const contractStore = useContractStore();

// Rule 1: NEVER store PixiJS instances in Vue reactive variables (ref/reactive).
// Keep engine reference in a plain variable.
let engine: GameEngine | null = null;

const getRoomCodeFromUrl = (): string | null => {
  const match = window.location.pathname.match(/\/room\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
};

const handleTierUnlocked = (e: any) => {
  if (engine && e.detail?.tier) {
    engine.baseDepot.setTier(e.detail.tier);
    engine.soundSystem.playCleanDing(e.detail.tier);
  }
};

const handleLaunchRocket = () => {
  if (engine) {
    engine.baseDepot.triggerRocketLaunch();
    engine.soundSystem.playCleanDing(4);
  }
};

const handleToggleDebug = () => {
  gameStore.toggleDebugMode();
};

const handleDeployBot = () => {
  if (engine) {
    engine.spawnSweepBot();
  }
};

const handleUpgradeBot = () => {
  if (engine) {
    engine.syncBotStats();
  }
};

const handleToggleSiloBots = (e: Event) => {
  if (engine) {
    const detail = (e as CustomEvent<{ siloId: string; acceptsBots: boolean }>).detail;
    engine.setSiloAcceptsBots(detail.siloId, detail.acceptsBots);
  }
};

const handlePlayHorn = () => {
  if (engine) {
    engine.soundSystem.playHorn();
  }
};

onMounted(async () => {
  window.addEventListener('venus-tier-unlocked', handleTierUnlocked);
  window.addEventListener('venus-launch-rocket', handleLaunchRocket);
  window.addEventListener('venus-toggle-debug', handleToggleDebug);
  window.addEventListener('venus-deploy-bot', handleDeployBot);
  window.addEventListener('venus-upgrade-bot', handleUpgradeBot);
  window.addEventListener('venus-toggle-silo-bots', handleToggleSiloBots);
  window.addEventListener('venus-play-horn', handlePlayHorn);
  if (!canvasContainer.value) return;

  const initialRoom = getRoomCodeFromUrl();
  if (initialRoom) {
    gameStore.setRoomCode(initialRoom);
  }

  engine = new GameEngine({
    container: canvasContainer.value,
    brushRadius: playerStore.currentTool.radius,
    roomCode: initialRoom || undefined,
    getBotPolicy: () => gameStore.botDropoffPolicy,
    onNetworkStatus: (status) => {
      gameStore.setNetworkState(status.connected, status.memberCount, status.roomCode);
    },
    onPipettePick: (type, dir) => {
      gameStore.setSelectedBuilding(type);
      gameStore.selectedDirection = dir;
    },
    onMilestoneClean: (percent) => {
      gameStore.showBanner(`🎉 SEKTOR WENUS OCZYSZCZONY W ${percent}%!`, 'success');
    },
    onAltModeToggled: (active) => {
      gameStore.isAltMode = active;
    },
    onDevSweepToggled: (active) => {
      gameStore.showBanner(
        active ? '🛠️ DEV SWEEP: WŁĄCZONY [F9] (Mysz + Kursor)' : '🧹 DEV SWEEP: WYŁĄCZONY [F9] (Fizyczny Lemiesz)',
        active ? 'warning' : 'info',
        3000
      );
    },
    onPowerUpdate: (produced, consumed) => {
      gameStore.setPowerStats(produced, consumed);
    },
    onAcidRainEvent: (active, timer) => {
      gameStore.setAcidRain(active, timer);
      if (active) {
        gameStore.showBanner(`⚠️ UWAGA: OPAD KWASU SIARKOWEGO! (${timer}s)`, 'warning', 5000);
      }
    },
    isPaused: () => (gameStore.isSystemMenuOpen || gameStore.isCommandHubOpen || gameStore.isOnboardingModalOpen) && !gameStore.roomCode,
    getBackpackStatus: () => ({
      current: playerStore.currentDust,
      max: playerStore.currentBackpack.capacity,
      isFull: playerStore.isBackpackFull,
    }),
    getShouldShowBaseGuide: () => {
      // Strzałka kierunkowa do Bazy w Kroku 2 samouczka lub gdy plecak jest pełny
      return (playerStore.isBackpackFull && playerStore.credits === 0) || (gameStore.onboardingStep === 2);
    },
    getBotStats: () => ({
      speedLevel: gameStore.botSpeedLevel,
      brushLevel: gameStore.botBrushLevel,
      capacityLevel: gameStore.botCapacityLevel,
    }),
    getBuildState: () => {
      const selected = gameStore.selectedBuilding as BuildingType | null;
      const cost = selected ? BUILDING_CONFIGS[selected].cost : 0;
      return {
        selectedBuilding: selected,
        isBuildMode: gameStore.hudMode === 'build',
        direction: gameStore.selectedDirection,
        canAfford: playerStore.credits >= cost,
        credits: playerStore.credits,
      };
    },
    onBuildPlaced: (building, cost) => {
      playerStore.spendCredits(cost);
      gameStore.recordBuildingPlaced(building);
      contractStore.checkContractProgress();
    },
    onFactoryItemsSold: (briquettes, plates) => {
      gameStore.addDeliveredItems(briquettes, plates);
      contractStore.checkContractProgress();
    },
    onDepotUnload: (bonusMultiplier = 1.0) => {
      // Sells dust at 1 kg = $1 * bonusMultiplier when entering Base Depot
      const res = playerStore.sellDust(bonusMultiplier);
      if (res.soldDust > 0) {
        contractStore.checkContractProgress();
      }
      return res;
    },
    onEmptyBackpack: () => {
      // Called by MuleBotEntity when suction beam finishes extracting dust
      return playerStore.emptyBackpack();
    },
    onDeductPlayerDust: (amount: number) => {
      // Called when player is near a Silo (Outpost Logistics)
      return playerStore.dumpDust(amount);
    },
    hasPerk: (perkId: string) => playerStore.hasPerk(perkId),
    onThrottledTick: (data) => {
      // Rule 2: throttled updates to Pinia store at 10 Hz
      if (data.gatheredDustBatch > 0) {
        playerStore.addDust(data.gatheredDustBatch);
      }
      if (data.simCreditsBatch > 0) {
        playerStore.addCredits(data.simCreditsBatch);
      }

      gameStore.updateThrottledStats({
        playerX: data.playerX,
        playerY: data.playerY,
        fps: data.fps,
        cleanedKg: data.totalCleanedKg,
        percentCleaned: data.percentCleaned,
        isSweeping: data.isSweeping,
      });

      if (data.muleStatus) {
        gameStore.setMuleStats(data.muleStatus, data.shieldDomesCount ?? 0);
      }

      // Turbo-Glide [Shift] & Planetary Terraformation Index (PTI)
      if (data.boostEnergy !== undefined) {
        playerStore.updateBoostStatus(data.boostEnergy, data.isBoosting ?? false);
      }
      if (data.ptiPercent !== undefined) {
        gameStore.updatePTI(data.ptiPercent, data.ptiStage ?? 'ETAP I: TOKSYCZNY PYŁ');
      }

      if (data.currentSectorId) {
        gameStore.updateSectorStats({
          id: data.currentSectorId,
          cleanPct: data.currentSectorClean ?? 0,
          claimed: data.currentSectorClaimed ?? false,
          claimedCount: data.claimedSectorsCount ?? 0,
          bonusPercent: data.sectorBonusPercent ?? 0,
        });
      }

      // Etap 10: Aktualizacja Inspektora Celu
      if (data.inspectorTarget) {
        gameStore.setInspectorTarget(data.inspectorTarget);
      }

      // Etap 08: Synchronizacja postawionych Silosów i Logistyki
      if (data.silosList) {
        gameStore.setSilosList(data.silosList);
      }

      // Etap 9: Warunki termiczne & Meltdown Loop
      if (data.playerTemperature !== undefined) {
        gameStore.updateThermalStats({
          temperature: data.playerTemperature,
          overheatPercent: data.playerOverheatPercent ?? 0,
          isInCrater: data.isInCrater ?? false,
        });
      }

      // Deszcz Kwasowy & Korozja Pancerza
      if (data.acidCorrosion !== undefined) {
        gameStore.updateAtmosphereStats({
          acidCorrosion: data.acidCorrosion,
          isPlayerShielded: data.isPlayerShielded ?? true,
        });
      }

      if (data.isMeltdown) {
        // Meltdown Death Penalty: loose carried dust & emergency respawn banner
        playerStore.emptyBackpack();
        gameStore.showBanner('🔥 KRYTYCZNE PRZEGRZANIE! Pojazd uległ stopieniu w kraterze. Awaryjny respawn w Bazie.', 'warning', 4500);
      }

      if (data.isAcidBreach) {
        // Acid Breach Death Penalty: loose carried dust & emergency respawn banner
        playerStore.emptyBackpack();
        gameStore.showBanner('🧪 KOROZJA KWASOWA! Kwas siarkowy przepalił pancerz pojazdu. Awaryjny powrót do Bazy.', 'warning', 4500);
      }

      // Relic Discovery & Analysis Feedback (Wariant A: Odkurzenie natychmiast zabezpiecza i bada sondę)
      if (data.discoveredRelic && data.analyzedRelic) {
        // Unlock associated permanent tech perk
        const perkMap: Record<string, { id: string; name: string; perkDesc: string }> = {
          'RELIC-VENERA-7': { id: 'venera_titanium_insulation', name: 'Tytanowa Izolacja Termiczna', perkDesc: '+25% odporności na przegrzanie' },
          'RELIC-VENERA-9': { id: 'venera_optical_optics', name: 'Szerokokątna Optyka Panoramiczna', perkDesc: '+20% zasięgu widzenia i radaru' },
          'RELIC-VENERA-13': { id: 'venera_acoustic_collector', name: 'Akustyczny Kolektor Ciśnieniowy', perkDesc: '+15% prędkości i zasięgu szczotki' },
          'RELIC-VENERA-14': { id: 'venera_seismic_resonance', name: 'Rezonans Sejsmiczny Skorupy', perkDesc: '+30% zasięgu wykrywania surowców' },
          'RELIC-VEGA-1': { id: 'vega_acid_neutralizer', name: 'Aerozolowy Neutralizator Kwasu', perkDesc: '+25% odporności na korozję' },
          'RELIC-APHRODITE-CORE': { id: 'aphrodite_market_uplink', name: 'Łącze Handlowe Afrodyta', perkDesc: '+15% ceny sprzedaży surowców' },
        };
        const perk = perkMap[data.analyzedRelic.id];
        if (perk) {
          playerStore.unlockPerk(perk.id);
          gameStore.showBanner(
            `🏺 ODKRYTO I ZBADANO [${data.discoveredRelic.discoveredCount}/${data.discoveredRelic.totalCount}] ${data.discoveredRelic.name}! (+${data.analyzedRelic.rewardCredits} CR, Odblokowano: ${perk.name})`,
            'success',
            6500
          );
        } else {
          gameStore.showBanner(
            `🏺 ODKRYTO I ZBADANO [${data.discoveredRelic.discoveredCount}/${data.discoveredRelic.totalCount}] ${data.discoveredRelic.name}! (+${data.analyzedRelic.rewardCredits} CR)`,
            'success',
            5500
          );
        }

        achievementStore.trackProgress('relic_first', 1);
        achievementStore.trackProgress('relic_half', data.discoveredRelic.discoveredCount);
        achievementStore.trackProgress('relic_all', data.discoveredRelic.discoveredCount);
        achievementStore.trackProgress('relic_analyze_all', data.discoveredRelic.discoveredCount);
      }

      // Track Milestone & Achievement Progression
      if (data.claimedSectorsCount) {
        achievementStore.trackProgress('clean_first_sector', 1);
        achievementStore.trackProgress('clean_10_sectors', data.claimedSectorsCount);
        achievementStore.trackProgress('clean_25_sectors', data.claimedSectorsCount);
      }
      if (data.totalCleanedKg) {
        achievementStore.trackProgress('dust_100kg', data.totalCleanedKg);
        achievementStore.trackProgress('dust_1000kg', data.totalCleanedKg);
        achievementStore.trackProgress('dust_10000kg', data.totalCleanedKg);
        contractStore.checkContractProgress();
      }
      if (data.minimapBots && data.minimapBots.length > 0) {
        achievementStore.trackProgress('bot_first', 1);
      }
      if (data.conveyorCount) {
        achievementStore.trackProgress('conveyor_line', data.conveyorCount);
      }
      if (data.powerProduced) {
        achievementStore.trackProgress('power_grid_150kw', data.powerProduced);
      }
      if (data.hasGeothermal) {
        achievementStore.trackProgress('power_geothermal', 1);
      }
      if (data.isInCrater) {
        achievementStore.trackProgress('crater_discovery', 1);
      }
      if (gameStore.acidRainActive && data.isPlayerShielded) {
        achievementStore.trackProgress('acid_storm_survive', 1);
      }
      if (gameStore.isRocketLaunched) {
        achievementStore.trackProgress('space_elevator_launch', 1);
      }

      // Update Minimap Radar Data & Relic Tracking
      gameStore.updateMinimapData({
        playerRotation: data.playerRotation ?? 0,
        discoveredRelicsCount: data.discoveredRelicsCount ?? 0,
        analyzedRelicsCount: data.analyzedRelicsCount ?? 0,
        relicsList: data.relicsList,
        sectors: data.minimapSectors,
        craters: data.minimapCraters,
        geysers: data.minimapGeysers,
        relics: data.minimapRelics,
        bots: data.minimapBots,
      });
    },
  });

  await engine.init();

  // Expose global debug controls for procedural terrain & world configuration
  (window as any).__gameEngine = engine;
  (window as any).__worldConfig = {
    get: getWorldConfig,
    set: (cfg: Partial<WorldConfig>) => engine?.reconfigureWorld(cfg),
    reset: () => engine?.reconfigureWorld(resetWorldConfig()),
  };

  // Initialize and apply user settings (audio, volume)
  settingsStore.initialize();
  contractStore.init();

  // Apply initial tool visuals & radius
  engine.setBrushRadius(playerStore.currentTool.radius, playerStore.currentTool.id);
});

// Watch for tool changes from Shop purchases/equips
watch(
  () => playerStore.currentTool,
  (newTool) => {
    if (engine) {
      engine.setBrushRadius(newTool.radius, newTool.id);
    }
  },
  { deep: true }
);

watch(
  () => gameStore.isAltMode,
  (val) => {
    if (engine && engine.isAltMode !== val) {
      engine.toggleAltMode();
    }
  }
);

watch(
  () => [settingsStore.isMuted, settingsStore.masterVolume],
  ([muted, volume]) => {
    if (engine) {
      engine.soundSystem.isMuted = muted as boolean;
      engine.soundSystem.setVolume(volume as number);
    }
  }
);

onUnmounted(() => {
  window.removeEventListener('venus-tier-unlocked', handleTierUnlocked);
  window.removeEventListener('venus-launch-rocket', handleLaunchRocket);
  window.removeEventListener('venus-toggle-debug', handleToggleDebug);
  window.removeEventListener('venus-deploy-bot', handleDeployBot);
  window.removeEventListener('venus-upgrade-bot', handleUpgradeBot);
  window.removeEventListener('venus-toggle-silo-bots', handleToggleSiloBots);
  window.removeEventListener('venus-play-horn', handlePlayHorn);
  delete (window as any).__gameEngine;
  delete (window as any).__worldConfig;
  if (engine) {
    engine.destroy();
    engine = null;
  }
});
</script>
