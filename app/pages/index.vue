<script setup lang="ts">
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { morph, tokenize, type KeyedToken, type Token } from '~/utils/morph'

useHead({
    title: 'David Lawler',
})

const bio = 'Creative Technologist, working with international clients across the cultural sector, on Identity and Digital Experience. Currently freelance Associate Creative Director at Google Brand Studio, EMEA. Always at {rad}. {work}, {code}, {universe}, {bored}, {email}.'

const emailCopied = ref(false)

const email = 'david@davidlawler.ie'

// Copy the address, or open the mail app where the clipboard isn't
// available (in-app browsers, insecure contexts, denied permission).
async function copyEmail() {
    try {
        await navigator.clipboard.writeText(email)
    } catch {
        window.location.href = `mailto:${email}`
        return
    }
    emailCopied.value = true
    setTimeout(() => {
        emailCopied.value = false
    }, 2000)
}

const morphEl = ref<HTMLElement>()
const ghostsEl = ref<HTMLElement>()

// The page opens on the name alone, then morphs into the bio. Fixed ids keep
// server and client renders identical.
const words = ref<KeyedToken[]>(tokenize('David Lawler')
    .map((t, i) => ({ ...t, id: -1 - i, fresh: true, order: i })))

let reducedMotion = false

const { random } = gsap.utils

// Each new word gets one of these entrances at random, with its own delay,
// so the text assembles itself all over the paragraph rather than sweeping
// left to right. `chars` entrances animate the word's letters individually.
interface Entrance {
    chars?: boolean
    vars: () => gsap.TweenVars
}

const entrances: Entrance[] = [
    // Rise out of a blur.
    { vars: () => ({ yPercent: 90, opacity: 0, filter: 'blur(8px)', ease: 'expo.out' }) },
    // Drop in from above.
    { vars: () => ({ yPercent: -90, opacity: 0, filter: 'blur(8px)', ease: 'expo.out' }) },
    // Pop up from nothing with overshoot.
    { vars: () => ({ scale: 0.2, opacity: 0, ease: 'back.out(2.6)' }) },
    // Hinge up off the baseline.
    { vars: () => ({ rotateX: -100, transformOrigin: '50% 100%', opacity: 0, ease: 'power4.out' }) },
    // Swing in at a slight tilt.
    { vars: () => ({ rotate: random(-14, 14), x: random(-24, 24), opacity: 0, ease: 'elastic.out(1, 0.55)' }) },
    // Stretch in from a smear.
    { vars: () => ({ scaleX: 2.2, transformOrigin: '0% 50%', opacity: 0, filter: 'blur(12px)', ease: 'expo.out' }) },
    // Type on, letter by letter.
    { chars: true, vars: () => ({ opacity: 0, duration: 0.01, stagger: 0.035, ease: 'none' }) },
    // Letters converge from a scatter.
    { chars: true, vars: () => ({ x: () => random(-30, 30), y: () => random(-30, 30), rotate: () => random(-60, 60), opacity: 0, stagger: { each: 0.02, from: 'random' }, ease: 'expo.out' }) },
    // Letters flip up one after another.
    { chars: true, vars: () => ({ rotateX: -90, yPercent: 40, opacity: 0, transformOrigin: '50% 100%', stagger: 0.025, ease: 'back.out(2)' }) },
]

const wholeWordEntrances = entrances.filter(e => !e.chars)
const letterEntrances = entrances.filter(e => e.chars)

function pick<T>(list: T[]) {
    return list[Math.floor(Math.random() * list.length)]!
}

// Departing words leave in one of these ways.
const exits: (() => gsap.TweenVars)[] = [
    () => ({ yPercent: -70, opacity: 0, filter: 'blur(8px)' }),
    () => ({ yPercent: 70, opacity: 0, filter: 'blur(8px)' }),
    () => ({ scale: 0.4, opacity: 0 }),
    () => ({ rotateX: 90, transformOrigin: '50% 0%', opacity: 0 }),
    () => ({ x: random(-40, 40), opacity: 0, filter: 'blur(12px)' }),
    () => ({ letterSpacing: '0.4em', opacity: 0, filter: 'blur(6px)' }),
]

// Entrance chosen for each fresh word id; read while rendering to decide
// whether the word is split into letters.
const entranceFor = new Map<number, Entrance>()

// The name renders split into letters on both server and client; its
// entrances are picked at random once the page is running.
const splitOnly: Entrance = { chars: true, vars: () => ({}) }
for (const word of words.value) entranceFor.set(word.id, splitOnly)

// Animate a word (or block) in with a random entrance on `tl`.
function enter(tl: gsap.core.Timeline, el: HTMLElement, entrance: Entrance, duration: number, at: number) {
    const chars = el.querySelectorAll('.char')
    tl.from(entrance.chars && chars.length ? chars : el, {
        duration,
        ...entrance.vars(),
        clearProps: 'all',
    }, at)
}

// Morph the paragraph to `tokens`: departing words leave where they stood,
// words both versions share glide to their new positions (Flip), and new
// words arrive with randomised entrances. `brisk` is for the way out: the
// new words come quickly and always letter by letter, which is how the
// header draws the name it is about to take over. Resolves when it is done.
async function show(tokens: Token[], brisk = false) {
    const el = morphEl.value
    const ghosts = ghostsEl.value
    if (!el || !ghosts) return

    const next = morph(words.value, tokens)
    const keptIds = new Set(next.filter(t => !t.fresh).map(t => t.id))
    const wordEls = [...el.querySelectorAll<HTMLElement>(':scope > .word')]
    const kept = wordEls.filter(w => keptIds.has(Number(w.dataset.id)))
    const leaving = wordEls.filter(w => !keptIds.has(Number(w.dataset.id)))

    // Departing words are swapped for absolutely positioned clones, so the
    // live text can reflow while the clones leave from where they stood.
    const box = el.getBoundingClientRect()
    const clones = leaving.map((w) => {
        const rect = w.getBoundingClientRect()
        const clone = w.cloneNode(true) as HTMLElement
        clone.className = 'ghost'
        clone.removeAttribute('data-id')
        clone.removeAttribute('style')
        clone.style.left = `${rect.left - box.left}px`
        clone.style.top = `${rect.top - box.top}px`
        ghosts.appendChild(clone)
        return clone
    })

    const state = Flip.getState(kept)

    entranceFor.clear()
    for (const token of next) {
        if (!token.fresh) continue
        const pool = brisk ? letterEntrances : token.kind === 'text' && token.text.length > 1 ? entrances : wholeWordEntrances
        entranceFor.set(token.id, pick(pool))
    }

    words.value = next
    await nextTick()

    if (reducedMotion) {
        clones.forEach(c => c.remove())
        return
    }

    const tl = gsap.timeline()

    for (const clone of clones) {
        tl.to(clone, {
            ...pick(exits)(),
            duration: random(0.3, 0.5),
            ease: 'power2.in',
            onComplete: () => clone.remove(),
        }, random(0, 0.15))
    }

    tl.add(Flip.from(state, {
        duration: 0.85,
        ease: 'expo.inOut',
        stagger: { amount: 0.12, from: 'random' },
    }), 0)

    // New words are hidden immediately (from-tweens render their start state
    // straight away), then each arrives on its own random beat.
    for (const wordEl of el.querySelectorAll<HTMLElement>(':scope > .word.fresh')) {
        const entrance = entranceFor.get(Number(wordEl.dataset.id))
        if (!entrance) continue
        if (brisk) enter(tl, wordEl, entrance, random(0.5, 0.7), random(0.1, 0.3))
        else enter(tl, wordEl, entrance, random(0.6, 1.1), random(0.15, 0.75))
    }

    if (tl.duration()) await new Promise<void>((resolve) => { tl.eventCallback('onComplete', resolve) })
}

// Morph the name into the bio.
function revealBio() {
    if (leaving) return
    show(tokenize(bio, {
        rad: { text: 'Research and Destroy', href: 'https://r-a-d.website' },
        work: { text: 'See visuals', href: '/visuals' },
        code: { text: 'see code', href: 'https://github.com/d-lawler' },
        universe: { text: 'see the future', href: '/universe' },
        bored: { text: 'be bored', href: '/info' },
        email: { text: 'email me' },
    }))
}

// Animate the name in once the fonts are ready (or after 2s, matching the
// page reveal in app.vue), hold it, then morph into the bio.
async function playIntro() {
    await Promise.race([
        document.fonts?.ready,
        new Promise(resolve => setTimeout(resolve, 2000)),
    ])

    if (reducedMotion) {
        setTimeout(revealBio, 2500)
        return
    }

    // Each word of the name gets a random entrance, like the bio's words.
    const tl = gsap.timeline({ onComplete: () => { gsap.delayedCall(1.4, revealBio) } })
    for (const wordEl of morphEl.value!.querySelectorAll<HTMLElement>(':scope > .word')) {
        enter(tl, wordEl, pick(entrances), random(0.9, 1.4), random(0, 0.4))
    }
}

// The header carries the name between pages. Arriving from another page it
// is already showing "David Lawler" exactly where this page draws it, so
// there is no entrance: wait for the header and the page to settle, take the
// name back, then morph into the bio.
const header = useSiteHeader()
let leaving = false

// Only one of them draws the name at a time: while the header has it, this
// page's own text is out of sight, or the two would show through each other.
const handedOver = ref(header.name.value !== 'hidden')

async function takeName() {
    await Promise.all([
        header.whenGrown(),
        new Promise(resolve => setTimeout(resolve, 1500)),
    ])
    if (leaving) return
    header.name.value = 'hidden'
    handedOver.value = false
    gsap.delayedCall(0.5, revealBio)
}

// Leaving for another page, the text first settles back on the name, which
// is handed to the header to shrink into "DL".
onBeforeRouteLeave(async () => {
    leaving = true
    if (!reducedMotion) await show(tokenize('David Lawler'), true)
    header.name.value = 'name'
    handedOver.value = true
    await nextTick()
})

onMounted(() => {
    gsap.registerPlugin(Flip)
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (header.name.value === 'hidden') playIntro()
    else takeName()
})
</script>

<template>
    <div class="container">
        <p ref="morphEl" class="morph" :style="{ visibility: handedOver ? 'hidden' : undefined }">
            <span
                v-for="word in words"
                :key="word.id"
                class="word"
                :class="{ fresh: word.fresh }"
                :data-id="word.id"
            >
                <template v-if="word.kind === 'link'"><NuxtLink :to="word.href" :target="word.href?.startsWith('http') ? '_blank' : undefined" :class="{ shimmer: word.href === '/universe' }">{{ word.text }}</NuxtLink>{{ word.suffix }}</template>
                <template v-else-if="word.kind === 'email'"><Transition name="fade" mode="out-in">
                    <a v-if="!emailCopied" key="email" :href="`mailto:${email}`" @click.prevent="copyEmail">{{ word.text }}</a>
                    <span v-else key="copied" class="items-italic">email copied</span>
                </Transition>{{ word.suffix }}</template>
                <template v-else-if="word.fresh && entranceFor.get(word.id)?.chars">
                    <!-- Letters are for the animation; screen readers get the whole word. -->
                    <span aria-hidden="true"><span v-for="(char, c) in word.text" :key="c" class="char">{{ char }}</span></span>
                    <span class="sr-only">{{ word.text }}</span>
                </template>
                <template v-else>{{ word.text }}</template>{{ word.space ? ' ' : '' }}
            </span>
            <span ref="ghostsEl" class="ghosts" aria-hidden="true" />
        </p>
    </div>
</template>
