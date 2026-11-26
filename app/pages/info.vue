<script setup lang="ts">
import gsap from 'gsap'

useHead({
    title: 'David Lawler',
})

const text = 'Born in 1988. Played a lot of football. Learned to code at the Centre for Talented Youth Ireland, studying Computer Applications, Chemistry and Theoretical Physics. Became active in art and music collectives, performing and producing electronic music, regularly supporting touring international acts, and working on public art projects. Did a lot of life drawing for a year. Accepted to Ireland\'s National College of Art and Design. Studied Visual Communication. Interned at the National Print Museum, Unthink, and Studio AAD. Designed the identity and catalogues for three graduation shows. First student to be included in the 100 Archive, a collection of 100 notable Irish design projects. Graduated. Offered a place on the ThreeX3 programme. Awarded the Leonardo da Vinci travel grant by the European Union. Moved to London. Interned at Foundry Studio. Worked as a Developer at Goodhood, and later a Creative at Livity. Started a User Experience Design MSc at Kingston University. Dropped out. Went freelance. Have worked with Made by On, Colville-Walker Studio, The Guardian and Stella McCartney. Helped build skateparks in Morocco and Kurdistan with Make Life Skate Life. Founded Research and Destroy; clients include Pentagram, Noe & Associates, Manual, East, Mixcloud, and dozens of independent artists. Currently freelance Associate Creative Director at Google Brand Studio, EMEA. Volunteer with two charities; SkatePal, and Wonders around the World.'

const words = text.split(' ')

// "Born in 1988." is always at full strength; the rest waits to be read.
const OPENING = 3
// How strong a word is before it has been read.
const FAINT = 0.22
// How far away the roller is seen from, in radii.
const VIEWED = 3
// How far a line has turned away, as a cosine, when it has faded to nothing:
// just short of the roller's rim as seen from there, past which lines would
// show through from the back.
const GONE = 1 / (VIEWED + 1) + 0.05
// The same, in radians round the roller.
const EDGE = Math.acos(GONE)
// The most a line is blurred, right at the rim, in line heights.
const BLUR = 0.14
// How far a step taken with the phone turns the roller, in lines: about a
// reading pace at a walk.
const STEP = 0.5

const rootEl = ref<HTMLElement>()
const stageEl = ref<HTMLElement>()
const textEl = ref<HTMLElement>()

// On a phone, the visitor is asked for its motion sensor. Set once the page
// is running; empty until then and after an answer.
const asksMotion = ref(false)
let enableMotion = () => {}

function allow() {
    enableMotion()
    asksMotion.value = false
}

let stop = () => {}
onBeforeUnmount(() => stop())

// The text is wrapped round a roller that fills the screen and is turned by
// scrolling. The line being read faces the reader; the lines before and
// after it turn away, backwards, over the top and under the bottom, and are
// gone before they reach the edge of the screen. Unread words are faint and
// come up to full strength as the reading reaches them. The roller has no
// end: after the last line there is a paragraph break and the text starts
// again. On a phone with motion allowed, walking turns it too.
onMounted(() => {
    const root = rootEl.value
    const stage = stageEl.value
    const paragraph = textEl.value
    if (!root || !stage || !paragraph) return
    const wordEls = [...paragraph.querySelectorAll<HTMLElement>('.info-word')]

    // Without motion, the text is a plain page that scrolls.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    root.classList.add('rolling')

    // The lines the text has wrapped into, by where they sit in the flat
    // paragraph (transforms do not move those measurements).
    interface Line {
        // Its middle, in pixels down the paragraph.
        y: number
        words: number[]
        // How many letters come before each of its words, and in all.
        before: number[]
        letters: number
        // How far each word's middle is from the middle of the page.
        across: number[]
        hidden: boolean
    }
    let lines: Line[] = []
    let lineHeight = 1
    // The length of one turn: the text and the paragraph break after it.
    let turn = 1
    let radius = 1
    let centre = 0
    let edge = EDGE

    // How far the roller has been turned, in pixels of text, and how far it
    // has been asked to turn: it follows a little behind, so a mouse wheel
    // turns it rather than jerking it. It cannot go back past the start.
    let turned = 0
    let wanted = 0
    // Pixels a millisecond, while it runs on after a flick of the finger.
    let coasting = 0
    let dirty = true

    const measure = () => {
        const was = turn
        lines = []
        let top = NaN
        wordEls.forEach((el, i) => {
            if (el.offsetTop !== top) {
                top = el.offsetTop
                lines.push({ y: top + el.offsetHeight / 2, words: [], before: [], letters: 0, across: [], hidden: false })
            }
            const line = lines[lines.length - 1]!
            line.words.push(i)
            line.before.push(line.letters)
            line.across.push(el.offsetLeft + el.offsetWidth / 2 - paragraph.clientWidth / 2)
            line.letters += words[i]!.length + 1
        })
        lineHeight = lines.length > 1 ? lines[1]!.y - lines[0]!.y : wordEls[0]!.offsetHeight
        turn = (lines.length + 1) * lineHeight

        // The roller is as tall as the screen; seen from three radii away it
        // comes out smaller, which keeps it clear of the header.
        radius = stage.clientHeight / 2
        centre = stage.clientHeight / 2 - paragraph.offsetTop

        // A line is only in one place at a time, so no more than one turn of
        // the text is ever in sight.
        edge = Math.min(EDGE, turn / 2 / radius)

        // The same place in the text, if the lines have changed.
        if (was > 1) {
            turned *= turn / was
            wanted *= turn / was
        }
        dirty = true
    }

    // How strong each word is now, and how strong it is heading for.
    const levels: number[] = wordEls.map((_, i) => i < OPENING ? 1 : FAINT)
    const targets = [...levels]

    const draw = () => {
        // A line is read, left to right, as it passes the front.
        const front = turned - lineHeight / 2
        for (let n = 0; n < lines.length; n++) {
            const line = lines[n]!
            // The nearest of its turns; before the first there is nothing.
            const lap = Math.round((front - n * lineHeight) / turn)
            const at = n * lineHeight + lap * turn
            const angle = (at - front) / radius
            if (lap < 0 || Math.abs(angle) >= edge) {
                if (!line.hidden) for (const i of line.words) wordEls[i]!.style.visibility = 'hidden'
                line.hidden = true
                continue
            }
            // Round the roller: up or down, further away and so smaller, and
            // turned away and so flatter. The perspective is worked out here
            // rather than left to the browser, which would also lean the
            // ends of each line in towards the middle, like italics.
            const turnedAway = Math.cos(angle)
            const size = VIEWED / (VIEWED + 1 - turnedAway)
            const y = (centre + Math.sin(angle) * radius * size - line.y).toFixed(2)
            // How much of the screen a line's height takes up there, which
            // comes down to nothing at the rim.
            const flat = VIEWED * ((VIEWED + 1) * turnedAway - 1) / (VIEWED + 1 - turnedAway) ** 2
            const scale = `scale(${size.toFixed(4)}, ${Math.max(flat, 0).toFixed(4)})`
            const fade = Math.min((Math.cos(angle * EDGE / edge) - GONE) / 0.55, 1)
            // Lines come in out of a blur at the bottom and go into one at
            // the top, sharpening as they fade up.
            const soft = (1 - Math.max(fade, 0)) ** 1.5 * lineHeight * BLUR
            const filter = soft > 0.1 ? `blur(${soft.toFixed(2)}px)` : ''
            const read = Math.min(Math.max((turned - at) / lineHeight, 0), 1) * line.letters
            line.words.forEach((i, w) => {
                targets[i] = i < OPENING || read > line.before[w]! ? 1 : FAINT
                // Coming into sight, a word is already as it should be.
                if (line.hidden) levels[i] = targets[i]!
                else if (levels[i] !== targets[i]) dirty = true
                const style = wordEls[i]!.style
                style.transform = `translate(${(line.across[w]! * (size - 1)).toFixed(2)}px, ${y}px) ${scale}`
                style.opacity = (levels[i]! * fade).toFixed(3)
                style.filter = filter
                if (line.hidden) style.visibility = ''
            })
            line.hidden = false
        }
    }

    // Each frame: run on after a flick, follow what has been asked for,
    // bring the words on towards their strength, and redraw if anything has
    // changed.
    const tick = (_time: number, elapsed: number) => {
        const delta = Math.min(elapsed, 50)
        if (coasting) {
            wanted = Math.max(0, wanted + coasting * delta)
            coasting *= Math.exp(-delta / 400)
            if (Math.abs(coasting) < 0.002 || !wanted) coasting = 0
        }
        const behind = wanted - turned
        if (behind) {
            turned = Math.abs(behind) < 0.05 ? wanted : turned + behind * (1 - Math.exp(-delta / 90))
            dirty = true
        }
        const step = 1 - Math.exp(-delta / 120)
        for (let i = 0; i < levels.length; i++) {
            const gap = targets[i]! - levels[i]!
            if (!gap) continue
            levels[i] = Math.abs(gap) < 0.005 ? targets[i]! : levels[i]! + gap * step
            dirty = true
        }
        if (!dirty) return
        dirty = false
        draw()
    }

    const turnBy = (distance: number) => {
        wanted = Math.max(0, wanted + distance)
        coasting = 0
    }

    // A wheel or trackpad turns it directly (but leaves pinch-zoom alone).
    const onWheel = (event: WheelEvent) => {
        if (event.ctrlKey) return
        event.preventDefault()
        const unit = event.deltaMode === 1 ? lineHeight : event.deltaMode === 2 ? stage.clientHeight : 1
        turnBy(event.deltaY * unit)
    }

    // A finger drags it, and a flick sends it running on.
    let fingerAt = 0
    let fingerTime = 0
    let flick = 0
    const onTouchStart = (event: TouchEvent) => {
        coasting = 0
        flick = 0
        fingerAt = event.touches[0]!.clientY
        fingerTime = event.timeStamp
    }
    const onTouchMove = (event: TouchEvent) => {
        if (event.touches.length > 1) return
        const y = event.touches[0]!.clientY
        const moved = fingerAt - y
        const took = Math.max(event.timeStamp - fingerTime, 1)
        flick = 0.6 * (moved / took) + 0.4 * flick
        fingerAt = y
        fingerTime = event.timeStamp
        turnBy(moved)
    }
    const onTouchEnd = (event: TouchEvent) => {
        if (event.touches.length) return
        // Only if the finger was still moving when it lifted.
        if (event.timeStamp - fingerTime < 80) coasting = flick
    }

    // The keys that would scroll a page.
    const onKey = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return
        const page = stage.clientHeight * 0.6
        const distance = ({
            'ArrowDown': lineHeight,
            'ArrowUp': -lineHeight,
            'PageDown': page,
            'PageUp': -page,
            ' ': event.shiftKey ? -page : page,
            'Home': -wanted,
        } as Record<string, number>)[event.key]
        if (distance === undefined) return
        event.preventDefault()
        turnBy(distance)
    }

    // Walking with the phone: each step turns the roller on a little. The
    // sensor cannot tell walking backwards from walking forwards, so it only
    // ever turns onwards.
    const onMotion = stepDetector(() => { coasting += lineHeight * STEP / 400 })
    type Asks = { requestPermission?: () => Promise<string> }
    const motionAsks = (window.DeviceMotionEvent as unknown as Asks | undefined)?.requestPermission
    const listen = () => window.addEventListener('devicemotion', onMotion)
    // On an iPhone this has to run inside a tap.
    enableMotion = () => {
        motionAsks?.().then(listen, () => {})
    }
    if ('DeviceMotionEvent' in window && window.matchMedia('(pointer: coarse)').matches) {
        if (motionAsks) asksMotion.value = true
        else listen()
    }

    measure()
    draw()
    gsap.ticker.add(tick)

    root.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: true })
    root.addEventListener('touchend', onTouchEnd, { passive: true })
    root.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey)

    // The lines change when the window does, or when the fonts arrive.
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)

    stop = () => {
        gsap.ticker.remove(tick)
        root.removeEventListener('wheel', onWheel)
        root.removeEventListener('touchstart', onTouchStart)
        root.removeEventListener('touchmove', onTouchMove)
        root.removeEventListener('touchend', onTouchEnd)
        root.removeEventListener('touchcancel', onTouchEnd)
        window.removeEventListener('keydown', onKey)
        window.removeEventListener('resize', measure)
        window.removeEventListener('devicemotion', onMotion)
    }
})
</script>

<template>
    <div ref="rootEl" class="info">
        <div ref="stageEl" class="info-stage">
            <div class="info-head" aria-hidden="true" />
            <p ref="textEl" class="info-text">
                <template v-for="(word, i) in words" :key="i"><span class="word info-word">{{ word }}</span>{{ ' ' }}</template>
            </p>
            <div class="info-foot" aria-hidden="true" />
        </div>
        <Transition name="fade">
            <p v-if="asksMotion" class="info-ask">
                <span>Allow motion to read by walking?</span>
                <span class="info-ask-actions">
                    <button type="button" @click="allow">Allow</button>
                    <button type="button" @click="asksMotion = false">No thanks</button>
                </span>
            </p>
        </Transition>
    </div>
</template>

<style scoped lang="scss">
// The same type and margins as the home page.
.info {
    min-height: var(--app-height, 100dvh);
    padding: 0 $grid-gutter;

    @media (max-width: 768px) {
        padding: 0 10px;
    }
}

// Set once the page is running. The page is one screen and does not scroll:
// wheel, finger and keys turn the roller instead.
.info.rolling {
    position: relative;
    height: var(--app-height, 100dvh);
    overflow: hidden;
    overflow: clip;
    overscroll-behavior: none;
    touch-action: pinch-zoom;

    .info-stage {
        height: 100%;
    }

    .info-word {
        will-change: transform, opacity, filter;
    }

    .info-head,
    .info-foot {
        display: none;
    }
}

// Without the roller the text is a plain page. The space above it stays at
// the top of the screen and the space below it stays at the bottom, so the
// text fades away before it reaches the header or the bottom edge.
.info-head,
.info-foot {
    position: sticky;
    z-index: 1;
    pointer-events: none;
}

.info-head {
    --edge: calc(#{$grid-gutter} - 10px);
    --line: 1.12rem;

    top: 0;
    // The line the header is on, then two for the text to fade out over.
    height: calc(var(--edge) + var(--line) * 3);
    background: linear-gradient(to bottom, $color-bg calc(var(--edge) + var(--line) * 1.2), rgba($color-bg, 0));

    @media (max-width: 768px) {
        --edge: 10px;
        --line: 1.4rem;
    }
}

.info-foot {
    bottom: 0;
    height: 38vh;
    background: linear-gradient(to bottom, rgba($color-bg, 0), $color-bg 82%);
}

// The question about motion, small, at the foot of the screen.
.info-ask {
    position: absolute;
    left: 50%;
    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    z-index: 2;
    transform: translateX(-50%);
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

    .info-ask-actions {
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
