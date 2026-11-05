import { defineStore } from 'pinia';
import { usePlayerStore } from './usePlayerStore';
import { useGameStore } from './useGameStore';

export interface CorporateContract {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    targetProgress: number;
    currentProgress: number;
    rewardCredits: number;
    rewardTierUnlock?: number;
    icon: string;
    isCompleted: boolean;
    isClaimed: boolean;
}

const INITIAL_CONTRACTS: CorporateContract[] = [
    {
        id: 'contract_01_first_sample',
        title: 'Zlecenie 01: Pierwsza Próbka Wenus',
        subtitle: 'Zbierz i zrzuć 8 kg pyłu w Terminalu Bazy',
        description: 'Korporacja V.S.D. oczekuje pierwszych próbek urobku z powierzchni Wenus. Wróć do Bazy i rozładuj zebrany pył.',
        targetProgress: 8,
        currentProgress: 0,
        rewardCredits: 3.50,
        icon: '🧹',
        isCompleted: false,
        isClaimed: false,
    },
    {
        id: 'contract_02_tool_upgrade',
        title: 'Zlecenie 02: Rozruch Oprzyrządowania',
        subtitle: 'Kup pierwsze ulepszenie w Sklepie [C]',
        description: 'Szczoteczka to za mało na warunki Wenus. Otwórz Centrum Dowodzenia [C] i wyposaż Szczotkę Kompozytową ($4) lub Wzmocniony Zasobnik ($5).',
        targetProgress: 1,
        currentProgress: 0,
        rewardCredits: 12.00,
        icon: '🛒',
        isCompleted: false,
        isClaimed: false,
    },
    {
        id: 'contract_03_first_infrastructure',
        title: 'Zlecenie 03: Podwaliny Przemysłu',
        subtitle: 'Zbuduj Generator Słoneczny i Magazyn Silo',
        description: 'Rozpocznij tworzenie zautomatyzowanego węzła logistycznego. Postaw generator prądu ($45) oraz silos urobku ($60).',
        targetProgress: 2,
        currentProgress: 0,
        rewardCredits: 80,
        icon: '⚡',
        isCompleted: false,
        isClaimed: false,
    },
    {
        id: 'contract_04_first_briquette',
        title: 'Zlecenie 04: Czarny Brykiet',
        subtitle: 'Postaw Prasę Urobku i wytwórz pierwszy Brykiet',
        description: 'Przetwarzanie podnosi wartość urobku ponad dwukrotnie! Podłącz Prasę ($75) do silosu za pomocą taśmociągu ($2).',
        targetProgress: 1,
        currentProgress: 0,
        rewardCredits: 120,
        icon: '🧱',
        isCompleted: false,
        isClaimed: false,
    },
    {
        id: 'contract_05_space_elevator_tier2',
        title: 'Zlecenie 05: Winda Kosmiczna – Faza I',
        subtitle: 'Dostarcz 10 Brykietów Bazaltowych do Bazy',
        description: 'Wyślij pierwszą partię prefabrykatów do terminala orbitalnego. Odblokuje to Fazy Przemysłowej Tier 2!',
        targetProgress: 10,
        currentProgress: 0,
        rewardCredits: 200,
        rewardTierUnlock: 2,
        icon: '🚀',
        isCompleted: false,
        isClaimed: false,
    },
    {
        id: 'contract_06_smelter_production',
        title: 'Zlecenie 06: Hutnictwo Planetarne',
        subtitle: 'Postaw Piec Hutniczy i wytwórz Płytę Kompozytową ($75)',
        description: 'Zaawansowana metalurgia wenusjańska. Przetapiaj brykiety w lśniące tytanowe płyty kompozytowe.',
        targetProgress: 1,
        currentProgress: 0,
        rewardCredits: 250,
        icon: '🔥',
        isCompleted: false,
        isClaimed: false,
    },
    {
        id: 'contract_07_sector_dominance',
        title: 'Zlecenie 07: Ekspedycja Przemysłowa',
        subtitle: 'Oczyszcz 3 dowolne sektory mapy w 100%',
        description: 'Odsłoń pierwotną skorupę Wenus, zdobywając stałą premię +10% do wartości skupu za każdy przejęty sektor.',
        targetProgress: 3,
        currentProgress: 0,
        rewardCredits: 400,
        icon: '🌍',
        isCompleted: false,
        isClaimed: false,
    },
];

const STORAGE_KEY = 'wenuscleaner_contracts_v1';

export const useContractStore = defineStore('contracts', {
    state: () => ({
        contracts: JSON.parse(JSON.stringify(INITIAL_CONTRACTS)) as CorporateContract[],
        activeContractIndex: 0,
        isContractWidgetVisible: true,
        lastClaimedNotification: null as string | null,
    }),

    getters: {
        currentContract: (state): CorporateContract | null => {
            // Returns first uncompleted or unclaimed contract
            const found = state.contracts.find(c => !c.isClaimed);
            return found ?? state.contracts[state.contracts.length - 1];
        },
        hasUnclaimedRewards: (state): boolean => {
            return state.contracts.some(c => c.isCompleted && !c.isClaimed);
        },
        completedCount: (state): number => {
            return state.contracts.filter(c => c.isClaimed).length;
        },
        totalCount: (state): number => {
            return state.contracts.length;
        },
    },

    actions: {
        init() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        for (let i = 0; i < this.contracts.length; i++) {
                            const p = parsed.find((item: any) => item.id === this.contracts[i].id);
                            if (p) {
                                this.contracts[i].currentProgress = p.currentProgress;
                                this.contracts[i].isCompleted = p.isCompleted;
                                this.contracts[i].isClaimed = p.isClaimed;
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not restore contracts from localStorage', e);
            }

            // Sanitize: jeśli gracz startuje na świeżo (0 kg i 0 kredytów), a w localStorage wiszą stare ukończone zlecenia, zresetuj je
            const playerStore = usePlayerStore();
            const gameStore = useGameStore();
            if (playerStore.credits === 0 && gameStore.cleanedKg === 0 && !localStorage.getItem('venus_cleaner_save_v1')) {
                const c1 = this.contracts.find(c => c.id === 'contract_01_first_sample');
                if (c1 && c1.isClaimed) {
                    this.resetContracts();
                    return;
                }
            }

            this.checkContractProgress();
        },

        save() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.contracts));
            } catch (e) {
                // ignore
            }
        },

        checkContractProgress() {
            const playerStore = usePlayerStore();
            const gameStore = useGameStore();

            for (const contract of this.contracts) {
                if (contract.isClaimed) continue;

                if (contract.id === 'contract_01_first_sample') {
                    contract.currentProgress = Math.min(contract.targetProgress, Math.round(gameStore.cleanedKg));
                    contract.isCompleted = contract.currentProgress >= contract.targetProgress;
                } else if (contract.id === 'contract_02_tool_upgrade') {
                    const hasTool = playerStore.purchasedToolIds.length > 1 || playerStore.currentTool.id !== 'tool-t1-scraper';
                    const hasBackpack = playerStore.purchasedBackpackIds.length > 1 || playerStore.currentBackpack.id !== 'backpack-t1-starter';
                    contract.currentProgress = (hasTool || hasBackpack) ? 1 : 0;
                    contract.isCompleted = contract.currentProgress >= contract.targetProgress;
                } else if (contract.id === 'contract_03_first_infrastructure') {
                    const solar = (gameStore.buildingsPlacedCount['solar'] ?? 0);
                    const silo = (gameStore.buildingsPlacedCount['silo'] ?? 0);
                    contract.currentProgress = Math.min(contract.targetProgress, (solar > 0 ? 1 : 0) + (silo > 0 ? 1 : 0));
                    contract.isCompleted = contract.currentProgress >= contract.targetProgress;
                } else if (contract.id === 'contract_04_first_briquette') {
                    const packager = (gameStore.buildingsPlacedCount['packager'] ?? 0);
                    const briquettes = gameStore.deliveredBriquettes;
                    contract.currentProgress = (packager > 0 || briquettes > 0) ? 1 : 0;
                    contract.isCompleted = contract.currentProgress >= contract.targetProgress;
                } else if (contract.id === 'contract_05_space_elevator_tier2') {
                    contract.currentProgress = Math.min(contract.targetProgress, gameStore.deliveredBriquettes);
                    contract.isCompleted = contract.currentProgress >= contract.targetProgress;
                } else if (contract.id === 'contract_06_smelter_production') {
                    const smelter = (gameStore.buildingsPlacedCount['smelter'] ?? 0);
                    const plates = gameStore.deliveredPlates;
                    contract.currentProgress = (smelter > 0 || plates > 0) ? 1 : 0;
                    contract.isCompleted = contract.currentProgress >= contract.targetProgress;
                } else if (contract.id === 'contract_07_sector_dominance') {
                    contract.currentProgress = Math.min(contract.targetProgress, gameStore.claimedSectorsCount);
                    contract.isCompleted = contract.currentProgress >= contract.targetProgress;
                }
            }

            this.save();
        },

        claimContractReward(contractId: string): number {
            const contract = this.contracts.find(c => c.id === contractId);
            if (!contract || !contract.isCompleted || contract.isClaimed) return 0;

            const playerStore = usePlayerStore();
            const gameStore = useGameStore();

            contract.isClaimed = true;
            playerStore.addCredits(contract.rewardCredits);

            if (contract.rewardTierUnlock) {
                gameStore.unlockTier(contract.rewardTierUnlock);
            }

            gameStore.showBanner(`🎉 UKOŃCZONO ZLECENIE: ${contract.title} (+${contract.rewardCredits} CR)`, 'success', 4500);

            this.lastClaimedNotification = contract.title;
            this.save();
            return contract.rewardCredits;
        },

        resetContracts() {
            this.contracts = JSON.parse(JSON.stringify(INITIAL_CONTRACTS));
            this.activeContractIndex = 0;
            this.lastClaimedNotification = null;
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {
                // ignore
            }
        },
    },
});

