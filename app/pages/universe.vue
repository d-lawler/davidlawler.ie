<script setup lang="ts">
import { createUniverse, type StarData } from '~/utils/universe'

useHead({
    title: 'David Lawler',
    // Black to every edge of the screen, including under a notch.
    htmlAttrs: { class: 'universe-open' },
    meta: [
        { name: 'theme-color', content: '#000000' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
    ],
})

const canvasEl = ref<HTMLCanvasElement>()

// The year shown in the middle of the screen.
const readout = ref('')
const flashing = ref(false)

// What the prompt asks for ('location', 'motion' or both); empty hides it.
const asks = ref('')

// The year stays hidden while the prompt is up. Once the prompt has faded
// out there is a two-second pause, then the year fades in.
const yearShown = ref(false)
const PROMPT_FADE = 800
watch(asks, (now, was) => {
    if (was && !now) later(() => { yearShown.value = true }, PROMPT_FADE + 2000)
})

let universe: ReturnType<typeof createUniverse> | undefined
let gone = false
const timers: ReturnType<typeof setTimeout>[] = []
const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms))

// Zero-padded to the length of the last year of all, so the readout never changes width.
const formatYear = (year: number) => String(year).padStart(15, '0').replace(/\B(?=(\d{3})+$)/g, ',')

// The end, when the last star has gone out: flash the final year, hold on it,
// then go home.
function onEnd() {
    asks.value = ''
    yearShown.value = true
    flashing.value = true
    later(() => { flashing.value = false }, 1600)
    later(() => navigateTo('/'), 1600 + 5000)
}

// The visitor's answer to the prompt. Motion access has to be requested from
// inside the click itself, so it goes first.
function allow() {
    universe?.enableMotion()
    if (asks.value.includes('location')) universe?.locate()
    asks.value = ''
}

function decline() {
    asks.value = ''
}

// The universe starts the moment the page opens (as soon as the star
// catalogue has arrived) and runs to its end, over a sky guessed from the
// timezone. The prompt offers the visitor's real sky instead. Turn the phone,
// or drag, to look around; pinch or scroll to zoom. `?t=150` jumps to a
// moment, for testing.
onMounted(async () => {
    const startAt = Number(new URLSearchParams(location.search).get('t')) || 0
    let data: StarData = { stars: [], labels: [] }
    try {
        data = await (await fetch('/data/stars.json')).json()
    }
    catch { /* no catalogue: the model still runs, without its stars */ }
    if (gone || !canvasEl.value) return
    universe = createUniverse(canvasEl.value, data, {
        startAt,
        onYear: (year) => { readout.value = `${formatYear(year)} AD` },
        onEnd,
    })

    // Ask only for what is still open: location, unless the browser has
    // already settled it either way, and motion on a phone.
    let geo = navigator.geolocation ? 'prompt' : 'denied'
    try {
        if (navigator.geolocation) geo = (await navigator.permissions.query({ name: 'geolocation' })).state
    }
    catch { /* no Permissions API: ask */ }
    if (gone) return
    if (geo === 'granted') universe.locate()
    if (geo === 'granted' && !universe.needsMotionPermission) universe.enableMotion()
    else asks.value = [geo === 'prompt' && 'location', universe.hasMotion && 'motion'].filter(Boolean).join(' and ')
    if (!asks.value) yearShown.value = true
    // Unanswered, the prompt bows out. TODO: back to 25 s once its design is settled.
    later(() => { asks.value = '' }, 60000)
})

onBeforeUnmount(() => {
    gone = true
    timers.forEach(clearTimeout)
    universe?.destroy()
})
</script>

<template>
    <div class="universe">
        <canvas ref="canvasEl" class="universe-canvas" aria-label="The night sky from where you are, fast-forwarded to the end of the universe" />
        <Transition name="soft">
            <p v-if="readout && yearShown" class="universe-chip universe-year" :class="{ flashing }">
                <!-- Each digit sits in its own fixed-width box, so the proportional font behaves like a mono one. -->
                <span v-for="(char, i) in readout" :key="i" :class="{ digit: char >= '0' && char <= '9' }">{{ char }}</span>
            </p>
        </Transition>
        <Transition name="soft">
            <p v-if="asks" class="universe-chip universe-ask">
                <span>Allow {{ asks.includes('motion') ? 'motion' : 'location' }} to see your own sky?</span>
                <span class="universe-ask-actions">
                    <button type="button" @click="allow">Allow</button>
                    <button type="button" @click="decline">No thanks</button>
                </span>
            </p>
        </Transition>
    </div>
</template>

<style scoped lang="scss">
.universe {
    position: fixed;
    inset: 0;
    z-index: 1;
    background: #000;
    overflow: hidden;
    touch-action: none;
}

.universe-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
}

.universe-chip {
    position: absolute;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 4px 12px;
    color: #fff;
    font-family: $font-family-mono;
    font-size: 12px;
    line-height: 1;
    white-space: nowrap;
    hyphens: none;
}

.universe-year {
    top: 50%;
    padding: 8px 12px;
    font-family: $font-family-items;
    font-weight: 400;
    white-space: pre;
    pointer-events: none;

    .digit {
        display: inline-block;
        width: 0.56em;
        text-align: center;
    }

    &.flashing {
        animation: universe-flash 0.4s steps(1, end) 4;

        @media (prefers-reduced-motion: reduce) {
            animation: none;
        }
    }
}

.universe-ask {
    top: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-family: $font-family;
    font-size: 13px;

    .universe-ask-actions {
        display: flex;
        gap: 12px;
    }

    button {
        padding: 0;
        border: 0;
        border-bottom: 0.5px solid #fff;
        background: none;
        color: inherit;
        font: inherit;
    }
}

// The prompt and the year blur in and out of view.
.soft-enter-active,
.soft-leave-active {
    transition: opacity 0.8s ease, filter 0.8s ease;
}

.soft-enter-from,
.soft-leave-to {
    opacity: 0;
    filter: blur(8px);
}

@keyframes universe-flash {
    0% {
        opacity: 0;
    }

    50% {
        opacity: 1;
    }
}
</style>
