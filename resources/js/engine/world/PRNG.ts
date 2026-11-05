/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32).
 * Allows repeatable procedural generation across clients and seeds.
 */
export class PRNG {
    private state: number;
    public readonly initialSeed: number;

    constructor(seed: number = 42) {
        this.initialSeed = seed | 0;
        this.state = this.initialSeed;
    }

    /**
     * Resets generator to initial seed.
     */
    public reset(): void {
        this.state = this.initialSeed;
    }

    /**
     * Returns pseudo-random float in [0, 1).
     */
    public next(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Returns pseudo-random float in [min, max).
     */
    public range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    /**
     * Returns pseudo-random integer in [min, max] inclusive.
     */
    public int(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }

    /**
     * Returns boolean with given probability (0.0 - 1.0).
     */
    public chance(probability: number): boolean {
        return this.next() < probability;
    }

    /**
     * Picks random element from array.
     */
    public choice<T>(items: readonly T[]): T {
        if (items.length === 0) {
            throw new Error('Cannot pick from empty array');
        }
        return items[this.int(0, items.length - 1)];
    }
}

