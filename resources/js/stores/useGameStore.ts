import { defineStore } from 'pinia';
import { usePlayerStore } from './usePlayerStore';
import type { BuildingType } from '@/engine/entities/BuildingEntity';

export type BuildType = BuildingType | null;

export type CommandHubTabType = 'stats' | 'tech' | 'shop' | 'fleet' | 'achievements' | 'relics' | 'map';

export type BotDropoffPolicy = 'silos_first' | 'nearest_any' | 'base_only';

export interface SiloTelemetry {
    id: string;
    gridX: number;
    gridY: number;
    acceptsBots: boolean;
    storedDust: number;
    maxDustCapacity: number;
}

export interface InspectorTarget {
    type: 'sector' | 'crater' | 'relic' | 'depot' | 'building' | 'terrain' | 'bot' | 'geyser';
    id?: string;
    title: string;
    subtitle: string;
    source: 'cursor' | 'player';
    cleanPct?: number;
    isClaimed?: boolean;
    temperature?: number;
    statusBadge: string;
    accentColor: 'cyan' | 'amber' | 'rose' | 'emerald' | 'purple';
    bonusText?: string;
    extraDetails?: string;
}

export const useGameStore = defineStore('game', {
    state: () => ({
        selectedBuilding: null as BuildType,
        selectedDirection: 'E' as 'N' | 'E' | 'S' | 'W',
        wsConnected: false,
        memberCount: 1,
        roomCode: null as string | null,
        playerCoords: { x: 3056, y: 3056 },
        fps: 60,
        cleanedKg: 0,
        percentCleaned: 0,
        isSweeping: false,
        isShopOpen: false,
        isLobbyOpen: false,
        isTechTreeOpen: false,
        isAchievementsOpen: false,
        isCommandHubOpen: false,
        commandHubTab: 'stats' as CommandHubTabType,
        isSystemMenuOpen: false,
        systemMenuTab: 'menu' as 'menu' | 'controls' | 'audio' | 'multiplayer' | 'world',
        isDebugMode: false,

        // Tryb akcji HUD (Wzorowany na venus-style-concept.jpg)
        hudMode: 'clean' as 'clean' | 'build' | 'fleet',
        botSpeedLevel: 1, // 1: 90 px/s, 2: 135 px/s, 3: 180 px/s
        botBrushLevel: 1, // 1: 14 px, 2: 22 px, 3: 32 px
        botCapacityLevel: 1, // 1: 15 kg, 2: 35 kg, 3: 80 kg
        botDropoffPolicy: 'silos_first' as BotDropoffPolicy,
        silosList: [] as SiloTelemetry[],

        // Etap 5: "Juice & Feedback"
        isAltMode: false,
        bannerNotification: null as { text: string; type: 'success' | 'warning' | 'info'; id: number } | null,
        soundMuted: false,

        // Etap 7: Power Grid & Survival
        powerGrid: {
            produced: 10,
            consumed: 0,
            deficit: false,
        },
        acidRainActive: false,
        acidRainTimer: 0, // remaining storm seconds
        acidCorrosion: 0, // 0 - 100%
        isPlayerShielded: true,

        // Etap 8: Satisfactory Milestone & Tech Tree
        currentTier: 1,
        unlockedTiers: [1],
        isRocketLaunched: false,
        deliveredBriquettes: 0,
        deliveredPlates: 0,
        buildingsPlacedCount: {} as Record<string, number>,

        // Sektory Rombowe (Rhombus Sectors & Bonuses)
        currentSectorId: 'SEC-H06',
        currentSectorClean: 0,
        currentSectorClaimed: false,
        claimedSectorsCount: 0,
        sectorBonusPercent: 0,

        // Okienko Celu / Inspektor Celu (Etap 10)
        inspectorTarget: null as InspectorTarget | null,

        // Etap 11 & 12: Dron-Muł & Tarcze
        muleStatus: 'IDLE' as 'IDLE' | 'FLYING_TO_PLAYER' | 'EXTRACTING' | 'RETURNING' | 'UNLOADING',
        shieldDomesCount: 0,

        // Etap 9: Warunki Termiczne & Radar Minimapy
        temperature: 460, // °C
        overheatPercent: 0, // 0 - 100%
        isInCrater: false,
        playerRotation: 0,
        discoveredRelicsCount: 0,
        analyzedRelicsCount: 0,
        totalRelicsCount: 6,
        relicsList: [] as Array<{ id: string; name: string; year: string; rewardCredits: number; isUncovered: boolean; isAnalyzed: boolean }>,
        // Planetary Terraformation Index (PTI) - Globalny Postęp Oczyszczania Wenus
        ptiPercent: 0, // 0.00% to 100.00%
        ptiStage: 'ETAP I: TOKSYCZNY PYŁ' as string,

        minimapSectors: [] as Array<{ id: string; cx: number; cy: number; isClaimed: boolean; cleanPct: number }>,
        minimapCraters: [] as Array<{ x: number; y: number; radius: number }>,
        minimapGeysers: [] as Array<{ x: number; y: number; radius: number }>,
        minimapRelics: [] as Array<{ x: number; y: number; isUncovered: boolean; isAnalyzed: boolean }>,
        minimapBots: [] as Array<{ x: number; y: number }>,

        // 3-Krokowy Onboarding (Etap 5 & Spec Point 7)
        isOnboardingDismissed: false,
        isOnboardingModalOpen: false,
        acknowledgedOnboardingSteps: [] as number[],
    }),
    getters: {
        onboardingStep: (state): number => {
            if (state.isOnboardingDismissed) return 0;
            if (typeof localStorage !== 'undefined' && localStorage.getItem('venus_onboarding_dismissed') === 'true') {
                return 0;
            }
            const playerStore = usePlayerStore();
            // Jeśli gracz kupił drugie narzędzie lub osiągnął spore kredyty, samouczek jest ukończony
            if (playerStore.purchasedToolIds.length > 2 || playerStore.credits >= 30) {
                return 0;
            }

            // Krok 3: gracz ma kredyty ze sprzedaży pierwszego urobku
            if (playerStore.credits > 0) {
                return 3;
            }

            // Krok 2: zbiornik pełny (>= 8 kg lub limit plecaka)
            if (playerStore.currentDust >= 8 || playerStore.isBackpackFull) {
                return 2;
            }

            // Krok 1: start gry - podjedź do pyłu i napełnij zbiornik
            return 1;
        },
    },
    actions: {
        updateThermalStats(stats: { temperature: number; overheatPercent: number; isInCrater: boolean }) {
            this.temperature = stats.temperature;
            this.overheatPercent = stats.overheatPercent;
            this.isInCrater = stats.isInCrater;
        },
        updateMinimapData(data: {
            playerRotation: number;
            discoveredRelicsCount?: number;
            analyzedRelicsCount: number;
            relicsList?: Array<{ id: string; name: string; year: string; rewardCredits: number; isUncovered: boolean; isAnalyzed: boolean }>;
            sectors?: Array<{ id: string; cx: number; cy: number; isClaimed: boolean; cleanPct: number }>;
            craters?: Array<{ x: number; y: number; radius: number }>;
            geysers?: Array<{ x: number; y: number; radius: number }>;
            relics?: Array<{ x: number; y: number; isUncovered: boolean; isAnalyzed: boolean }>;
            bots?: Array<{ x: number; y: number }>;
        }) {
            this.playerRotation = data.playerRotation;
            if (data.discoveredRelicsCount !== undefined) this.discoveredRelicsCount = data.discoveredRelicsCount;
            this.analyzedRelicsCount = data.analyzedRelicsCount;
            if (data.relicsList) this.relicsList = data.relicsList;
            if (data.sectors) this.minimapSectors = data.sectors;
            if (data.craters) this.minimapCraters = data.craters;
            if (data.geysers) this.minimapGeysers = data.geysers;
            if (data.relics) this.minimapRelics = data.relics;
            if (data.bots) this.minimapBots = data.bots;
        },
        updateSectorStats(stats: {
            id: string;
            cleanPct: number;
            claimed: boolean;
            claimedCount: number;
            bonusPercent: number;
        }) {
            this.currentSectorId = stats.id;
            this.currentSectorClean = stats.cleanPct;
            this.currentSectorClaimed = stats.claimed;
            this.claimedSectorsCount = stats.claimedCount;
            this.sectorBonusPercent = stats.bonusPercent;
        },
        updatePTI(percent: number, stage: string) {
            this.ptiPercent = Math.min(100, Math.max(0, Number(percent.toFixed(2))));
            this.ptiStage = stage;
        },
        setInspectorTarget(target: InspectorTarget | null) {
            this.inspectorTarget = target;
        },
        setSelectedBuilding(building: BuildType) {
            this.selectedBuilding = building;
            if (building) {
                this.hudMode = 'build';
            }
        },
        setHudMode(mode: 'clean' | 'build' | 'fleet') {
            this.hudMode = mode;
            if (mode === 'clean' || mode === 'fleet') {
                this.selectedBuilding = null;
            } else if (mode === 'build' && !this.selectedBuilding) {
                this.selectedBuilding = 'conveyor';
            }
        },
        upgradeBotSpeed(cost: number): boolean {
            const playerStore = usePlayerStore();
            if (this.botSpeedLevel < 3 && playerStore.credits >= cost) {
                playerStore.spendCredits(cost);
                this.botSpeedLevel++;
                this.showBanner(`🚀 ULEPSZONO SILNIKI BOTÓW: Poziom ${this.botSpeedLevel}!`, 'success');
                return true;
            }
            return false;
        },
        upgradeBotBrush(cost: number): boolean {
            const playerStore = usePlayerStore();
            if (this.botBrushLevel < 3 && playerStore.credits >= cost) {
                playerStore.spendCredits(cost);
                this.botBrushLevel++;
                this.showBanner(`🧹 ULEPSZONO SZCZOTKI BOTÓW: Poziom ${this.botBrushLevel}!`, 'success');
                return true;
            }
            return false;
        },
        upgradeBotCapacity(cost: number): boolean {
            const playerStore = usePlayerStore();
            if (this.botCapacityLevel < 3 && playerStore.credits >= cost) {
                playerStore.spendCredits(cost);
                this.botCapacityLevel++;
                this.showBanner(`🎒 ULEPSZONO ZBIORNIKI BOTÓW: Poziom ${this.botCapacityLevel}!`, 'success');
                return true;
            }
            return false;
        },
        rotatePlacement() {
            const dirs: ('N' | 'E' | 'S' | 'W')[] = ['N', 'E', 'S', 'W'];
            const nextIdx = (dirs.indexOf(this.selectedDirection) + 1) % dirs.length;
            this.selectedDirection = dirs[nextIdx];
        },
        toggleAltMode() {
            this.isAltMode = !this.isAltMode;
        },
        toggleDebugMode() {
            this.isDebugMode = !this.isDebugMode;
        },
        setBotDropoffPolicy(policy: BotDropoffPolicy) {
            this.botDropoffPolicy = policy;
            const labels = {
                silos_first: '🏭 Zrzut do Silosów (Priorytet)',
                nearest_any: '🧭 Najbliższy punkt zrzutu',
                base_only: '💰 Zrzut tylko do Bazy ($)',
            };
            this.showBanner(`🤖 ZMIANA POLITYKI LOGISTYKI: ${labels[policy]}`, 'info');
            window.dispatchEvent(new CustomEvent('venus-bot-policy-changed', { detail: { policy } }));
        },
        setSilosList(list: SiloTelemetry[]) {
            this.silosList = list;
        },
        toggleSiloAcceptsBots(siloId: string) {
            const found = this.silosList.find(s => s.id === siloId);
            if (found) {
                found.acceptsBots = !found.acceptsBots;
                window.dispatchEvent(new CustomEvent('venus-toggle-silo-bots', {
                    detail: { siloId, acceptsBots: found.acceptsBots }
                }));
                this.showBanner(
                    found.acceptsBots
                        ? `🤖 SILOS [${found.gridX}, ${found.gridY}]: Włączono przyjmowanie botów`
                        : `🚫 SILOS [${found.gridX}, ${found.gridY}]: Wyłączono przyjmowanie botów`,
                    found.acceptsBots ? 'success' : 'warning'
                );
            }
        },
        openCommandHub(tab: CommandHubTabType = 'stats') {
            this.commandHubTab = tab;
            this.isCommandHubOpen = true;
            this.isShopOpen = tab === 'shop';
            this.isTechTreeOpen = tab === 'tech';
            this.isAchievementsOpen = tab === 'achievements';
            this.isSystemMenuOpen = false;
            this.selectedBuilding = null;
        },
        closeCommandHub() {
            this.isCommandHubOpen = false;
            this.isShopOpen = false;
            this.isTechTreeOpen = false;
            this.isAchievementsOpen = false;
        },
        toggleCommandHub(tab: CommandHubTabType = 'stats') {
            if (this.isCommandHubOpen && this.commandHubTab === tab) {
                this.closeCommandHub();
            } else {
                this.openCommandHub(tab);
            }
        },
        openSystemMenu(tab: 'menu' | 'controls' | 'audio' | 'multiplayer' | 'world' = 'menu') {
            this.systemMenuTab = tab;
            this.isSystemMenuOpen = true;
            this.isLobbyOpen = tab === 'multiplayer';
            this.isCommandHubOpen = false;
            this.selectedBuilding = null;
        },
        closeSystemMenu() {
            this.isSystemMenuOpen = false;
            this.isLobbyOpen = false;
        },
        toggleSystemMenu(tab: 'menu' | 'controls' | 'audio' | 'multiplayer' | 'world' = 'menu') {
            if (this.isSystemMenuOpen && this.systemMenuTab === tab) {
                this.closeSystemMenu();
            } else {
                this.openSystemMenu(tab);
            }
        },
        toggleTechTree() {
            this.toggleCommandHub('tech');
        },
        toggleAchievements() {
            this.toggleCommandHub('achievements');
        },
        openShop() {
            this.openCommandHub('shop');
        },
        closeShop() {
            this.closeCommandHub();
        },
        toggleShop() {
            this.toggleCommandHub('shop');
        },
        openLobby() {
            this.openSystemMenu('multiplayer');
        },
        closeLobby() {
            this.closeSystemMenu();
        },
        toggleLobby() {
            this.toggleSystemMenu('multiplayer');
        },
        unlockTier(tier: number) {
            if (!this.unlockedTiers.includes(tier)) {
                this.unlockedTiers.push(tier);
                this.currentTier = Math.max(this.currentTier, tier);
            }
        },
        recordBuildingPlaced(building: string) {
            this.buildingsPlacedCount[building] = (this.buildingsPlacedCount[building] || 0) + 1;
        },
        addDeliveredItems(briquettes: number, plates: number) {
            if (briquettes > 0) this.deliveredBriquettes += briquettes;
            if (plates > 0) this.deliveredPlates += plates;
        },
        launchRocket() {
            this.isRocketLaunched = true;
        },
        showBanner(text: string, type: 'success' | 'warning' | 'info' = 'success', durationMs: number = 3500) {
            const id = Date.now();
            this.bannerNotification = { text, type, id };
            setTimeout(() => {
                if (this.bannerNotification?.id === id) {
                    this.bannerNotification = null;
                }
            }, durationMs);
        },
        setPowerStats(produced: number, consumed: number) {
            this.powerGrid.produced = produced;
            this.powerGrid.consumed = consumed;
            this.powerGrid.deficit = consumed > produced;
        },
        setMuleStats(status: 'IDLE' | 'FLYING_TO_PLAYER' | 'EXTRACTING' | 'RETURNING' | 'UNLOADING', shieldDomesCount: number) {
            this.muleStatus = status;
            this.shieldDomesCount = shieldDomesCount;
        },
        setAcidRain(active: boolean, timer: number = 0) {
            this.acidRainActive = active;
            this.acidRainTimer = timer;
        },
        updateAtmosphereStats(stats: { acidCorrosion: number; isPlayerShielded: boolean }) {
            this.acidCorrosion = stats.acidCorrosion;
            this.isPlayerShielded = stats.isPlayerShielded;
        },
        setWsStatus(connected: boolean) {
            this.wsConnected = connected;
        },
        setNetworkState(connected: boolean, memberCount: number, roomCode?: string) {
            this.wsConnected = connected;
            this.memberCount = memberCount;
            if (roomCode) this.roomCode = roomCode;
        },
        setRoomCode(code: string | null) {
            this.roomCode = code;
        },

        updateThrottledStats(stats: {
            playerX: number;
            playerY: number;
            fps: number;
            cleanedKg: number;
            percentCleaned: number;
            isSweeping: boolean;
        }) {
            this.playerCoords.x = Math.round(stats.playerX);
            this.playerCoords.y = Math.round(stats.playerY);
            this.fps = stats.fps;
            this.cleanedKg = stats.cleanedKg;
            this.percentCleaned = stats.percentCleaned;
            this.isSweeping = stats.isSweeping;
        },

        dismissOnboarding() {
            this.isOnboardingDismissed = true;
            this.isOnboardingModalOpen = false;
            try {
                localStorage.setItem('venus_onboarding_dismissed', 'true');
            } catch (e) {
                // ignore
            }
        },

        acknowledgeOnboardingStep(step: number) {
            if (!this.acknowledgedOnboardingSteps.includes(step)) {
                this.acknowledgedOnboardingSteps.push(step);
            }
            this.isOnboardingModalOpen = false;
        },

        resetOnboarding() {
            this.isOnboardingDismissed = false;
            this.isOnboardingModalOpen = false;
            this.acknowledgedOnboardingSteps = [];
            try {
                localStorage.removeItem('venus_onboarding_dismissed');
            } catch (e) {
                // ignore
            }
        },

        resetGame() {
            this.cleanedKg = 0;
            this.percentCleaned = 0;
            this.currentTier = 1;
            this.unlockedTiers = [1];
            this.deliveredBriquettes = 0;
            this.deliveredPlates = 0;
            this.buildingsPlacedCount = {};
            this.claimedSectorsCount = 0;
            this.resetOnboarding();
        },
    },
});
