import type { WorldViewport } from '../WorldViewport';
import type { PlayerInput } from '../entities/PlayerEntity';
import { InputController, type WorldPointer2D, type NormalizedVector2D } from '../../core/input/InputController';

export interface InputManagerOptions {
    container: HTMLElement;
    viewport: WorldViewport;
    onPipette?: () => void;
    onToggleCruiseControl?: () => void;
    onToggleAltMode?: () => void;
    onToggleDevSweep?: () => void;
    onCallMule?: () => void;
    onCallOrbitalPod?: () => void;
    onToggleDebug?: () => void;
    onLeftMouseDown?: (mouseWorldPos: { x: number; y: number }) => void;
    onRightClick?: (mouseWorldPos: { x: number; y: number }) => void;
    onRightMouseDrag?: (mouseWorldPos: { x: number; y: number }) => void;
    onMouseUp?: (mouseWorldPos: { x: number; y: number }) => void;
    isModalOpen?: () => boolean;
}

/**
 * Dedykowany menedżer obsługi wejścia (klawiatura, mysz, gesty przeciągania).
 * Realizuje Single Responsibility Principle, odciążając główny silnik GameEngine.
 */
export class InputManager {
    private container: HTMLElement;
    private viewport: WorldViewport;

    /**
     * Headless core input controller.
     * Manages normalized vectors, virtual joysticks, and pointer abstraction.
     */
    public readonly controller: InputController = new InputController();

    public keys: Record<string, boolean> = {};
    public isMouseDown: boolean = false;
    public isRightMouseDown: boolean = false;
    public mouseScreenPos: { x: number; y: number } = { x: 0, y: 0 };

    // Smart Drag-to-Build State
    public isDraggingConveyor: boolean = false;
    public dragStartPos: { gx: number; gy: number } | null = null;

    private onPipette?: () => void;
    private onToggleCruiseControl?: () => void;
    private onToggleAltMode?: () => void;
    private onToggleDevSweep?: () => void;
    private onCallMule?: () => void;
    private onCallOrbitalPod?: () => void;
    private onToggleDebug?: () => void;
    private onLeftMouseDown?: (mouseWorldPos: { x: number; y: number }) => void;
    private onRightClick?: (mouseWorldPos: { x: number; y: number }) => void;
    private onRightMouseDrag?: (mouseWorldPos: { x: number; y: number }) => void;
    private onMouseUp?: (mouseWorldPos: { x: number; y: number }) => void;
    private isModalOpen?: () => boolean;

    // Bound listeners for clean removal
    private boundOnKeyDown: (e: KeyboardEvent) => void;
    private boundOnKeyUp: (e: KeyboardEvent) => void;
    private boundOnMouseDown: (e: MouseEvent) => void;
    private boundOnMouseUp: (e: MouseEvent) => void;
    private boundOnMouseMove: (e: MouseEvent) => void;
    private boundOnWheel: (e: WheelEvent) => void;
    private boundOnContextMenu: (e: MouseEvent) => void;

    constructor(options: InputManagerOptions) {
        this.container = options.container;
        this.viewport = options.viewport;
        this.onPipette = options.onPipette;
        this.onToggleCruiseControl = options.onToggleCruiseControl;
        this.onToggleAltMode = options.onToggleAltMode;
        this.onToggleDevSweep = options.onToggleDevSweep;
        this.onCallMule = options.onCallMule;
        this.onCallOrbitalPod = options.onCallOrbitalPod;
        this.onToggleDebug = options.onToggleDebug;
        this.onLeftMouseDown = options.onLeftMouseDown;
        this.onRightClick = options.onRightClick;
        this.onRightMouseDrag = options.onRightMouseDrag;
        this.onMouseUp = options.onMouseUp;
        this.isModalOpen = options.isModalOpen;

        this.boundOnKeyDown = this.handleKeyDown.bind(this);
        this.boundOnKeyUp = this.handleKeyUp.bind(this);
        this.boundOnMouseDown = this.handleMouseDown.bind(this);
        this.boundOnMouseUp = this.handleMouseUp.bind(this);
        this.boundOnMouseMove = this.handleMouseMove.bind(this);
        this.boundOnWheel = this.handleWheel.bind(this);
        this.boundOnContextMenu = this.handleContextMenu.bind(this);

        this.controller.setWorldPointerResolver(() =>
            this.viewport.screenToWorld(this.mouseScreenPos.x, this.mouseScreenPos.y)
        );

        this.initListeners();
    }

    private initListeners(): void {
        window.addEventListener('keydown', this.boundOnKeyDown);
        window.addEventListener('keyup', this.boundOnKeyUp);
        this.container.addEventListener('mousedown', this.boundOnMouseDown);
        window.addEventListener('mouseup', this.boundOnMouseUp);
        window.addEventListener('mousemove', this.boundOnMouseMove);
        this.container.addEventListener('wheel', this.boundOnWheel, { passive: false });
        this.container.addEventListener('contextmenu', this.boundOnContextMenu);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        this.keys[e.code] = true;
        this.controller.setKey(e.code, true);

        if (e.code === 'KeyG') {
            this.onCallMule?.();
        } else if (e.code === 'KeyB') {
            this.onCallOrbitalPod?.();
        } else if (e.code === 'AltLeft' || e.code === 'AltRight') {
            e.preventDefault();
            this.onToggleAltMode?.();
        } else if (e.code === 'KeyQ') {
            this.onToggleCruiseControl?.();
            this.onPipette?.();
        } else if (e.code === 'F3' || e.code === 'Backquote') {
            e.preventDefault();
            this.onToggleDebug?.();
        } else if (e.code === 'F9') {
            e.preventDefault();
            this.onToggleDevSweep?.();
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        this.keys[e.code] = false;
        this.controller.setKey(e.code, false);
    }

    private handleMouseDown(e: MouseEvent): void {
        if (e.button === 0) {
            this.isMouseDown = true;
            this.controller.isPointerDown = true;
            const worldPos = this.getMouseWorldPos();
            this.onLeftMouseDown?.(worldPos);
        } else if (e.button === 2) {
            this.isRightMouseDown = true;
            this.controller.isRightPointerDown = true;
            const worldPos = this.getMouseWorldPos();
            this.onRightClick?.(worldPos);
        }
    }

    private handleContextMenu(e: MouseEvent): void {
        e.preventDefault();
    }

    private handleMouseUp(e: MouseEvent): void {
        if (e.button === 0) {
            this.isMouseDown = false;
            this.controller.isPointerDown = false;
            const worldPos = this.getMouseWorldPos();
            this.onMouseUp?.(worldPos);
        } else if (e.button === 2) {
            this.isRightMouseDown = false;
            this.controller.isRightPointerDown = false;
        }
    }

    private handleMouseMove(e: MouseEvent): void {
        const rect = this.container.getBoundingClientRect();
        this.mouseScreenPos.x = e.clientX - rect.left;
        this.mouseScreenPos.y = e.clientY - rect.top;
        if (this.isRightMouseDown) {
            const worldPos = this.getMouseWorldPos();
            this.onRightMouseDrag?.(worldPos);
        }
    }

    private handleWheel(e: WheelEvent): void {
        if (this.isModalOpen?.()) return;
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.12 : -0.12;
        this.viewport.adjustZoom(zoomDelta);
    }

    /**
     * World pointer position abstraction.
     * In 2D: calculates world pixels via viewport.
     * In 3D: Raycaster ground intersection (Y = 0).
     */
    public getWorldPointer(): WorldPointer2D {
        return this.controller.getWorldPointer();
    }

    public getWorldPointerPosition(): WorldPointer2D {
        return this.controller.getWorldPointerPosition();
    }

    /**
     * Normalized movement vector { dx, dy } for WASD / Mobile Virtual Joystick.
     */
    public getMoveVector(): NormalizedVector2D {
        return this.controller.getMoveVector();
    }

    public getMouseWorldPos(): { x: number; y: number } {
        return this.controller.getWorldPointer();
    }

    public getMovementInput(): PlayerInput {
        return {
            up: !!(this.keys['KeyW'] || this.keys['ArrowUp']),
            down: !!(this.keys['KeyS'] || this.keys['ArrowDown']),
            left: !!(this.keys['KeyA'] || this.keys['ArrowLeft']),
            right: !!(this.keys['KeyD'] || this.keys['ArrowRight']),
            boost: !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']),
            isPointerDown: this.isMouseDown,
        };
    }

    public isSweeping(): boolean {
        return this.isMouseDown || !!this.keys['Space'];
    }

    public startConveyorDrag(gx: number, gy: number): void {
        this.isDraggingConveyor = true;
        this.dragStartPos = { gx, gy };
    }

    public endConveyorDrag(): void {
        this.isDraggingConveyor = false;
        this.dragStartPos = null;
    }

    public destroy(): void {
        window.removeEventListener('keydown', this.boundOnKeyDown);
        window.removeEventListener('keyup', this.boundOnKeyUp);
        this.container.removeEventListener('mousedown', this.boundOnMouseDown);
        window.removeEventListener('mouseup', this.boundOnMouseUp);
        window.removeEventListener('mousemove', this.boundOnMouseMove);
        this.container.removeEventListener('wheel', this.boundOnWheel);
        this.container.removeEventListener('contextmenu', this.boundOnContextMenu);
    }
}

