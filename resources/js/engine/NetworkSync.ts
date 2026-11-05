import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import axios from 'axios';
import { Container } from 'pixi.js';
import { RemotePlayerEntity } from './entities/RemotePlayerEntity';
import type { DirtSystem } from './DirtSystem';
import type { GridSystem } from './GridSystem';
import type { BuildingType, Direction } from './entities/BuildingEntity';

export interface MovementPacket {
    t: 'm';
    p: string;
    x: number;
    y: number;
    a: number; // angle in radians
}

export interface SweepPacket {
    t: 's';
    p: string;
    r: number;
    pts: [number, number][];
}

export interface BuildPacket {
    t: 'b';
    p: string;
    gx: number;
    gy: number;
    type: BuildingType | 'none';
    dir: Direction;
}

export interface NetworkSyncOptions {
    roomCode: string;
    dirtSystem: DirtSystem;
    gridSystem: GridSystem;
    container: Container;
    onMemberCountChange?: (count: number) => void;
    onConnectionChange?: (connected: boolean) => void;
}

export class NetworkSync {
    public roomCode: string;
    public localPlayerId: string;
    public localPlayerName: string;

    private echo: Echo<'reverb'> | null = null;
    private channel: any = null;
    private isConnected: boolean = false;

    private dirtSystem: DirtSystem;
    private gridSystem: GridSystem;
    public remotePlayersContainer: Container;
    public remotePlayers: Map<string, RemotePlayerEntity> = new Map();

    private onMemberCountChange?: (count: number) => void;
    private onConnectionChange?: (connected: boolean) => void;

    // Movement throttling (50ms = 20 Hz)
    private moveTimer: number = 0;
    private readonly moveInterval: number = 0.05;
    private lastSentPos: { x: number; y: number; a: number } | null = null;

    // Sweeping batching (100ms = 10 Hz)
    private sweepTimer: number = 0;
    private readonly sweepInterval: number = 0.1;
    private pendingSweepPoints: [number, number][] = [];
    private pendingSweepRadius: number = 15;

    // Periodic Snapshot timer (60s)
    private snapshotTimer: number = 0;
    private readonly snapshotInterval: number = 60;

    constructor(options: NetworkSyncOptions) {
        this.roomCode = options.roomCode;
        this.dirtSystem = options.dirtSystem;
        this.gridSystem = options.gridSystem;
        this.remotePlayersContainer = options.container;
        this.onMemberCountChange = options.onMemberCountChange;
        this.onConnectionChange = options.onConnectionChange;

        // Persistent identity
        let storedId = localStorage.getItem('venus_player_id');
        if (!storedId) {
            storedId = 'ast_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('venus_player_id', storedId);
        }
        this.localPlayerId = storedId;
        this.localPlayerName = 'Astronaut_' + this.localPlayerId.substring(4, 8).toUpperCase();
    }

    public async connect(): Promise<void> {
        try {
            // First, fetch initial room state from backend
            await this.loadInitialRoomState();

            // Set up Pusher globally for Echo
            (window as any).Pusher = Pusher;

            const wsHost = import.meta.env.VITE_REVERB_HOST || window.location.hostname || 'localhost';
            const wsPort = Number(import.meta.env.VITE_REVERB_PORT || 8080);
            const scheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
            const appKey = import.meta.env.VITE_REVERB_APP_KEY || 'wenus_cleaner_key';

            this.echo = new Echo({
                broadcaster: 'reverb',
                key: appKey,
                wsHost: wsHost,
                wsPort: wsPort,
                wssPort: wsPort,
                forceTLS: scheme === 'https',
                enabledTransports: ['ws', 'wss'],
                authEndpoint: '/broadcasting/auth',
                auth: {
                    headers: {
                        'X-Player-Id': this.localPlayerId,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            });

            const channelName = `presence-room.${this.roomCode}`;
            this.channel = this.echo.join(channelName);

            this.channel
                .here((members: Array<{ id: string; name: string }>) => {
                    this.isConnected = true;
                    this.onConnectionChange?.(true);
                    this.onMemberCountChange?.(members.length);

                    for (const member of members) {
                        if (String(member.id) !== this.localPlayerId) {
                            this.addRemotePlayer(String(member.id), member.name);
                        }
                    }
                })
                .joining((member: { id: string; name: string }) => {
                    if (String(member.id) !== this.localPlayerId) {
                        this.addRemotePlayer(String(member.id), member.name);
                    }
                    this.updateMemberCount();
                })
                .leaving((member: { id: string }) => {
                    this.removeRemotePlayer(String(member.id));
                    this.updateMemberCount();
                })
                .listenForWhisper('movement', (data: MovementPacket) => {
                    if (data.p === this.localPlayerId) return;
                    let remote = this.remotePlayers.get(data.p);
                    if (!remote) {
                        remote = this.addRemotePlayer(data.p, 'Astronaut_' + data.p.substring(0, 4));
                    }
                    remote.setTargetPosition(data.x, data.y, data.a);
                })
                .listenForWhisper('sweep', (data: SweepPacket) => {
                    if (data.p === this.localPlayerId) return;
                    this.handleRemoteSweep(data);
                })
                .listenForWhisper('build', (data: BuildPacket) => {
                    if (data.p === this.localPlayerId) return;
                    this.handleRemoteBuild(data);
                });

        } catch (err) {
            console.warn('[NetworkSync] Could not establish WebSocket connection to Reverb:', err);
            this.isConnected = false;
            this.onConnectionChange?.(false);
        }
    }

    private async loadInitialRoomState(): Promise<void> {
        try {
            const res = await axios.get(`/api/rooms/${this.roomCode}`);
            if (res.data?.success && res.data.room) {
                const room = res.data.room;
                const state = res.data.live_state || room.state;
                if (state?.grid_data && Array.isArray(state.grid_data)) {
                    this.gridSystem.loadBuildings(state.grid_data);
                }
            }
        } catch (err) {
            console.warn('[NetworkSync] Failed to fetch initial room state from API:', err);
        }
    }

    private addRemotePlayer(id: string, name: string): RemotePlayerEntity {
        let player = this.remotePlayers.get(id);
        if (player) return player;

        player = new RemotePlayerEntity(id, name, 1024, 1024);
        this.remotePlayers.set(id, player);
        this.remotePlayersContainer.addChild(player.container);
        return player;
    }

    private removeRemotePlayer(id: string): void {
        const player = this.remotePlayers.get(id);
        if (player) {
            this.remotePlayersContainer.removeChild(player.container);
            player.destroy();
            this.remotePlayers.delete(id);
        }
    }

    private updateMemberCount(): void {
        // Local player + remote players
        this.onMemberCountChange?.(this.remotePlayers.size + 1);
    }

    private handleRemoteSweep(data: SweepPacket): void {
        const player = this.remotePlayers.get(data.p);
        if (player) {
            player.triggerSweepAnimation(data.r);
        }

        if (data.pts && data.pts.length > 0) {
            for (let i = 0; i < data.pts.length; i++) {
                const pt = data.pts[i];
                if (i === 0) {
                    this.dirtSystem.sweepPoint(pt[0], pt[1], data.r);
                } else {
                    const prev = data.pts[i - 1];
                    this.dirtSystem.sweepSegment(prev[0], prev[1], pt[0], pt[1], data.r);
                }
            }
        }
    }

    private handleRemoteBuild(data: BuildPacket): void {
        if (data.type === 'none') {
            this.gridSystem.removeBuilding(data.gx, data.gy);
        } else {
            this.gridSystem.placeBuilding(data.type, data.gx, data.gy, data.dir);
        }
    }

    public queueMovement(x: number, y: number, rotation: number): void {
        if (!this.isConnected || !this.channel) return;

        // Check if moved significantly or rotation changed
        if (
            !this.lastSentPos ||
            Math.hypot(x - this.lastSentPos.x, y - this.lastSentPos.y) > 1.5 ||
            Math.abs(rotation - this.lastSentPos.a) > 0.05
        ) {
            this.lastSentPos = { x, y, a: rotation };
            const packet: MovementPacket = {
                t: 'm',
                p: this.localPlayerId,
                x: Number(x.toFixed(1)),
                y: Number(y.toFixed(1)),
                a: Number(rotation.toFixed(2)),
            };
            this.channel.whisper('movement', packet);
        }
    }

    public queueSweepPoint(x: number, y: number, radius: number): void {
        this.pendingSweepPoints.push([Math.round(x), Math.round(y)]);
        this.pendingSweepRadius = radius;
    }

    public broadcastBuildingPlaced(type: BuildingType, gx: number, gy: number, dir: Direction): void {
        if (!this.channel) return;
        const packet: BuildPacket = {
            t: 'b',
            p: this.localPlayerId,
            gx,
            gy,
            type,
            dir,
        };
        this.channel.whisper('build', packet);
    }

    public broadcastBuildingRemoved(gx: number, gy: number): void {
        if (!this.channel) return;
        const packet: BuildPacket = {
            t: 'b',
            p: this.localPlayerId,
            gx,
            gy,
            type: 'none',
            dir: 'E',
        };
        this.channel.whisper('build', packet);
    }

    public update(dt: number, localPlayerPos: { x: number; y: number; rotation: number }): void {
        // 1. Interpolate remote players
        for (const remote of this.remotePlayers.values()) {
            remote.update(dt);
        }

        // 2. Throttled movement broadcast (50ms = 20 Hz)
        this.moveTimer += dt;
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            this.queueMovement(localPlayerPos.x, localPlayerPos.y, localPlayerPos.rotation);
        }

        // 3. Batched sweeping broadcast (100ms = 10 Hz)
        this.sweepTimer += dt;
        if (this.sweepTimer >= this.sweepInterval) {
            this.sweepTimer = 0;
            if (this.pendingSweepPoints.length > 0 && this.channel) {
                const packet: SweepPacket = {
                    t: 's',
                    p: this.localPlayerId,
                    r: this.pendingSweepRadius,
                    pts: this.pendingSweepPoints,
                };
                this.channel.whisper('sweep', packet);
                this.pendingSweepPoints = [];
            }
        }

        // 4. Periodic Snapshot (every 60s)
        this.snapshotTimer += dt;
        if (this.snapshotTimer >= this.snapshotInterval) {
            this.snapshotTimer = 0;
            this.sendSnapshot();
        }
    }

    public async sendSnapshot(): Promise<void> {
        try {
            const buildings = this.gridSystem.serializeBuildings();
            const stats = this.dirtSystem.getCleaningStats();

            await axios.post(`/api/rooms/${this.roomCode}/snapshot`, {
                grid_data: buildings,
                dirt_bitmask: JSON.stringify({
                    cleanedKg: stats.cleanedKg,
                    percentCleaned: stats.percentCleaned,
                }),
            });
        } catch (err) {
            console.warn('[NetworkSync] Snapshot failed:', err);
        }
    }

    public destroy(): void {
        // Final snapshot save before leaving
        this.sendSnapshot();

        if (this.channel && this.echo) {
            this.echo.leave(`presence-room.${this.roomCode}`);
        }

        for (const remote of this.remotePlayers.values()) {
            remote.destroy();
        }
        this.remotePlayers.clear();

        this.isConnected = false;
        this.channel = null;
        this.echo = null;
    }
}

