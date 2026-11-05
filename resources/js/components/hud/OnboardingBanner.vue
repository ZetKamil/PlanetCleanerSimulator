<template>
  <div>
    <!-- ============================================================== -->
    <!-- MODAL "KARTA MISJI A4": ODPRAWA KORPORACYJNA V.S.D. (Spec Point 7) -->
    <!-- ============================================================== -->
    <div
      v-if="isModalVisible"
      class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none animate-fadeIn overflow-hidden"
    >
      <!-- Stylizowany Dokument / Karta Rozkazu A4 -->
      <div
        class="bg-[#0b0f19] border-2 border-amber-500/70 rounded-2xl sm:rounded-3xl w-full max-w-[580px] max-h-[94vh] shadow-2xl overflow-hidden ring-4 ring-amber-500/20 text-slate-200 flex flex-col relative min-h-0"
      >
        <!-- Pieczęć Korporacyjna / Oznaczenie Poufności w Tle -->
        <div class="absolute top-12 right-6 pointer-events-none opacity-15 rotate-[-12deg] select-none border-4 border-amber-400 p-2 text-center rounded-xl">
          <div class="text-xs font-mono font-extrabold text-amber-300 uppercase tracking-widest">VENUS SURFACE DIVISION</div>
          <div class="text-[9px] font-mono text-amber-200">KORPO-DEKRET V.S.D.</div>
        </div>

        <!-- Nagłówek Dokumentu A4 -->
        <div class="px-4 sm:px-6 py-3 sm:py-4 bg-slate-900/90 border-b border-amber-500/40 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2.5 sm:gap-3">
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">
              📜
            </div>
            <div class="flex flex-col text-left">
              <span class="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                OFICJALNY ROZKAZ EKSPEDYCYJNY
              </span>
              <h2 class="text-sm sm:text-base font-bold text-white font-tech tracking-wide">
                {{ modalTitle }}
              </h2>
            </div>
          </div>

          <span class="text-[11px] sm:text-xs font-mono px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shrink-0">
            KROK {{ step }} / 3
          </span>
        </div>

        <!-- Treść Odprawy -->
        <div class="p-3.5 sm:p-6 flex flex-col gap-3 sm:gap-4 font-sans text-xs sm:text-sm text-slate-300 leading-relaxed overflow-y-auto min-h-0">
          <!-- Wstęp fabularny -->
          <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-amber-200/90">
            {{ modalDirectiveText }}
          </div>

          <!-- Zadania i Sterowanie -->
          <div class="space-y-2.5">
            <div
              v-for="(instruction, idx) in modalInstructions"
              :key="idx"
              class="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80"
            >
              <span class="text-base shrink-0">{{ instruction.icon }}</span>
              <div class="text-xs leading-normal">
                <strong class="text-white font-tech tracking-wide">{{ instruction.title }}:</strong>
                <span class="text-slate-300 ml-1" v-html="instruction.desc"></span>
              </div>
            </div>
          </div>

          <!-- Krok 1 Mini Pasek Urobku w Modalu -->
          <div v-if="step === 1" class="mt-1 p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div class="flex justify-between text-xs font-mono">
              <span class="text-slate-400">Pojemność początkowa zbiornika:</span>
              <span class="text-amber-300 font-bold">{{ playerStore.currentDust.toFixed(1) }} / 8.0 kg</span>
            </div>
            <div class="venus-progress-bar w-full h-2">
              <div
                class="venus-progress-bar-fill bg-gradient-to-r from-amber-500 to-amber-300"
                :style="{ width: `${Math.min(100, (playerStore.currentDust / 8) * 100)}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Stopka z Dużym Przyciskiem Akcji -->
        <div class="px-4 sm:px-6 py-2.5 sm:py-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <button
            @click="skipTutorial"
            class="text-[11px] font-mono text-slate-400 hover:text-slate-200 transition underline cursor-pointer"
          >
            Pomiń procedury korporacyjne
          </button>

          <button
            @click="confirmStepModal"
            class="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-mono font-bold transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            :class="confirmBtnClass"
          >
            <span>{{ confirmBtnIcon }}</span>
            <span>{{ confirmBtnText }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- KOMPAKTOWY PASEK CELU U GÓRY EKRANU (Gdy modal jest zatwierdzony) -->
    <!-- ============================================================== -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform -translate-y-6 opacity-0 scale-95"
      enter-to-class="transform translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100 scale-100"
      leave-to-class="transform -translate-y-6 opacity-0 scale-95"
    >
      <div
        v-if="step > 0 && !isModalVisible"
        class="fixed top-14 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[92vw] sm:w-[520px] select-none pointer-events-auto cursor-pointer"
        @click="reopenModal"
        title="Kliknij, aby ponownie wyświetlić Kartę Zlecenia A4"
      >
        <div
          class="venus-panel p-2.5 px-4 shadow-2xl relative overflow-hidden backdrop-blur-md transition-all flex items-center justify-between border-amber-500/50 bg-slate-950/80"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-base">{{ stepIcon }}</span>
            <div class="flex flex-col min-w-0">
              <span class="text-[9px] font-mono font-bold text-amber-400 uppercase">
                ZADANIE V.S.D. (KROK {{ step }}/3) • [KLIKNIJ ABY ROZWINĄĆ KARTĘ]
              </span>
              <span class="text-xs font-bold text-white truncate font-tech">
                {{ bannerSummary }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              KARTA MISJI
            </span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue';
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const step = computed(() => gameStore.onboardingStep);

const isModalVisible = computed(() => {
  if (step.value <= 0) return false;
  return !gameStore.acknowledgedOnboardingSteps.includes(step.value);
});

// Sync modal visibility with store for pausing
watch(
  isModalVisible,
  (visible) => {
    gameStore.isOnboardingModalOpen = visible;
  },
  { immediate: true }
);

onMounted(() => {
  if (isModalVisible.value) {
    gameStore.isOnboardingModalOpen = true;
  }
});

const modalTitle = computed(() => {
  switch (step.value) {
    case 1: return 'DYREKTYWA V.S.D. #01: Pierwsze Oczyszczanie';
    case 2: return 'DYREKTYWA V.S.D. #02: Zbiornik Pełny - Zrzut w Bazie';
    case 3: return 'DYREKTYWA V.S.D. #03: Autoryzacja Przemysłowa';
    default: return '';
  }
});

const modalDirectiveText = computed(() => {
  switch (step.value) {
    case 1:
      return 'Oficjalny przydział roboczy: Inicjalizacja podwozia łazika i zebranie pierwszej partii pyłu bazaltowego (8 kg) z powierzchni Wenus.';
    case 2:
      return 'Procedura zrzutu urobku: Zbiornik łazika osiągnął limit wagowy (8 kg). Wyładunek w Bazie Centralnej wygeneruje pierwsze kredyty ekspedycyjne.';
    case 3:
      return 'Autoryzacja przemysłowa: Pierwszy zarobek odblokował dostęp do Sklepu Narzędziowego [C] oraz kontraktów korporacyjnych.';
    default:
      return '';
  }
});

const modalInstructions = computed(() => {
  switch (step.value) {
    case 1:
      return [
        {
          icon: '🕹️',
          title: 'STEROWANIE POJAZDEM',
          desc: 'Użyj klawiszy <kbd class="px-1 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px]">W</kbd>/<kbd class="px-1 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px]">S</kbd> (gaz / wsteczny) oraz <kbd class="px-1 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px]">A</kbd>/<kbd class="px-1 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px]">D</kbd> (skręt kół), lub płynnie naprowadzaj pojazd kursorem myszy.'
        },
        {
          icon: '🧹',
          title: 'ZGADNIANIE PYŁU',
          desc: 'Wciśnij <kbd class="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">LPM</kbd> lub <kbd class="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">Spację</kbd>, aby uruchomić przedni lemiesz. Zbieraj pył bezpośrednio przed zderzakiem pojazdu!'
        },
        {
          icon: '⚡',
          title: 'TEMPOMAT',
          desc: 'Klawisz <kbd class="px-1 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[10px]">Q</kbd> włącza tempomat (stała prędkość w przód bez trzymania gazu).'
        }
      ];
    case 2:
      return [
        {
          icon: '⚠️',
          title: 'ZASOBNIK PRZEPEŁNIONY',
          desc: 'Pojemność startowa wynosi 8.0 kg. Dalsze zgarnianie nie przyniesie urobku bez uprzedniego zrzutu.'
        },
        {
          icon: '🧭',
          title: 'NAWIGACJA DO BAZY',
          desc: 'Kieruj się w stronę <strong>żółtej strzałki nawigacyjnej</strong> pod kołami łazika – wskazuje drogę do centralnej Bazy.'
        },
        {
          icon: '💰',
          title: 'ROZŁADUNEK I SPRZEDAŻ',
          desc: 'Wjedź na platformę Bazy i przytrzymaj <kbd class="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[10px]">Spację</kbd>, aby sprzedać pył za gotówkę.'
        }
      ];
    case 3:
      return [
        {
          icon: '🛒',
          title: 'CENTRUM DOWODZENIA [C]',
          desc: 'Wciśnij <kbd class="px-1 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px]">C</kbd> i przejdź do zakładki <strong>Wyposażenie [3]</strong>, aby kupić Szczotkę Kompozytową ($4) lub większy plecak.'
        },
        {
          icon: '📜',
          title: 'KORPORACYJNE ZLECENIA V.S.D.',
          desc: 'Po lewej stronie ekranu realizuj zadania kontraktowe, aby zdobywać dodatkowe granty finansowe.'
        },
        {
          icon: '🏗️',
          title: 'AUTOMATYZACJA FABRYCZNA',
          desc: 'Wciśnij <kbd class="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">2</kbd>, aby stawiać taśmociągi, prasy brykietujące i silosy.'
        }
      ];
    default:
      return [];
  }
});

const confirmBtnText = computed(() => {
  switch (step.value) {
    case 1: return 'PRZYJMIJ ROZKAZ - ROZPOCZNIJ';
    case 2: return 'ZROZUMIAŁEM - WRACAM DO BAZY';
    case 3: return 'ZROZUMIAŁEM - DO PRACY!';
    default: return 'ZROZUMIAŁEM';
  }
});

const confirmBtnIcon = computed(() => {
  switch (step.value) {
    case 1: return '🚀';
    case 2: return '⚡';
    case 3: return '🏭';
    default: return '✓';
  }
});

const confirmBtnClass = computed(() => {
  switch (step.value) {
    case 1: return 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950';
    case 2: return 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950';
    case 3: return 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 animate-pulse';
    default: return 'bg-amber-500 text-slate-950';
  }
});

const stepIcon = computed(() => {
  switch (step.value) {
    case 1: return '🧹';
    case 2: return '🏛️';
    case 3: return '🚀';
    default: return 'ℹ️';
  }
});

const bannerSummary = computed(() => {
  switch (step.value) {
    case 1: return 'Zbierz pył przednim lemieszem do pełnego zbiornika (8 kg)';
    case 2: return 'Zbiornik pełny! Wróć do Bazy i sprzedaj pył [Spacja]';
    case 3: return 'Otwórz Centrum [C], kup lepsze narzędzie i wykonaj Zlecenia';
    default: return '';
  }
});

const confirmStepModal = () => {
  if (step.value === 3) {
    gameStore.acknowledgeOnboardingStep(3);
    gameStore.dismissOnboarding();
  } else {
    gameStore.acknowledgeOnboardingStep(step.value);
  }
};

const reopenModal = () => {
  const idx = gameStore.acknowledgedOnboardingSteps.indexOf(step.value);
  if (idx !== -1) {
    gameStore.acknowledgedOnboardingSteps.splice(idx, 1);
  }
  gameStore.isOnboardingModalOpen = true;
};

const skipTutorial = () => {
  gameStore.dismissOnboarding();
};
</script>
