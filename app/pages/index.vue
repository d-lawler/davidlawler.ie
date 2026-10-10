<script setup lang="ts">
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { levels, radLabel } from '~/data/pretension'
import { morph, tokenize, type KeyedToken, type Token } from '~/utils/morph'

useHead({
    title: 'David Lawler',
})

const emailCopied = ref(false)

async function copyEmail() {
    await navigator.clipboard.writeText('david@davidlawler.ie')
    emailCopied.value = true
    setTimeout(() => {
        emailCopied.value = false
    }, 2000)
}

const levelIndex = ref(0)
const level = computed(() => levels[levelIndex.value]!)

function tokensFor(index: number) {
    const { bio, emailPre, emailLink, emailPost } = levels[index]!
    return tokenize(`${bio} ${emailPre}{email}${emailPost}`, {
        rad: radLabel.replace(/ /g, ' '),
        email: emailLink,
    })
}

const morphEl = ref<HTMLElement>()
const ghostsEl = ref<HTMLElement>()
const dialEl = ref<HTMLElement>()

// The page opens on the name alone, then morphs into the bio.
const words = ref<KeyedToken[]>(morph([], tokenize('David Lawler', { rad: '', email: '' })).map(t => ({ ...t, fresh: false })))
const introDone = ref(false)

let reducedMotion = false

const { random } = gsap.utils

// Each new word gets one of these entrances at random, with its own delay,
// so a version assembles itself all over the paragraph rather than sweeping
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

// The running morph. A new morph first jumps this one to its end, so every
// morph starts from a settled paragraph, however fast the slider moves.
let current: gsap.core.Timeline | undefined

// Morph the bio to `tokens`: words both versions share glide to their new
// positions (Flip), departing words leave where they stood, and new words
// arrive with randomised entrances.
async function show(tokens: Token[]) {
    const el = morphEl.value
    const ghosts = ghostsEl.value
    if (!el || !ghosts) return

    current?.progress(1).kill()

    const next = morph(words.value, tokens)
    const keptIds = new Set(next.filter(t => !t.fresh).map(t => t.id))
    // Only live words; departing clones in `.ghosts` are left to finish.
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
        const pool = token.kind === 'text' && token.text.length > 1 ? entrances : entrances.filter(e => !e.chars)
        entranceFor.set(token.id, pool[Math.floor(Math.random() * pool.length)]!)
    }

    words.value = next
    await nextTick()

    if (reducedMotion) {
        clones.forEach(c => c.remove())
        return
    }

    const tl = gsap.timeline()
    current = tl

    for (const clone of clones) {
        tl.to(clone, {
            ...exits[Math.floor(Math.random() * exits.length)]!(),
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
        const targets = entrance.chars ? wordEl.querySelectorAll('.char') : wordEl
        tl.from(targets, {
            duration: random(0.6, 1.1),
            ...entrance.vars(),
            clearProps: 'all',
        }, random(0.15, 0.75))
    }
}

watch(levelIndex, (index) => {
    if (introDone.value) show(tokensFor(index))
})

// Each level is shareable as a URL hash, e.g. /#curatorial.
const slugs = levels.map(l => l.name.toLowerCase())

function levelFromHash() {
    const index = slugs.indexOf(window.location.hash.slice(1).toLowerCase())
    if (index !== -1) levelIndex.value = index
}

watch(levelIndex, (index) => {
    history.replaceState(history.state, '', `#${slugs[index]}`)
})

onMounted(() => {
    gsap.registerPlugin(Flip)
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    levelFromHash()
    window.addEventListener('hashchange', levelFromHash)

    setTimeout(async () => {
        await show(tokensFor(levelIndex.value))
        introDone.value = true
        gsap.to(dialEl.value!, {
            autoAlpha: 1,
            y: 0,
            duration: reducedMotion ? 0 : 1.2,
            ease: 'expo.out',
            delay: reducedMotion ? 0 : 0.9,
        })
    }, 3000)
})

onBeforeUnmount(() => {
    window.removeEventListener('hashchange', levelFromHash)
})
</script>

<template>
    <div class="container">
        <p ref="morphEl" class="morph">
            <span
                v-for="word in words"
                :key="word.id"
                class="word"
                :class="{ fresh: word.fresh }"
                :data-id="word.id"
            >
                <a v-if="word.kind === 'rad'" href="https://www.r-a-d.website">{{ word.text }}</a>
                <Transition v-else-if="word.kind === 'email'" name="fade" mode="out-in">
                    <a v-if="!emailCopied" key="email" href="mailto:david@davidlawler.ie" @click.prevent="copyEmail">{{ word.text }}</a>
                    <span v-else key="copied" class="items-italic">email copied</span>
                </Transition>
                <template v-else-if="word.fresh && entranceFor.get(word.id)?.chars">
                    <span v-for="(char, c) in word.text" :key="c" class="char">{{ char }}</span>
                </template>
                <template v-else>{{ word.text }}</template>{{ word.space ? ' ' : '' }}
            </span>
            <span ref="ghostsEl" class="ghosts" aria-hidden="true" />
        </p>
        <div ref="dialEl" class="dial" :inert="!introDone">
            <label class="dial-label" for="pretension">Pretentiousness</label>
            <input
                id="pretension"
                v-model.number="levelIndex"
                class="dial-range"
                type="range"
                min="0"
                :max="levels.length - 1"
                step="1"
                :style="{ '--fill': `${levelIndex / (levels.length - 1) * 100}%` }"
                :aria-valuetext="level.name"
            >
        </div>
    </div>
</template>
