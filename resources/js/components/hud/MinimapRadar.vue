<template>
  <div
    v-show="isVisible"
    ref="widgetRef"
    class="pointer-events-auto select-none flex flex-col gap-1.5 transition-[width] duration-200 z-30"
    :class="[
      widgetPos ? 'fixed' : 'fixed bottom-4 right-[356px] md:right-[366px]',
      isExpanded ? 'w-[360px]' : 'w-[220px]'
    ]"
    :style="widgetPos ? { left: `${widgetPos.x}px`, top: `${widgetPos.y}px` } : undefined"
  >
    <!-- Tactical Radar Container -->
    <div
      class="bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-2 ring-1 ring-cyan-500/20"
      :class="{ 'ring-cyan-400/50 shadow-cyan-500/10': isDragging }"
    >
      <!-- Radar Header (Draggable handle) -->
      <div
        class="flex items-center justify-between text-xs font-mono pb-1 cursor-grab active:cursor-grabbing select-none"
        :class="{ 'border-b border-slate-800 pb-1.5': !isCollapsed }"
        @pointerdown="startDrag"
      >
        <div class="flex items-center gap-1.5 text-cyan-400 font-bold tracking-wider">
          <span class="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>📡 RADAR</span>
          <span class="text-[9px] text-slate-500 font-normal">⋮⋮</span>
        </div>
        <div class="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span class="text-amber-300 font-bold">{{ claimedCount }} / {{ totalSectors }}</span>
          <!-- Expand/Collapse Button (Default collapsed) -->
          <button
            type="button"
            @click.stop="toggleCollapse"
            class="text-slate-300 hover:text-white px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 transition cursor-pointer font-bold"
          >
            {{ isCollapsed ? '+ Rozwiń' : '− Zwiń' }}
          </button>
          <!-- Close Button -->
          <button
            type="button"
            title="Ukryj radar"
            @click.stop="isVisible = false"
            class="text-slate-500 hover:text-rose-400 px-1 py-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Radar Canvas Display & Footer Telemetry (Hidden when collapsed) -->
      <template v-if="!isCollapsed">
        <div
          class="w-full bg-slate-900/90 rounded-xl overflow-hidden relative border border-slate-800 flex items-center justify-center shadow-inner"
          :style="{ height: isExpanded ? '200px' : '110px' }"
        >
          <canvas
            ref="radarCanvas"
            class="w-full h-full block"
            :width="isExpanded ? 340 : 200"
            :height="isExpanded ? 200 : 110"
          ></canvas>

          <!-- Scanning Beam Sweep Overlay -->
          <div class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-pulse opacity-40"></div>
        </div>

        <!-- Footer Telemetry -->
        <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
          <!-- Thermal Indicator -->
          <div class="flex items-center gap-1 font-semibold" :class="isOverheating ? 'text-rose-400 animate-pulse' : 'text-slate-300'">
            <span>{{ isOverheating ? '🔥' : '🌡️' }}</span>
            <span>{{ temperature }}°C</span>
            <span v-if="overheatPercent > 0" class="text-rose-400">({{ overheatPercent }}%)</span>
          </div>

          <!-- Relics Excavated / Clickable to view Achievements -->
          <button
            type="button"
            @click="openExplorationAchievements"
            class="flex items-center gap-1 text-amber-300 hover:text-amber-200 transition cursor-pointer"
            title="Kliknij, aby otworzyć osiągnięcia eksploracyjne"
          >
            <span>🏺</span>
            <span class="font-bold">{{ analyzedRelics }} / 6 RELIKTÓW</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useAchievementStore } from '@/stores/useAchievementStore';

export interface MinimapSector {
  id: string;
  cx: number;
  cy: number;
  isClaimed: boolean;
  cleanPct: number;
}

export interface MinimapCrater {
  x: number;
  y: number;
  radius: number;
  hasLava?: boolean;
  name?: string;
  isDiscovered?: boolean;
}

export interface MinimapGeyser {
  x: number;
  y: number;
  radius: number;
}

export interface MinimapRelic {
  x: number;
  y: number;
  isUncovered: boolean;
  isAnalyzed: boolean;
}

const props = withDefaults(
  defineProps<{
    worldWidth?: number;
    worldHeight?: number;
    playerX?: number;
    playerY?: number;
    playerRotation?: number;
    temperature?: number;
    overheatPercent?: number;
    sectors?: MinimapSector[];
    craters?: MinimapCrater[];
    geysers?: MinimapGeyser[];
    relics?: MinimapRelic[];
    bots?: Array<{ x: number; y: number }>;
    claimedCount?: number;
    totalSectors?: number;
    analyzedRelics?: number;
  }>(),
  {
    worldWidth: 6144,
    worldHeight: 6144,
    playerX: 3072,
    playerY: 3072,
    playerRotation: 0,
    temperature: 460,
    overheatPercent: 0,
    sectors: () => [],
    craters: () => [],
    geysers: () => [],
    relics: () => [],
    bots: () => [],
    claimedCount: 0,
    totalSectors: 114,
    analyzedRelics: 0,
  }
);

// Visibility state
const isVisible = ref(true);

// Collapsed state (Default minimized to narrow top bar per Spec Point 6)
const isCollapsed = ref(true);

// Expand state (Only when radar is opened)
const isExpanded = ref(false);

const achievementStore = useAchievementStore();
const openExplorationAchievements = () => {
  achievementStore.openModal('exploration');
};

const widgetRef = ref<HTMLDivElement | null>(null);
const radarCanvas = ref<HTMLCanvasElement | null>(null);
const isOverheating = ref(false);

// Draggable Widget Position
const widgetPos = ref<{ x: number; y: number } | null>(null);
const isDragging = ref(false);
let startPointerX = 0;
let startPointerY = 0;
let startWidgetX = 0;
let startWidgetY = 0;

function startDrag(e: PointerEvent) {
  if ((e.target as HTMLElement).tagName === 'BUTTON') return;
  e.preventDefault();

  const el = widgetRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  startWidgetX = rect.left;
  startWidgetY = rect.top;
  startPointerX = e.clientX;
  startPointerY = e.clientY;

  if (!widgetPos.value) {
    widgetPos.value = { x: rect.left, y: rect.top };
  }

  isDragging.value = true;
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);
}

function onDragMove(e: PointerEvent) {
  if (!isDragging.value) return;
  const dx = e.clientX - startPointerX;
  const dy = e.clientY - startPointerY;

  const el = widgetRef.value;
  const w = el ? el.offsetWidth : 220;
  const h = el ? el.offsetHeight : 160;

  const clampedX = Math.max(10, Math.min(window.innerWidth - w - 10, startWidgetX + dx));
  const clampedY = Math.max(10, Math.min(window.innerHeight - h - 10, startWidgetY + dy));

  widgetPos.value = { x: clampedX, y: clampedY };
}

function onDragEnd() {
  isDragging.value = false;
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);
}

watch(
  () => props.overheatPercent,
  (pct) => {
    isOverheating.value = (pct ?? 0) > 15;
  }
);

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
  if (!isCollapsed.value) {
    requestAnimationFrame(drawRadar);
  }
}

function toggleExpand() {
  isExpanded.value = !isExpanded.value;
  requestAnimationFrame(drawRadar);
}

function drawRadar() {
  const canvas = radarCanvas.value;
  if (!canvas || !isVisible.value) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Clear radar backdrop
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, w, h);

  const scaleX = w / props.worldWidth;
  const scaleY = h / props.worldHeight;

  // 1. Draw Diamond Sectors
  const hw = (512 / 2) * scaleX;
  const hh = (512 / 2) * scaleY;

  for (const s of props.sectors) {
    const cx = s.cx * scaleX;
    const cy = s.cy * scaleY;

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();

    if (s.isClaimed) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'; // Sky blue claimed
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (s.cleanPct > 10) {
      const alpha = Math.min(0.4, (s.cleanPct / 100) * 0.4);
      ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`; // Amber in progress
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // 2. Draw Planetary Craters (Kaldery lawowe z energią geotermalną vs Zimne leje bazaltowe - tylko ODSŁONIĘTE!)
  for (const crater of props.craters) {
    if (crater.isDiscovered === false) continue; // Krater pojawia się na minimapie dopiero po zebraniu pyłu!

    const cx = crater.x * scaleX;
    const cy = crater.y * scaleY;
    const r = Math.max(2, crater.radius * scaleX);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);

    if (crater.hasLava) {
      // Gorąca kaldera magmowa: wrząca lawa + zasilanie geotermalne (+80 kW)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fill();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1.2, r * 0.42), 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
    } else {
      // Zimny wygasły lej bazaltowy: bezpieczne ukształtowanie terenu
      ctx.fillStyle = 'rgba(30, 41, 59, 0.55)';
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  // 3. Draw Venera Relic Probes (Visible on radar ONLY after being uncovered from dust)
  for (const relic of props.relics) {
    if (!relic.isUncovered && !relic.isAnalyzed) continue; // Nie zdradzaj lokalizacji zasypanych skarbów!

    const rx = relic.x * scaleX;
    const ry = relic.y * scaleY;

    ctx.beginPath();
    ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
    if (relic.isAnalyzed) {
      ctx.fillStyle = '#10b981'; // Emerald analyzed
    } else {
      ctx.fillStyle = '#fbbf24'; // Amber discovered
    }
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // 4. Draw Base Depot
  const depotX = 200 * scaleX;
  const depotY = 200 * scaleY;
  const depotW = 96 * scaleX;
  const depotH = 96 * scaleY;
  ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
  ctx.fillRect(depotX, depotY, depotW, depotH);
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 1;
  ctx.strokeRect(depotX, depotY, depotW, depotH);

  // 5. Draw Automated Sweep-Bots
  for (const bot of props.bots) {
    const bx = bot.x * scaleX;
    const by = bot.y * scaleY;
    ctx.beginPath();
    ctx.arc(bx, by, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
  }

  // 6. Player (Bright Green Triangle with rotation)
  const px = props.playerX * scaleX;
  const py = props.playerY * scaleY;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(props.playerRotation);

  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.lineTo(-4, -3.5);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-4, 3.5);
  ctx.closePath();
  ctx.fillStyle = '#22c55e';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

let animFrameId: number;
function loop() {
  drawRadar();
  animFrameId = requestAnimationFrame(loop);
}

onMounted(() => {
  animFrameId = requestAnimationFrame(loop);
});

onUnmounted(() => {
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);
  cancelAnimationFrame(animFrameId);
});
</script>
