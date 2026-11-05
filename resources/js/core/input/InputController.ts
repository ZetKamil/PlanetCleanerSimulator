/**
 * Planet Cleaner Simulator - Input Controller Abstraction
 * Headless controller supporting:
 *  - PC Keyboard (WASD, Arrows, Shift boost, Space)
 *  - Mouse / Raycast pointer
 *  - Mobile Virtual Joystick (touch dx, dy)
 *
 * All simulation systems must query this controller rather than listening to window events directly.
 */

export interface NormalizedVector2D {
    dx: number;
    dy: number;
}

export interface WorldPointer2D {
    x: number;
    y: number;
}

export class InputController {
    // Keyboard state
    private keys: Record<string, boolean> = {};

    // Pointer state
    private worldPointer: WorldPointer2D = { x: 0, y: 0 };
    private pointerResolver?: () => WorldPointer2D;

    // Mobile / Virtual Joystick state (values in range [-1.0, 1.0])
    private virtualJoystick: NormalizedVector2D = { dx: 0, dy: 0 };
    private hasVirtualJoystickInput: boolean = false;

    // Action states
    public isPointerDown: boolean = false;
    public isRightPointerDown: boolean = false;

    /**
     * Updates key state from keyboard event or headless input stream.
     */
    public setKey(code: string, pressed: boolean): void {
        this.keys[code] = pressed;
    }

    /**
     * Checks if a given key is pressed.
     */
    public isKeyPressed(code: string): boolean {
        return !!this.keys[code];
    }

    /**
     * Injects virtual joystick inputs from mobile UI touch controls.
     * @param dx -1.0 (full left) to +1.0 (full right)
     * @param dy -1.0 (full up) to +1.0 (full down)
     */
    public setVirtualJoystick(dx: number, dy: number): void {
        const len = Math.hypot(dx, dy);
        if (len > 0.05) {
            this.hasVirtualJoystickInput = true;
            const factor = len > 1.0 ? 1.0 / len : 1.0;
            this.virtualJoystick = { dx: dx * factor, dy: dy * factor };
        } else {
            this.hasVirtualJoystickInput = false;
            this.virtualJoystick = { dx: 0, dy: 0 };
        }
    }

    /**
     * Sets a custom resolver for pointer coordinates (e.g. Viewport.screenToWorld in 2D or Raycaster in 3D).
     */
    public setWorldPointerResolver(resolver: () => WorldPointer2D): void {
        this.pointerResolver = resolver;
    }

    /**
     * Explicitly sets the world pointer position.
     */
    public setWorldPointer(x: number, y: number): void {
        this.worldPointer = { x, y };
    }

    /**
     * Returns world pointer coordinates { x, y }.
     * In 2D: calculates world pixels through Viewport.
     * In 3D: calculated via THREE.Raycaster ground plane intersection (Y = 0).
     */
    public getWorldPointer(): WorldPointer2D {
        if (this.pointerResolver) {
            return this.pointerResolver();
        }
        return { ...this.worldPointer };
    }

    /**
     * Alias for getWorldPointer() to satisfy architecture requirements.
     */
    public getWorldPointerPosition(): WorldPointer2D {
        return this.getWorldPointer();
    }

    /**
     * Returns normalized movement vector { dx, dy } with maximum magnitude 1.0.
     * Combines keyboard WASD / Arrows with virtual joystick.
     */
    public getMoveVector(): NormalizedVector2D {
        if (this.hasVirtualJoystickInput) {
            return { ...this.virtualJoystick };
        }

        let dx = 0;
        let dy = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

        const length = Math.hypot(dx, dy);
        if (length > 0) {
            return {
                dx: dx / length,
                dy: dy / length,
            };
        }

        return { dx: 0, dy: 0 };
    }

    /**
     * Checks if sweeping/cleaning action is active.
     */
    public isSweeping(): boolean {
        return this.isPointerDown || !!this.keys['Space'];
    }

    /**
     * Checks if turbo boost [Shift] is active.
     */
    public isBoosting(): boolean {
        return !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    }

    /**
     * Resets all input states.
     */
    public reset(): void {
        this.keys = {};
        this.virtualJoystick = { dx: 0, dy: 0 };
        this.hasVirtualJoystickInput = false;
        this.isPointerDown = false;
        this.isRightPointerDown = false;
    }
}

