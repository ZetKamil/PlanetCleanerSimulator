import { PRNG } from './PRNG';

/**
 * 2D Simplex Noise implementation with Fractional Brownian Motion (fBm).
 * Seeded deterministically via PRNG for identical terrain generation.
 */
export class SimplexNoise {
    private perm: Uint8Array = new Uint8Array(512);
    private permMod12: Uint8Array = new Uint8Array(512);

    // Skewing and unskewing factors for 2D
    private static readonly F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    private static readonly G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    // 2D gradient vectors
    private static readonly GRAD2: ReadonlyArray<[number, number]> = [
        [1, 1], [-1, 1], [1, -1], [-1, -1],
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [-1, 1], [1, -1], [-1, -1],
    ];

    constructor(seed: number = 42) {
        this.reseed(seed);
    }

    /**
     * Reseeds the permutation table using PRNG.
     */
    public reseed(seed: number): void {
        const prng = new PRNG(seed);
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }

        // Fisher-Yates shuffle
        for (let i = 255; i > 0; i--) {
            const j = prng.int(0, i);
            const temp = p[i];
            p[i] = p[j];
            p[j] = temp;
        }

        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }

    /**
     * Samples 2D simplex noise at (x, y). Returns value in [-1, 1].
     */
    public noise2D(xin: number, yin: number): number {
        let n0 = 0;
        let n1 = 0;
        let n2 = 0;

        // Skew input space to determine simplex cell origin
        const s = (xin + yin) * SimplexNoise.F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);

        const t = (i + j) * SimplexNoise.G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;

        // For 2D, simplex shape is an equilateral triangle.
        // Determine which triangle we are in: (0,0) -> (1,0) -> (1,1) or (0,0) -> (0,1) -> (1,1)
        let i1 = 0;
        let j1 = 0;
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }

        const x1 = x0 - i1 + SimplexNoise.G2;
        const y1 = y0 - j1 + SimplexNoise.G2;
        const x2 = x0 - 1.0 + 2.0 * SimplexNoise.G2;
        const y2 = y0 - 1.0 + 2.0 * SimplexNoise.G2;

        // Work out hashed gradient indices of the three simplex corners
        const ii = i & 255;
        const jj = j & 255;

        const gi0 = this.permMod12[ii + this.perm[jj]];
        const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
        const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

        // Calculate contribution from each corner
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 > 0) {
            t0 *= t0;
            const g0 = SimplexNoise.GRAD2[gi0];
            n0 = t0 * t0 * (g0[0] * x0 + g0[1] * y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 > 0) {
            t1 *= t1;
            const g1 = SimplexNoise.GRAD2[gi1];
            n1 = t1 * t1 * (g1[0] * x1 + g1[1] * y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 > 0) {
            t2 *= t2;
            const g2 = SimplexNoise.GRAD2[gi2];
            n2 = t2 * t2 * (g2[0] * x2 + g2[1] * y2);
        }

        // Scale result to [-1, 1]
        return 70.0 * (n0 + n1 + n2);
    }

    /**
     * Fractal Brownian Motion (multi-octave noise).
     * @param x World coordinate X
     * @param y World coordinate Y
     * @param octaves Number of noise layers (e.g. 3)
     * @param persistence Amplitude multiplier per octave (e.g. 0.5)
     * @param lacunarity Frequency multiplier per octave (e.g. 2.0)
     * @returns Value normalized roughly to [-1, 1]
     */
    public fbm(x: number, y: number, octaves: number = 3, persistence: number = 0.5, lacunarity: number = 2.0): number {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return total / maxValue;
    }
}

