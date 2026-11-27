// A model of the universe, seen from where you stand, drawn in ASCII.
//
// It opens on the real sky at this moment: the catalogued
// naked-eye stars, and the Sun, Moon and planets where they actually are.
// Then the clock accelerates. Nothing is scripted:
// planets follow their orbits, stars drift on their measured velocities, the
// Milky Way turns, Andromeda falls in, and space itself follows the standard
// model of cosmology: matter (mostly dark matter) slowing the expansion, dark
// energy speeding it up, and dark energy winning. The galaxies beyond our own
// are carried out of sight, the stars burn out one by one, and three minutes
// after the page was opened, a hundred trillion years on, the last one is gone.
//
// What is real data and what is a model:
//   real   - stars (HYG catalogue: position, distance, motion, colour),
//            Sun, Moon and planets (computed from published orbital elements),
//            the orientation of the Milky Way and where Andromeda is
//   model  - the Milky Way's and Andromeda's glow (statistical discs of
//            particles), the distant galaxies, and when each star dies
//
// The view is a camera inside the model: on a phone it follows the gyroscope,
// elsewhere you drag. Every object is splatted into a grid of character cells;
// a cell's brightness picks its glyph from RAMP and its colour tints it.

type V3 = [number, number, number]
type RGB = [number, number, number]

export interface StarData {
    // Brightest first. 9 numbers per star: x, y, z (light years, equatorial axes),
    // vx, vy, vz (light years per million years), magnitude, B-V colour
    // (null if unknown), and whether the distance is known (1/0).
    stars: (number | null)[]
    labels: [number, string][]
}

/* ---------- the clock ----------
   Model time (years from now) as a function of screen time (seconds). It
   starts at about five weeks a second, so the year turns over within moments,
   and accelerates exponentially for the first hundred seconds. It then eases
   through the ten billion years in which Andromeda arrives and the Sun dies,
   and accelerates again through the long dark, to end a hundred trillion
   years from now, when the last stars go out. */
export const TOTAL = 180
const YEAR_S = 31557600
const S1 = 100, S2 = 150
const RATE0 = 0.1 // years per second at the start
const R1 = 1e8, R2 = 6e8
const K = Math.log(R1 / RATE0) / S1
const T1 = (RATE0 / K) * (Math.exp(K * S1) - 1)
const T2 = T1 + (R1 + R2) / 2 * (S2 - S1)
const T_END = 1e14 // years from now until the last star dies
// The final stretch grows exponentially from rate R2; K3 makes it land on T_END.
const K3 = (() => {
    let lo = 0.01, hi = 2
    for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2
        if (R2 / mid * (Math.exp(mid * (TOTAL - S2)) - 1) < T_END - T2) lo = mid
        else hi = mid
    }
    return (lo + hi) / 2
})()

function clock(s: number) {
    if (s < S1) {
        const e = Math.exp(K * s)
        return { t: (RATE0 / K) * (e - 1), rate: RATE0 * e }
    }
    if (s < S2) {
        const x = s - S1, g = (R2 - R1) / (S2 - S1)
        return { t: T1 + R1 * x + g * x * x / 2, rate: R1 + g * x }
    }
    const e = Math.exp(K3 * (s - S2))
    return { t: Math.min(T_END, T2 + R2 / K3 * (e - 1)), rate: R2 * e }
}

/* ---------- cosmology ----------
   The standard model: a flat universe of matter (about 5% ordinary, 26% dark)
   and dark energy (a cosmological constant). Its size follows
   a(t) = (Om/OL)^(1/3) sinh^(2/3)(1.5 sqrt(OL) H0 t), which decelerates while
   matter dominates and then grows exponentially for ever. Density values
   are the Planck 2018 results; today is 13.8 billion years in. */
const AGE_NOW = 13.8e9
const OMEGA_M = 0.315, OMEGA_L = 1 - OMEGA_M
const ROOT_L = Math.sqrt(OMEGA_L)
// The Hubble constant (per year) that makes the universe 13.8 billion years old today.
const H0 = 2 / (3 * ROOT_L) * Math.asinh(Math.sqrt(OMEGA_L / OMEGA_M)) / AGE_NOW
// Scale factor relative to today, and the Hubble rate (per year), t years from now.
function cosmos(t: number) {
    const x = 1.5 * ROOT_L * H0 * (AGE_NOW + t)
    // ln(sinh x), kept finite when x is huge
    const lnSinh = x > 20 ? x - Math.LN2 : Math.log(Math.sinh(x))
    const a = Math.exp(Math.min(600, (Math.log(OMEGA_M / OMEGA_L) + 2 * lnSinh) / 3))
    return { a, H: H0 * ROOT_L / Math.tanh(x) }
}

/* ---------- helpers ---------- */
const clamp = (x: number, a: number, b: number) => x < a ? a : x > b ? b : x
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ss = (a: number, b: number, x: number) => {
    const t = clamp((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)
}
function rng(seed: number) {
    return () => {
        seed = seed + 0x6D2B79F5 | 0
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
        return ((t ^ t >>> 14) >>> 0) / 4294967296
    }
}
const gauss = (r: () => number) => {
    let u = 0
    while (!u) u = r()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * r())
}
const DEG = Math.PI / 180

// Star colour from its B-V index (blue-white through yellow to red).
const BV: [number, RGB][] = [[-0.3, [0.6, 0.7, 1]], [0, [0.8, 0.87, 1]], [0.3, [1, 1, 0.95]], [0.65, [1, 0.94, 0.75]],
    [1, [1, 0.8, 0.5]], [1.5, [1, 0.6, 0.38]], [2, [1, 0.45, 0.3]]]
function bvColour(bv: number): RGB {
    for (let k = 1; k < BV.length; k++) {
        const [b1, c1] = BV[k]!
        if (bv <= b1) {
            const [b0, c0] = BV[k - 1]!, u = clamp((bv - b0) / (b1 - b0), 0, 1)
            return [lerp(c0[0], c1[0], u), lerp(c0[1], c1[1], u), lerp(c0[2], c1[2], u)]
        }
    }
    return BV[BV.length - 1]![1]
}

// Galactic -> equatorial (J2000) rotation. Galactic x points at the galactic
// centre, z at the north galactic pole.
const G2E = [
    [-0.0548755604, 0.4941094279, -0.8676661490],
    [-0.8734370902, -0.4448296300, -0.1980763734],
    [-0.4838350155, 0.7469822445, 0.4559837762],
] as const

/* ---------- the solar system ----------
   Keplerian elements and their rates per century, from JPL's "Approximate
   Positions of the Planets" (Table 1, mean ecliptic and equinox of J2000):
   a (au), e, I, L, longitude of perihelion, longitude of node (degrees).
   H is the planet's brightness at 1 au from both Sun and Earth. */
interface Planet { name: string, el: number[], rate: number[], H: number, c: RGB }
const PLANETS: Planet[] = [
    { name: 'Mercury', el: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081], H: -0.6, c: [0.8, 0.78, 0.75] },
    { name: 'Venus', el: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], rate: [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418], H: -4.4, c: [1, 0.95, 0.75] },
    { name: 'Mars', el: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343], H: -1.52, c: [1, 0.45, 0.28] },
    { name: 'Jupiter', el: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106], H: -9.4, c: [1, 0.85, 0.65] },
    { name: 'Saturn', el: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], rate: [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794], H: -8.88, c: [1, 0.9, 0.6] },
    { name: 'Uranus', el: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503], rate: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589], H: -7.19, c: [0.6, 0.95, 1] },
    { name: 'Neptune', el: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], rate: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664], H: -6.87, c: [0.45, 0.55, 1] },
]
const EARTH = { el: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0], rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0] }
const OBLIQUITY = 23.43928 * DEG

// Heliocentric position (au, ecliptic axes) from elements, T centuries past J2000.
function heliocentric(el: number[], rate: number[], T: number): V3 {
    const a = el[0]! + rate[0]! * T, e = el[1]! + rate[1]! * T, I = (el[2]! + rate[2]! * T) * DEG
    const L = el[3]! + rate[3]! * T, peri = el[4]! + rate[4]! * T, node = (el[5]! + rate[5]! * T) * DEG
    const w = peri * DEG - node
    let M = ((L - peri) % 360) * DEG
    if (M > Math.PI) M -= 2 * Math.PI
    if (M < -Math.PI) M += 2 * Math.PI
    let E = M + e * Math.sin(M)
    for (let k = 0; k < 6; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E)
    const cw = Math.cos(w), sw = Math.sin(w), cn = Math.cos(node), sn = Math.sin(node), ci = Math.cos(I), si = Math.sin(I)
    return [
        (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
        (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
        sw * si * xp + cw * si * yp,
    ]
}
const eclToEq = (v: V3): V3 => [v[0], v[1] * Math.cos(OBLIQUITY) - v[2] * Math.sin(OBLIQUITY), v[1] * Math.sin(OBLIQUITY) + v[2] * Math.cos(OBLIQUITY)]
const julian = (ms: number) => ms / 86400000 + 2440587.5
// Greenwich sidereal angle (radians) at a moment.
const gmst = (ms: number) => ((280.46061837 + 360.98564736629 * (julian(ms) - 2451545)) % 360) * DEG

// The Moon's direction (low-precision series from the Astronomical Almanac).
function moonDirection(ms: number): V3 {
    const d = julian(ms) - 2451545
    const Lm = (218.316 + 13.176396 * d) * DEG, M = (134.963 + 13.064993 * d) * DEG, F = (93.272 + 13.229350 * d) * DEG
    const lon = Lm + 6.289 * DEG * Math.sin(M), lat = 5.128 * DEG * Math.sin(F)
    return eclToEq([Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)])
}

/* ---------- haptics ----------
   Android: Vibration API. iOS Safari has no Vibration API; on iOS 18+ toggling
   a native <input switch> gives a system haptic tick, used as a fallback. */
function hapticsSupported() {
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    return matchMedia('(pointer: coarse)').matches && (typeof navigator.vibrate === 'function' || ios)
}

function iosTick() {
    const l = document.createElement('label')
    l.setAttribute('aria-hidden', 'true')
    l.style.display = 'none'
    const inp = document.createElement('input')
    inp.type = 'checkbox'
    inp.setAttribute('switch', '')
    l.appendChild(inp)
    document.body.appendChild(l)
    l.click()
    l.remove()
}

/* ---------- engine ---------- */
export interface UniverseOptions {
    startAt?: number
    // Called every frame with the model's calendar year.
    onYear?: (year: number) => void
    // Called once, when the universe ends.
    onEnd?: () => void
}

export function createUniverse(canvas: HTMLCanvasElement, data: StarData, opts: UniverseOptions = {}) {
    const small = Math.min(innerWidth, innerHeight) < 700
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    const openedAt = Date.now()
    let destroyed = false

    /* ----- where the viewer is -----
       Guessed from the timezone, which puts the sky within an hour or so of
       right. If the visitor agrees (see `locate`), the browser's answer
       replaces the guess. */
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    let lat = (/^(Australia|Antarctica)|Auckland|Johannesburg|Sao_Paulo|Buenos_Aires|Santiago|Montevideo|Lima|Harare|Maputo|Windhoek|Fiji/.test(tz)
        ? -33
        : /^Africa|Kolkata|Bangkok|Singapore|Manila|Ho_Chi_Minh|Dubai|Mexico_City|Bogota|Panama|Jakarta|Honolulu/.test(tz) ? 15 : 45) * DEG
    let lon = -new Date().getTimezoneOffset() / 60 * 15 * DEG
    function locate() {
        return new Promise<boolean>((resolve) => {
            if (!navigator.geolocation) return resolve(false)
            navigator.geolocation.getCurrentPosition((pos) => {
                lat = pos.coords.latitude * DEG
                lon = pos.coords.longitude * DEG
                resolve(true)
            }, () => resolve(false) /* declined: keep the timezone guess */, { maximumAge: 3600000, timeout: 20000 })
        })
    }
    // The calendar year the page was opened in, with the fraction gone so far.
    const year0 = (() => {
        const d = new Date(openedAt), y = d.getFullYear()
        const from = new Date(y, 0, 1).getTime(), to = new Date(y + 1, 0, 1).getTime()
        return y + (openedAt - from) / (to - from)
    })()
    // East, north and up at the viewer, as equatorial vectors. `spin` is how far
    // the Earth has turned since the page opened.
    const east: V3 = [0, 1, 0], north: V3 = [0, 0, 1], up: V3 = [1, 0, 0]
    let spin = 0
    function setHorizon() {
        const lst = gmst(openedAt) + lon + spin
        east[0] = -Math.sin(lst)
        east[1] = Math.cos(lst)
        north[0] = -Math.sin(lat) * Math.cos(lst)
        north[1] = -Math.sin(lat) * Math.sin(lst)
        north[2] = Math.cos(lat)
        up[0] = Math.cos(lat) * Math.cos(lst)
        up[1] = Math.cos(lat) * Math.sin(lst)
        up[2] = Math.sin(lat)
    }

    /* ----- stars: the HYG catalogue, as it is ----- */
    const NSTAR = Math.floor(data.stars.length / 9)
    const sx = new Float32Array(NSTAR), sy = new Float32Array(NSTAR), sz = new Float32Array(NSTAR)
    const svx = new Float32Array(NSTAR), svy = new Float32Array(NSTAR), svz = new Float32Array(NSTAR)
    const sI = new Float32Array(NSTAR), sD = new Float32Array(NSTAR), sr = new Float32Array(NSTAR), sg = new Float32Array(NSTAR), sb = new Float32Array(NSTAR)
    const sMag = new Float32Array(NSTAR)
    const sName: (string | undefined)[] = []
    for (let k = 0; k < NSTAR; k++) {
        const o = k * 9, d = data.stars
        sx[k] = d[o] as number
        sy[k] = d[o + 1] as number
        sz[k] = d[o + 2] as number
        svx[k] = d[o + 3] as number
        svy[k] = d[o + 4] as number
        svz[k] = d[o + 5] as number
        // Brightness on screen goes as the square root of the light received,
        // so magnitude 6.5 is a faint dot and Sirius floods its neighbours.
        sMag[k] = d[o + 6] as number
        sI[k] = 1.2 * Math.pow(10, -0.2 * (sMag[k]! - 1))
        sD[k] = d[o + 8] ? Math.hypot(sx[k]!, sy[k]!, sz[k]!) : 0 // 0: distance unknown, so no motion
        const bv = d[o + 7]
        const c: RGB = bv == null ? [1, 1, 1] : bvColour(bv)
        sr[k] = c[0]
        sg[k] = c[1]
        sb[k] = c[2]
    }
    for (const [i, name] of data.labels) sName[i] = name

    /* ----- the Milky Way and Andromeda: statistical discs of particles -----
       Positions are galactocentric (light years). The Sun orbits 26,000 ly
       out; seen from there the disc is the band across the night sky. */
    const R0 = 26000, OMEGA0 = 2 * Math.PI / 2.3e8
    interface Disc { n: number, r: Float32Array, phi: Float32Array, z: Float32Array, ex: Float32Array, ey: Float32Array, ez: Float32Array, cr: Float32Array, cg: Float32Array, cb: Float32Array, die: Float32Array }
    function makeDisc(seed: number, n: number, scale: number): Disc {
        const r = rng(seed)
        const D: Disc = { n, r: new Float32Array(n), phi: new Float32Array(n), z: new Float32Array(n), ex: new Float32Array(n), ey: new Float32Array(n), ez: new Float32Array(n), cr: new Float32Array(n), cg: new Float32Array(n), cb: new Float32Array(n), die: new Float32Array(n) }
        for (let k = 0; k < n; k++) {
            let c: RGB
            D.phi[k] = r() * 6.2832
            if (r() < 0.2) { // bulge
                D.r[k] = Math.abs(gauss(r)) * 4000 * scale
                D.z[k] = gauss(r) * 3200 * scale
                c = [1, 0.8, 0.52]
            }
            else { // disc, with two spiral arms
                const rad = (2500 - Math.log(1 - r() * 0.985) * 11000) * scale
                D.r[k] = rad
                D.z[k] = gauss(r) * 1700 * scale
                c = r() < 0.6 ? [0.68, 0.8, 1] : r() < 0.85 ? [0.95, 0.95, 1] : r() < 0.92 ? [1, 0.45, 0.62] : [1, 0.82, 0.58]
                if (r() < 0.6) D.phi[k] = Math.floor(r() * 2) * Math.PI + Math.log(rad / (2500 * scale)) / 0.36 + gauss(r) * 0.3
            }
            D.cr[k] = c[0]
            D.cg[k] = c[1]
            D.cb[k] = c[2]
            // where this particle ends up in the elliptical galaxy left by the merger
            D.ex[k] = gauss(r) * 30000
            D.ey[k] = gauss(r) * 23000
            D.ez[k] = gauss(r) * 17000
            // When this patch of stars goes dark (log10 years from now). New stars
            // stop forming within about a trillion years; the smallest red dwarfs
            // burn for up to a hundred trillion. Blue light, from short-lived
            // stars, goes first.
            D.die[k] = c[2] > c[0] ? 10.8 + r() * 1.8 : 11.6 + 2.4 * Math.sqrt(r())
        }
        return D
    }
    const MW = makeDisc(11, small ? 8000 : 14000, 1)
    const M31 = makeDisc(23, small ? 1400 : 2200, 1.3)
    // Andromeda today: 2.5 million ly away at galactic longitude 121, latitude -22.
    const M31_U: V3 = [Math.cos(-21.57 * DEG) * Math.cos(121.17 * DEG), Math.cos(-21.57 * DEG) * Math.sin(121.17 * DEG), Math.sin(-21.57 * DEG)]
    const M31_P0: V3 = [-R0 + M31_U[0] * 2.5e6, M31_U[1] * 2.5e6, M31_U[2] * 2.5e6]
    const T_MERGE = 4.5e9
    // The Sun's place in the merged galaxy.
    const SUN_E: V3 = [-38000, 12000, 9000]

    /* ----- distant galaxies: a statistical model -----
       Fixed directions, clumped into clusters, with comoving distances (ly at
       today's scale). Their real distance is that times the scale factor. */
    const NGAL = small ? 500 : 800
    const gx = new Float32Array(NGAL), gy = new Float32Array(NGAL), gz = new Float32Array(NGAL), gchi = new Float32Array(NGAL)
    const gr = new Float32Array(NGAL), gg = new Float32Array(NGAL), gb = new Float32Array(NGAL)
    {
        const r = rng(17), centres: V3[] = []
        for (let k = 0; k < 40; k++) {
            const z = r() * 2 - 1, a = r() * 6.2832, c = Math.sqrt(1 - z * z)
            centres.push([c * Math.cos(a), c * Math.sin(a), z])
        }
        const palette: RGB[] = [[0.7, 0.8, 1], [1, 0.86, 0.62], [1, 0.66, 0.5], [0.95, 0.95, 1]]
        for (let k = 0; k < NGAL; k++) {
            let x: number, y: number, z: number
            if (r() < 0.6) {
                const c = centres[(r() * centres.length) | 0]!
                x = c[0] + gauss(r) * 0.09
                y = c[1] + gauss(r) * 0.09
                z = c[2] + gauss(r) * 0.09
            }
            else {
                z = r() * 2 - 1
                const a = r() * 6.2832, c = Math.sqrt(1 - z * z)
                x = c * Math.cos(a)
                y = c * Math.sin(a)
            }
            const n = Math.hypot(x, y, z)
            gx[k] = x / n
            gy[k] = y / n
            gz[k] = z / n
            gchi[k] = 1.2e7 + Math.cbrt(r()) * 2.2e9
            const c = palette[(r() * palette.length) | 0]!
            gr[k] = c[0]
            gg[k] = c[1]
            gb[k] = c[2]
        }
    }

    /* ----- canvas and cell buffers ----- */
    const FONT = '"Items Mono", ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace'
    const RAMP = '.,:;-=+*#%@', RL = RAMP.length
    const ctx = canvas.getContext('2d', { alpha: false })!
    let W = 0, H = 0, dpr = 1, fs = 12, cw = 7, ch = 14, cols = 0, rows = 0, N = 0, hw = 0, hh = 0, focal = 500, zoom = 1
    let bR = new Float32Array(0), bG = bR, bB = bR, noise = bR, tR = bR, tG = bR, tB = bR
    let tC = new Uint16Array(0) // text layer: labels and the glyphs of named bodies

    function resize() {
        dpr = Math.min(devicePixelRatio || 1, 2)
        W = innerWidth
        H = innerHeight
        canvas.width = Math.round(W * dpr)
        canvas.height = Math.round(H * dpr)
        fs = W < 640 ? 10 : W < 1100 ? 12 : 14
        ctx.font = `${fs}px ${FONT}`
        cw = ctx.measureText('M').width
        ch = Math.round(fs * 1.18)
        cols = Math.ceil(W / cw)
        rows = Math.ceil(H / ch)
        N = cols * rows
        bR = new Float32Array(N)
        bG = new Float32Array(N)
        bB = new Float32Array(N)
        tC = new Uint16Array(N)
        tR = new Float32Array(N)
        tG = new Float32Array(N)
        tB = new Float32Array(N)
        noise = new Float32Array(N)
        for (let i = 0; i < N; i++) noise[i] = Math.random()
        hw = W / 2
        hh = H / 2
    }

    /* ----- the camera -----
       Three equatorial unit vectors: right, up and forward. Either the phone's
       orientation sets them, or an azimuth and altitude you drag. */
    const camR: V3 = [1, 0, 0], camU: V3 = [0, 1, 0], camF: V3 = [0, 0, 1]
    let az = lat >= 0 ? Math.PI : 0, alt = 30 * DEG
    let gyro: { r: V3, u: V3, f: V3 } | undefined // in east/north/up axes
    let touched = false
    // Where Andromeda, and later the merged galaxy, lies (equatorial). Once the
    // catalogue stars have gone, and until the visitor takes over, the view
    // drifts round to face it, since in the end it is the only thing left to see.
    const focus: V3 = [0, 0, 1]
    let focusK = 0

    // East/north/up components -> equatorial vector.
    function enu(v: V3, out: V3) {
        out[0] = v[0] * east[0] + v[1] * north[0] + v[2] * up[0]
        out[1] = v[0] * east[1] + v[1] * north[1] + v[2] * up[1]
        out[2] = v[0] * east[2] + v[1] * north[2] + v[2] * up[2]
    }
    const tgtR: V3 = [0, 0, 0], tgtU: V3 = [0, 0, 0], tgtF: V3 = [0, 0, 0]
    function setCamera(dt: number, first = false) {
        if (gyro) {
            enu(gyro.r, tgtR)
            enu(gyro.u, tgtU)
            enu(gyro.f, tgtF)
        }
        else {
            if (!touched && !reduceMotion) {
                if (focusK > 0) {
                    const e = focus[0] * east[0] + focus[1] * east[1] + focus[2] * east[2]
                    const n = focus[0] * north[0] + focus[1] * north[1] + focus[2] * north[2]
                    const u = focus[0] * up[0] + focus[1] * up[1] + focus[2] * up[2]
                    let turn = Math.atan2(e, n) - az
                    turn -= Math.round(turn / (2 * Math.PI)) * 2 * Math.PI
                    const k = Math.min(1, 0.4 * dt * focusK)
                    az += turn * k
                    alt += (Math.asin(clamp(u, -1, 1)) - alt) * k
                }
                else az += 0.01 * dt // a slow pan until you take over
            }
            const ca = Math.cos(az), sa = Math.sin(az), cl = Math.cos(alt), sl = Math.sin(alt)
            enu([sa * cl, ca * cl, sl], tgtF)
            enu([ca, -sa, 0], tgtR)
            enu([-sa * sl, -ca * sl, cl], tgtU)
        }
        // Ease towards the phone's orientation so sensor jitter doesn't shake the sky.
        const k = gyro && !first ? 0.25 : 1
        for (let i = 0; i < 3; i++) {
            camR[i] = camR[i]! + (tgtR[i]! - camR[i]!) * k
            camU[i] = camU[i]! + (tgtU[i]! - camU[i]!) * k
            camF[i] = camF[i]! + (tgtF[i]! - camF[i]!) * k
        }
        // The long side of the screen spans about 90 degrees; zooming narrows it.
        focal = 0.5 * Math.max(W, H) * zoom
    }

    // Phone orientation -> camera. The camera looks out of the back of the phone.
    function onOrientation(e: DeviceOrientationEvent) {
        if (e.beta == null || e.gamma == null) return
        const compass = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
        const alpha = (compass != null ? 360 - compass : e.alpha ?? 0) * DEG
        const beta = e.beta * DEG, gamma = e.gamma * DEG
        const cX = Math.cos(beta), sX = Math.sin(beta), cY = Math.cos(gamma), sY = Math.sin(gamma), cZ = Math.cos(alpha), sZ = Math.sin(alpha)
        // Columns of the device -> east/north/up rotation (W3C deviceorientation).
        let rx = cZ * cY - sZ * sX * sY, ry = cY * sZ + cZ * sX * sY, rz = -cX * sY
        let ux = -cX * sZ, uy = cZ * cX, uz = sX
        const fx = -(cY * sZ * sX + cZ * sY), fy = -(sZ * sY - cZ * cY * sX), fz = -(cX * cY)
        // Landscape: the screen is rotated relative to the device.
        const so = (screen.orientation?.angle ?? 0) * DEG
        if (so) {
            const c = Math.cos(so), s = Math.sin(so)
            const nrx = rx * c + ux * s, nry = ry * c + uy * s, nrz = rz * c + uz * s
            ux = ux * c - rx * s
            uy = uy * c - ry * s
            uz = uz * c - rz * s
            rx = nrx
            ry = nry
            rz = nrz
        }
        gyro = { r: [rx, ry, rz], u: [ux, uy, uz], f: [fx, fy, fz] }
    }
    let listening = false
    function listenOrientation() {
        if (listening) return
        listening = true
        // Android reports true compass headings on the "absolute" event.
        if ('ondeviceorientationabsolute' in window) addEventListener('deviceorientationabsolute', onOrientation as EventListener)
        else addEventListener('deviceorientation', onOrientation)
    }
    const hasMotion = typeof DeviceOrientationEvent !== 'undefined' && matchMedia('(pointer: coarse)').matches
    const needsPermission = hasMotion
        && typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function'
    // Follow the phone's orientation. On an iPhone this asks for motion access,
    // which is only allowed from inside a tap or click handler.
    function enableMotion() {
        if (!hasMotion || listening) return
        if (!needsPermission) return listenOrientation()
        ;(DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()
            .then((state) => {
                if (state === 'granted' && !destroyed) listenOrientation()
            })
            .catch(() => { /* declined: dragging still works */ })
    }

    // Dragging looks around; pinching or the wheel zooms.
    const pointers = new Map<number, [number, number]>()
    let pinch = 0
    function onDown(e: PointerEvent) {
        touched = true
        pointers.set(e.pointerId, [e.clientX, e.clientY])
        pinch = 0
    }
    function onMove(e: PointerEvent) {
        const p = pointers.get(e.pointerId)
        if (!p) return
        if (pointers.size === 1 && !gyro) {
            az -= (e.clientX - p[0]) / focal
            alt = clamp(alt + (e.clientY - p[1]) / focal, -1.5, 1.5)
        }
        p[0] = e.clientX
        p[1] = e.clientY
        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()] as [[number, number], [number, number]]
            const dist = Math.hypot(a[0] - b[0], a[1] - b[1])
            if (pinch) zoom = clamp(zoom * dist / pinch, 0.6, 6)
            pinch = dist
        }
    }
    function onUp(e: PointerEvent) {
        pointers.delete(e.pointerId)
        pinch = 0
    }
    function onWheel(e: WheelEvent) {
        e.preventDefault()
        touched = true
        zoom = clamp(zoom * Math.exp(-e.deltaY * 0.0015), 0.6, 6)
    }

    // The cell a direction (x, y, z) (any length) lands in, or -1 if off screen.
    function cellOf(x: number, y: number, z: number) {
        const d = x * camF[0] + y * camF[1] + z * camF[2]
        if (d <= 0) return -1
        const px = hw + focal * (x * camR[0] + y * camR[1] + z * camR[2]) / d
        const py = hh - focal * (x * camU[0] + y * camU[1] + z * camU[2]) / d
        if (px < 0 || py < 0 || px >= W || py >= H) return -1
        return ((py / ch) | 0) * cols + ((px / cw) | 0)
    }
    function splat(x: number, y: number, z: number, r: number, g: number, b: number, k: number) {
        const i = cellOf(x, y, z)
        if (i < 0) return -1
        bR[i]! += r * k
        bG[i]! += g * k
        bB[i]! += b * k
        return i
    }
    // Light spilling from a bright point into the cells around it.
    function flare(i: number, r: number, g: number, b: number, k: number) {
        const c = i % cols
        const add = (j: number, w: number) => {
            if (j < 0 || j >= N) return
            bR[j]! += r * k * w
            bG[j]! += g * k * w
            bB[j]! += b * k * w
        }
        if (c > 0) add(i - 1, 1)
        if (c < cols - 1) add(i + 1, 1)
        add(i - cols, 0.6)
        add(i + cols, 0.6)
    }
    function glyph(i: number, c: string, r: number, g: number, b: number) {
        if (i < 0 || i >= N) return
        tC[i] = c.charCodeAt(0)
        tR[i] = r
        tG[i] = g
        tB[i] = b
    }
    // A small name beside cell i, moved to a neighbouring row if another
    // label is already in the way.
    function label(i: number, text: string, r: number, g: number, b: number, k: number) {
        if (k < 0.08) return
        const col = i % cols, len = Math.min(text.length, cols - col - 2)
        if (len < text.length) return
        for (const dy of [0, 1, -1, 2, -2]) {
            const at = i + dy * cols + 2
            if (at < 0 || at + len > N) continue
            let free = true
            for (let j = -1; j <= len && free; j++) if (tC[at + j]) free = false
            if (!free) continue
            for (let j = 0; j < len; j++) if (text[j] !== ' ') glyph(at + j, text[j]!, r * k, g * k, b * k)
            return
        }
    }

    /* ----- haptics ----- */
    const canHaptic = hapticsSupported()
    const canVibrate = typeof navigator.vibrate === 'function'
    function buzz(p: number | number[]) {
        if (!canHaptic) return
        // Browsers refuse haptics until the visitor has tapped the page. Arriving
        // via the homepage link counts; a direct visit waits for any tap.
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
        if (canVibrate) {
            try {
                navigator.vibrate(p)
            }
            catch { /* ignored */ }
        }
        else {
            const n = Array.isArray(p) ? Math.ceil(p.length / 2) : 1
            for (let k = 0; k < n; k++) setTimeout(iosTick, k * 90)
        }
    }
    function stopBuzz() {
        if (canVibrate) {
            try {
                navigator.vibrate(0)
            }
            catch { /* ignored */ }
        }
    }
    const hap = { next: 0, merge: false, fin: false }
    // A light tick that quickens and strengthens as the years climb, with a
    // double knock as Andromeda arrives. Once the galaxies have gone it thins
    // out again, slower and fainter as the stars die, to one last tap.
    function hapticTick(s: number, t: number) {
        if (t >= 1 && s < TOTAL - 1 && s >= hap.next) {
            const lt = Math.log10(t)
            const u = clamp(lt / 10, 0, 1) // 0 at the first year, 1 at ten billion
            const fade = ss(10.5, 14, lt) // the long dark
            buzz(Math.round(lerp(lerp(8, 22, u), 6, fade)))
            hap.next = s + lerp(lerp(1.6, 0.35, u), 2.6, fade)
        }
        if (t >= T_MERGE && t < T_MERGE + 5e8 && !hap.merge) {
            hap.merge = true
            buzz([40, 70, 40, 70, 90])
        }
        if (s >= TOTAL && !hap.fin) {
            hap.fin = true
            buzz(30)
        }
    }

    /* ----- state ----- */
    let s = clamp(opts.startAt ?? 0, 0, TOTAL - 0.01)
    // The galaxy keeps its own clock. It follows model time until that outruns
    // the eye, then holds a pace you can follow instead of dissolving into noise.
    // The Earth's spin does the same, then lets go of the ground altogether.
    const GAL_RATE = 6e6
    let tGal = 0
    const spinStep = (rate: number, dt: number) => {
        const sps = rate * YEAR_S // model seconds per second
        return Math.min(7.2921159e-5 * sps, 0.6) * (1 - ss(4.3, 5.5, Math.log10(sps))) * dt
    }
    for (let k = 0, n = Math.ceil(s * 30); k < n; k++) { // catch up when starting part-way through
        const c = clock(k / 30)
        tGal += Math.min(c.rate, GAL_RATE) / 30
        spin += spinStep(c.rate, 1 / 30)
    }
    let running = true, last = performance.now(), raf = 0

    function render(dt: number) {
        const { t, rate } = clock(s)
        const { a, H: hubble } = cosmos(t)
        const lt = Math.log10(t + 1)
        const nowMs = openedAt + t * YEAR_S * 1000 // the model's date, while dates still mean anything

        bR.fill(0)
        bG.fill(0)
        bB.fill(0)
        tC.fill(0)

        // Over billions of years the bright blue stars die and the galaxies redden;
        // over trillions, what is left sinks to the deep red of the last dwarfs.
        const old = ss(3e9, 1.6e10, t)
        const ember = ss(10.6, 13.6, lt)

        /* stars: each on its measured course. The catalogue's straight-line
           motions hold for a few million years; past that the stars we know
           have scattered, and they fade from the model. */
        const known = 1 - ss(6.3, 7.5, lt)
        if (known > 0.01) {
            const tM = t / 1e6
            // The unaided eye reaches magnitude 6.5. Zooming in works like a
            // telescope and brings out fainter stars, a magnitude for every
            // 2.5x; the list is sorted, so it can stop at the first star too faint.
            const limit = 6.5 + Math.max(0, 2.5 * Math.log10(zoom))
            for (let k = 0; k < NSTAR; k++) {
                const over = sMag[k]! - limit
                if (over > 0) break
                let x = sx[k]!, y = sy[k]!, z = sz[k]!, I = sI[k]! * known
                if (over > -0.25 && sMag[k]! > 6.5) I *= -over * 4 // fade in at the limit
                const d0 = sD[k]!
                if (d0) {
                    x += svx[k]! * tM
                    y += svy[k]! * tM
                    z += svz[k]! * tM
                    I *= d0 / Math.max(1, Math.sqrt(x * x + y * y + z * z))
                }
                if (I < 0.03) continue
                const r = sr[k]!, g = sg[k]!, b = sb[k]!
                const i = splat(x, y, z, r, g, b, I)
                if (i < 0) continue
                if (I > 0.9) flare(i, r, g, b, Math.min(I, 4) * 0.22)
                const name = sName[k]
                if (name) label(i, name, 0.62, 0.62, 0.6, known * clamp(I * 1.5, 0, 1))
            }
        }

        /* the solar system, while its clockwork can still be followed. A body
           fades once it moves too far between frames to be more than a blur. */
        const smear = (period: number) => 1 - ss(0.1, 0.7, 2 * Math.PI * rate / period * Math.max(dt, 1 / 60))
        const kYear = smear(1), kMonth = smear(0.0748)
        if (kMonth > 0.02) {
            const T = (julian(nowMs) - 2451545) / 36525
            const earth = heliocentric(EARTH.el, EARTH.rate, T)
            const body = (dir: V3, name: string, ch0: string, c: RGB, I: number, k: number) => {
                if (k < 0.02) return
                const i = splat(dir[0], dir[1], dir[2], c[0], c[1], c[2], I * k)
                if (i < 0) return
                flare(i, c[0], c[1], c[2], Math.min(I, 4) * 0.08 * k)
                glyph(i, ch0, c[0] * k, c[1] * k, c[2] * k)
                label(i, name, 0.75, 0.75, 0.72, k)
            }
            body(eclToEq([-earth[0], -earth[1], -earth[2]]), 'Sun', '@', [1, 0.9, 0.5], 6, kYear)
            body(moonDirection(nowMs), 'Moon', 'O', [0.9, 0.9, 0.85], 2.5, kMonth)
            if (kYear > 0.02) {
                for (const p of PLANETS) {
                    const h = heliocentric(p.el, p.rate, T)
                    const px = h[0] - earth[0], py = h[1] - earth[1], pz = h[2] - earth[2]
                    const mag = p.H + 5 * Math.log10(Math.hypot(h[0], h[1], h[2]) * Math.hypot(px, py, pz))
                    body(eclToEq([px, py, pz]), p.name, 'o', p.c, Math.max(0.35, 1.2 * Math.pow(10, -0.2 * (mag - 1))), kYear)
                }
            }
        }

        /* the Milky Way, Andromeda, and what they become */
        if (lt < 14) {
            const q = clamp(t / T_MERGE, 0, 1), mrg = ss(0.94 * T_MERGE, 1.25 * T_MERGE, t)
            // The Sun: on its orbit, then wherever the merger leaves it.
            const sa = Math.PI + OMEGA0 * tGal
            const sunX = lerp(R0 * Math.cos(sa), SUN_E[0], mrg), sunY = lerp(R0 * Math.sin(sa), SUN_E[1], mrg), sunZ = SUN_E[2] * mrg
            // Once merged, the two galaxies' light is gathered into one glow.
            const dimG = (1 - 0.4 * old) * (1 + 2 * mrg)
            {
                // Andromeda on its way in; once it has arrived, the centre of the merged galaxy.
                const f = 1 - q
                const fx = M31_P0[0] * f - sunX, fy = M31_P0[1] * f - sunY, fz = M31_P0[2] * f - sunZ, n = Math.hypot(fx, fy, fz)
                focus[0] = (G2E[0][0] * fx + G2E[0][1] * fy + G2E[0][2] * fz) / n
                focus[1] = (G2E[1][0] * fx + G2E[1][1] * fy + G2E[1][2] * fz) / n
                focus[2] = (G2E[2][0] * fx + G2E[2][1] * fy + G2E[2][2] * fz) / n
                focusK = ss(6.3, 7.5, lt) // once the stars we know have gone
            }
            const draw = (D: Disc, ox: number, oy: number, oz: number, tilt: number, spinDir: number, lum: number) => {
                const ct = Math.cos(tilt), st = Math.sin(tilt)
                for (let k = 0; k < D.n; k++) {
                    const rad = D.r[k]!
                    // flat rotation curve: inner orbits lap outer ones
                    const an = D.phi[k]! + spinDir * OMEGA0 * tGal * R0 / Math.max(rad, 3000)
                    let x = rad * Math.cos(an), y = rad * Math.sin(an), z = D.z[k]!
                    if (tilt) { // lean the disc over, about its x axis
                        const ty = y * ct - z * st
                        z = y * st + z * ct
                        y = ty
                    }
                    x += ox
                    y += oy
                    z += oz
                    // each patch of stars burns out in its own time
                    const die = D.die[k]!
                    if (lt >= die) continue
                    const lit = lt > die - 0.5 ? (die - lt) * 2 : 1
                    let r = D.cr[k]!, g = D.cg[k]!, b = D.cb[k]!
                    if (mrg > 0) {
                        x += (D.ex[k]! - x) * mrg
                        y += (D.ey[k]! - y) * mrg
                        z += (D.ez[k]! - z) * mrg
                        r += (1 - r) * mrg
                        g += (0.8 - g) * mrg
                        b += (0.55 - b) * mrg
                    }
                    if (ember > 0) {
                        g += (0.34 * r - g) * ember
                        b += (0.18 * r - b) * ember
                    }
                    x -= sunX
                    y -= sunY
                    z -= sunZ
                    const d = Math.max(1200, Math.sqrt(x * x + y * y + z * z))
                    // Andromeda dims with the square of distance. Inside our own disc that
                    // law would drown the band in a few near neighbours, so it falls off gently.
                    const I = (lum ? Math.min(0.5, lum / (d * d)) : Math.min(0.25, 0.06 * Math.pow(9000 / d, 0.7))) * dimG * lit
                    if (I < 0.001) continue
                    // galactic -> equatorial
                    splat(G2E[0][0] * x + G2E[0][1] * y + G2E[0][2] * z, G2E[1][0] * x + G2E[1][1] * y + G2E[1][2] * z, G2E[2][0] * x + G2E[2][1] * y + G2E[2][2] * z, r, g, b, I)
                }
            }
            draw(MW, 0, 0, 0, 0, 1, 0)
            // Andromeda falls straight in from where it is today.
            const f = 1 - q
            draw(M31, M31_P0[0] * f, M31_P0[1] * f, M31_P0[2] * f, 1.1, -1, 7.5e9)
        }

        /* distant galaxies: a deep field beyond the stars. Each is carried away
           by the expansion, reddening and dimming as it goes; dark energy makes
           that a runaway, and within a hundred billion years none can be seen.
           While the catalogue stars are up, the field is held back behind them. */
        const deep = 1 - 0.85 * known
        if (a < 40) {
            for (let k = 0; k < NGAL; k++) {
                const chi = gchi[k]!
                const v = hubble * a * chi // recession speed / c
                const flux = Math.min(0.8, 1.5e8 / chi) / (a * a * (1 + v) * (1 + v)) * deep
                if (flux < 0.025) continue
                const u = Math.min(0.8, v * 2)
                const r = gr[k]!, g = gg[k]!, b = gb[k]!
                splat(gx[k]!, gy[k]!, gz[k]!, r + (1 - r) * u, g + (0.45 - g) * u, b + (0.3 - b) * u, flux)
            }
        }

        /* the Sun's last act: about five billion years on it swells into a red
           giant and swallows the Earth, and for a while that is all there is to see */
        const giant = ss(4.9e9, 6.4e9, t) * (1 - ss(7.1e9, 7.6e9, t))
        if (giant > 0.002) {
            for (let k = 0, m = N >> 2; k < m; k++) noise[(Math.random() * N) | 0] = Math.random()
            for (let i = 0; i < N; i++) {
                const nz = (0.45 + 0.55 * noise[i]!) * giant
                bR[i]! += 0.75 * nz
                bG[i]! += 0.2 * nz
                bB[i]! += 0.05 * nz
            }
        }
        if (s >= TOTAL) { // the end: nothing left to see
            bR.fill(0)
            bG.fill(0)
            bB.fill(0)
            tC.fill(0)
        }

        /* draw */
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, W, H)
        ctx.font = `${fs}px ${FONT}`
        ctx.textBaseline = 'top'
        for (let r = 0, i = 0; r < rows; r++) {
            const y = r * ch
            for (let c = 0; c < cols; c++, i++) {
                if (tC[i]) {
                    ctx.fillStyle = `rgb(${Math.min(255, tR[i]! * 255) | 0},${Math.min(255, tG[i]! * 255) | 0},${Math.min(255, tB[i]! * 255) | 0})`
                    ctx.fillText(String.fromCharCode(tC[i]!), c * cw, y)
                    continue
                }
                const R = bR[i]!, G = bG[i]!, B = bB[i]!, L = R > G ? (R > B ? R : B) : (G > B ? G : B)
                if (L < 0.025) continue
                const u = L < 1 ? L : 1, idx = Math.min(RL - 1, (Math.pow(u, 0.55) * RL) | 0)
                const br = 0.3 + 0.7 * Math.sqrt(u), w = L > 1 ? Math.min(1, (L - 1) / 4) : 0
                const cr = (R / L * br) * (1 - w) + w, cg = (G / L * br) * (1 - w) + w, cb = (B / L * br) * (1 - w) + w
                ctx.fillStyle = `rgb(${cr * 255 | 0},${cg * 255 | 0},${cb * 255 | 0})`
                ctx.fillText(RAMP[idx]!, c * cw, y)
            }
        }
        return t
    }

    function frame(now: number) {
        // Keep pace with the wall clock even on a slow device; a hidden tab
        // gets no frames at all, so it simply resumes where it left off.
        const dt = Math.min(0.5, (now - last) / 1000)
        last = now
        if (running) {
            const { rate } = clock(s)
            tGal += Math.min(rate, GAL_RATE) * dt
            spin += spinStep(rate, dt)
            s = Math.min(TOTAL, s + dt)
        }
        setHorizon()
        setCamera(dt)
        const t = render(dt)
        if (running) {
            hapticTick(s, t)
            opts.onYear?.(Math.floor(year0 + t))
            if (s >= TOTAL) {
                running = false
                opts.onEnd?.()
            }
        }
        raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
        if (document.hidden) stopBuzz()
    }

    resize()
    setHorizon()
    setCamera(0, true)
    addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    addEventListener('pointermove', onMove)
    addEventListener('pointerup', onUp)
    addEventListener('pointercancel', onUp)
    // Re-measure once the site's mono font has loaded.
    document.fonts?.ready.then(resize)
    raf = requestAnimationFrame(frame)

    return {
        // Whether the device has motion sensors, and whether using them needs a tap.
        hasMotion,
        needsMotionPermission: needsPermission,
        locate,
        enableMotion,
        destroy() {
            destroyed = true
            cancelAnimationFrame(raf)
            stopBuzz()
            removeEventListener('resize', resize)
            document.removeEventListener('visibilitychange', onVisibility)
            canvas.removeEventListener('pointerdown', onDown)
            canvas.removeEventListener('wheel', onWheel)
            removeEventListener('pointermove', onMove)
            removeEventListener('pointerup', onUp)
            removeEventListener('pointercancel', onUp)
            removeEventListener('deviceorientationabsolute', onOrientation as EventListener)
            removeEventListener('deviceorientation', onOrientation)
        },
    }
}
