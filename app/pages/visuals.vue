<script setup lang="ts">
import { visuals, type Visual } from '~/utils/visuals'

useHead({
    title: 'David Lawler',
})

// How deep the field of images is, and how close to the eye one gets before
// it has faded away (both in px; the eye sits 1000px from the middle).
const DEPTH = 4200
const NEAR = 520
// The steady drift towards the viewer, in px per second.
const CRUISE = 46

// How many float in the field at once. There are more visuals than this:
// each time one passes out of sight, the next from a shuffled deck takes its
// place, so the field keeps changing and no two visits match.
const SLOTS = 48

// What each place in the field is showing. Empty until the page is running,
// as the deal is left to chance.
const shown = ref<Visual[]>([])

// The rest of a place's state is only needed by the animation.
const field = Array.from({ length: SLOTS }, (_, slot) => ({
    x: 0,
    y: 0,
    // Evenly spaced in depth to begin with.
    z: slot / SLOTS,
    phase: Math.random() * Math.PI * 2,
    rate: 0.25 + Math.random() * 0.35,
    lean: (Math.random() * 2 - 1) * 2.5,
    // Where it was in the field on the last frame, to notice it coming round again.
    was: -1,
}))

// Dealing is not left wholly to chance, which clumps: of a handful of cards
// drawn from the deck, the one least like those dealt just before it is
// played. Alike means from the same project (close together on the Figma
// page the images came from), and a video straight after a video.
let deck: Visual[] = []
const dealt: Visual[] = []
function deal() {
    if (!deck.length) deck = visuals.filter(visual => !shown.value.includes(visual))
    let best = 0, bestScore = -Infinity
    for (let n = 0; n < Math.min(8, deck.length); n++) {
        const at = Math.floor(Math.random() * deck.length)
        const card = deck[at]!
        let score = Infinity
        dealt.forEach((other, age) => {
            // Recent cards count for more than ones dealt a while ago.
            let apart = Math.abs(card.place - other.place) + (dealt.length - 1 - age) * 3
            if (card.video && other.video) apart -= 12
            score = Math.min(score, apart)
        })
        if (score > bestScore) {
            best = at
            bestScore = score
        }
    }
    const [card] = deck.splice(best, 1)
    dealt.push(card!)
    if (dealt.length > 10) dealt.shift()
    return card!
}

// Tall images are drawn narrower, so a phone screen takes up about as much
// room as a desktop one.
const shape = (visual: Visual) => Math.min(1, Math.sqrt(visual.width / visual.height / 1.35))

const stageEl = ref<HTMLElement>()
const worldEl = ref<HTMLElement>()
const reducedMotion = ref(false)

// On a phone, the visitor is asked for its motion sensors. Set once the page
// is running; empty until then and after an answer.
const asksMotion = ref(false)
let enableMotion = () => {}

function allow() {
    enableMotion()
    asksMotion.value = false
}

let raf = 0
let stop = () => {}
onBeforeUnmount(() => stop())

const smooth = (a: number, b: number, v: number) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)
}

// The field goes on forever in every direction. Drag to move across it,
// scroll or pinch to move through it, or use the arrow keys and W/S; moving
// the pointer tilts the view. Left alone, it drifts slowly towards you. On a
// phone with motion allowed, turning the phone looks around and each step
// you take carries you forward.
onMounted(async () => {
    for (let i = 0; i < SLOTS; i++) shown.value.push(deal())
    await nextTick()
    // Left the page before it got going.
    if (!stageEl.value || !worldEl.value) return
    const stage = stageEl.value
    const world: HTMLElement = worldEl.value
    const els = [...world.querySelectorAll<HTMLElement>('.visual')]
    reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cruise = reducedMotion.value ? 0 : CRUISE

    // Each place gets a new position and size now, and again every time it
    // passes out of sight and comes round with something new to show.
    // The same goes for where it lands: of a few spots, the one furthest
    // from its neighbours in depth, so images do not pile up.
    const place = (item: typeof field[number], el: HTMLElement) => {
        const at = field.indexOf(item)
        const near = [-3, -2, -1, 1, 2, 3].map(step => field[(at + step + SLOTS) % SLOTS]!)
        let bestGap = -1
        for (let n = 0; n < 8; n++) {
            const x = Math.random() * 2 - 1
            const y = Math.random() * 2 - 1
            // Distances are measured round the edges, as the space repeats.
            const gap = Math.min(...near.map((other) => {
                const dx = Math.abs(x - other.x), dy = Math.abs(y - other.y)
                return Math.hypot(Math.min(dx, 2 - dx), Math.min(dy, 2 - dy))
            }))
            if (gap > bestGap) {
                bestGap = gap
                item.x = x
                item.y = y
            }
        }
        // Mostly small, a few large.
        el.style.setProperty('--size', (0.4 + Math.random() ** 2.2 * 1.5).toFixed(3))
    }
    field.forEach((item, i) => place(item, els[i]!))

    // Where the eye is, and how fast it is moving, in px and px per second.
    let camX = 0, camY = 0, travel = 0
    let moveX = 0, moveY = 0, velocity = cruise
    let aimX = 0, aimY = 0, tiltX = 0, tiltY = 0
    let last = performance.now()

    const onWheel = (event: WheelEvent) => {
        event.preventDefault()
        // A pinch on a trackpad arrives as a wheel with ctrl held: that, and
        // an ordinary scroll, move through; a sideways scroll moves across.
        velocity += event.deltaY * (event.ctrlKey ? -40 : 5)
        moveX += event.deltaX * 4
    }

    // Fingers (or the mouse button) that are down. One drags the field
    // about, as if holding it; two pinch through it.
    const held = new Map<number, { x: number, y: number }>()
    const GRIP = 2.2
    const spanOf = () => {
        const [a, b] = [...held.values()]
        return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
    }
    const onDown = (event: PointerEvent) => {
        held.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    const onMove = (event: PointerEvent) => {
        const point = held.get(event.pointerId)
        if (point) {
            const before = spanOf()
            const dx = event.clientX - point.x
            const dy = event.clientY - point.y
            point.x = event.clientX
            point.y = event.clientY
            if (held.size === 1) {
                camX -= dx * GRIP
                camY -= dy * GRIP
                moveX = -dx * GRIP * 60
                moveY = -dy * GRIP * 60
            }
            else {
                const spread = spanOf() - before
                travel += spread * 8
                velocity = spread * 480
            }
        }
        if (event.pointerType === 'mouse' && !held.size) {
            aimX = (event.clientX / innerWidth - 0.5) * 18
            aimY = (event.clientY / innerHeight - 0.5) * -12
        }
    }
    const onUp = (event: PointerEvent) => { held.delete(event.pointerId) }

    // Keys held down push the eye along: arrows (or A/D) across and up and
    // down, W and S forward and back.
    const keys = new Set<string>()
    const KEYS = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd']
    const onKeyDown = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase()
        if (!KEYS.includes(key) || event.metaKey || event.ctrlKey || event.altKey) return
        event.preventDefault()
        keys.add(key)
    }
    const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()) }
    const onBlur = () => { keys.clear() }

    // Motion sensors. The phone is treated as a window onto the field: the
    // way it faces when motion starts is straight ahead, and turning it from
    // there looks left, right, up and down.
    let alpha0: number | undefined, beta0 = 0
    const LOOK = 38
    const onOrientation = (event: DeviceOrientationEvent) => {
        if (event.alpha == null || event.beta == null) return
        if (alpha0 === undefined) {
            alpha0 = event.alpha
            beta0 = event.beta
        }
        const yaw = ((event.alpha - alpha0 + 540) % 360) - 180
        const pitch = event.beta - beta0
        aimX = Math.max(-LOOK, Math.min(LOOK, -yaw))
        aimY = Math.max(-LOOK, Math.min(LOOK, pitch))
        // Turned past the edge, straight ahead follows, so turning back responds at once.
        if (Math.abs(yaw) > LOOK) alpha0 = (event.alpha + Math.sign(yaw) * LOOK + 360) % 360
        if (Math.abs(pitch) > LOOK) beta0 = event.beta - Math.sign(pitch) * LOOK
    }

    // Each step taken is a push forward.
    const onMotion = stepDetector(() => { velocity += 620 })

    type Asks = { requestPermission?: () => Promise<string> }
    const orientationAsks = (window.DeviceOrientationEvent as unknown as Asks | undefined)?.requestPermission
    const motionAsks = (window.DeviceMotionEvent as unknown as Asks | undefined)?.requestPermission
    const listen = () => {
        window.addEventListener('deviceorientation', onOrientation)
        window.addEventListener('devicemotion', onMotion)
    }
    // On an iPhone this has to run inside a tap.
    enableMotion = () => {
        Promise.all([orientationAsks?.(), motionAsks?.()]).then(listen, () => {})
    }
    const phone = 'DeviceOrientationEvent' in window && window.matchMedia('(pointer: coarse)').matches
    if (phone && !reducedMotion.value) {
        if (orientationAsks || motionAsks) asksMotion.value = true
        else listen()
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    function frame(now: number) {
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        const t = now / 1000

        const push = 2600 * dt
        if (keys.has('arrowleft') || keys.has('a')) moveX -= push
        if (keys.has('arrowright') || keys.has('d')) moveX += push
        if (keys.has('arrowup')) moveY -= push
        if (keys.has('arrowdown')) moveY += push
        if (keys.has('w')) velocity += push * 1.5
        if (keys.has('s')) velocity -= push * 1.5

        // A push dies away: across, to a stop; through, back to the steady drift.
        const ease = Math.min(1, dt * 2)
        velocity += (cruise - velocity) * ease
        velocity = Math.max(-6000, Math.min(6000, velocity))
        moveX -= moveX * ease
        moveY -= moveY * ease
        if (!held.size) {
            travel += velocity * dt
            camX += moveX * dt
            camY += moveY * dt
        }
        tiltX += (aimX - tiltX) * Math.min(1, dt * 3)
        tiltY += (aimY - tiltY) * Math.min(1, dt * 3)
        world.style.transform = `rotateX(${tiltY.toFixed(3)}deg) rotateY(${tiltX.toFixed(3)}deg)`

        // Half the width and height of the block of space the images fill.
        // It repeats in every direction, so there is no edge to reach.
        const spreadX = Math.max(innerWidth * 1.15, 700)
        const spreadY = Math.max(innerHeight * 0.95, 600)
        const around = (v: number, half: number) => ((((v + half) % (2 * half)) + 2 * half) % (2 * half)) - half

        for (let i = 0; i < els.length; i++) {
            const item = field[i]!
            const el = els[i]!
            // 0 is the far end of the field, 1 right in front of the eye.
            let depth = (((item.z + travel / DEPTH) % 1) + 1) % 1
            // Gone past the eye (or back into the distance) and round to the other end, unseen.
            if (item.was >= 0 && Math.abs(depth - item.was) > 0.5) {
                place(item, el)
                shown.value[i] = deal()
                depth = Math.min(0.999, Math.max(0, depth + (depth < 0.5 ? 1 : -1) * Math.random() * 0.02))
                item.z = ((depth - travel / DEPTH) % 1 + 1) % 1
            }
            item.was = depth
            const bob = reducedMotion.value ? 0 : Math.sin(t * item.rate + item.phase)
            const x = around(item.x * spreadX - camX, spreadX)
            const y = around(item.y * spreadY - camY, spreadY) + bob * 16
            const z = depth * DEPTH - DEPTH + NEAR
            // Solid for most of the way. It blurs into view at the far end and
            // blurs away again before it fills the screen.
            const arriving = 1 - smooth(0, 0.1, depth)
            const leaving = smooth(0.86, 0.99, depth)
            // The same at the sides, where it slips round to the opposite side.
            const aside = smooth(0.78, 1, Math.max(Math.abs(x) / spreadX, Math.abs(y - bob * 16) / spreadY))
            const opacity = 1 - Math.max(arriving, leaving, aside)
            // The far end is small on screen, so it needs more blur to show.
            const blur = arriving * 36 + leaving * 18 + aside * 20
            el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : ''
            el.style.transform = `translate3d(calc(${x.toFixed(1)}px - 50%), calc(${y.toFixed(1)}px - 50%), ${z.toFixed(1)}px) rotate(${(bob * item.lean).toFixed(2)}deg)`
            el.style.opacity = opacity.toFixed(3)
            // Videos only run in the nearer half of the field, where they can be seen moving.
            const video = el.firstElementChild
            if (video instanceof HTMLVideoElement) {
                const runs = !reducedMotion.value && depth > 0.45 && depth < 0.99
                if (runs && video.paused) video.play().catch(() => {})
                else if (!runs && !video.paused) video.pause()
            }
        }
        raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    stop = () => {
        cancelAnimationFrame(raf)
        stage.removeEventListener('wheel', onWheel)
        stage.removeEventListener('pointerdown', onDown)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
        window.removeEventListener('blur', onBlur)
        window.removeEventListener('deviceorientation', onOrientation)
        window.removeEventListener('devicemotion', onMotion)
    }
})
</script>

<template>
    <div ref="stageEl" class="visuals">
        <div ref="worldEl" class="visuals-world">
            <figure
                v-for="(visual, i) in shown"
                :key="i"
                class="visual"
                :style="{ 'aspectRatio': `${visual.width} / ${visual.height}`, '--shape': shape(visual) }"
            >
                <video v-if="visual.video" :key="visual.video" :src="visual.video" :poster="visual.src" muted loop playsinline preload="none" />
                <img v-else :key="visual.src" :src="visual.src" alt="" draggable="false" decoding="async">
            </figure>
        </div>
        <Transition name="fade">
            <p v-if="asksMotion" class="visuals-ask">
                <span>Allow motion to walk through?</span>
                <span class="visuals-ask-actions">
                    <button type="button" @click="allow">Allow</button>
                    <button type="button" @click="asksMotion = false">No thanks</button>
                </span>
            </p>
        </Transition>
    </div>
</template>

<style scoped lang="scss">
.visuals {
    position: fixed;
    inset: 0;
    z-index: 1;
    overflow: hidden;
    background: $color-bg;
    perspective: 1000px;
    touch-action: none;
    user-select: none;
    cursor: grab;

    &:active {
        cursor: grabbing;
    }
}

.visuals-world {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
    will-change: transform;
}

.visual {
    position: absolute;
    left: 50%;
    top: 50%;
    width: calc(min(46vw, 380px) * var(--size, 1) * var(--shape, 1));
    pointer-events: none;
    margin: 0;
    opacity: 0;
    will-change: transform, opacity, filter;
    backface-visibility: hidden;

    img,
    video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 3px;
        // Until an image arrives, its place is held in a faint tint.
        background: rgba($color-text, 0.06);
    }
}

.visuals-ask {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 2;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 12px 16px;
    border-radius: 3px;
    background: $color-bg;
    font-size: 13px;
    line-height: 1;
    white-space: nowrap;

    .visuals-ask-actions {
        display: flex;
        gap: 12px;
    }

    button {
        padding: 0;
        border: 0;
        border-bottom: 0.5px solid currentcolor;
        background: none;
        color: inherit;
        font: inherit;
    }
}
</style>
