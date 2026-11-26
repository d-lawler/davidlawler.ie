<script setup lang="ts">
import gsap from 'gsap'

// Sits over every page but the home page: "DL" in the left corner and
// "Index" in the right, both links back to the index. Leaving home, the home page's text first
// settles on "David Lawler", which is handed to this header and shrinks to
// "DL"; going home it grows back and is handed over again.
const { name, growing } = useSiteHeader()
const route = useRoute()
const nameEl = ref<HTMLElement>()

const letters = [...'David Lawler'].map((char, i, all) => ({
    char,
    // Everything but the initials goes when the name shrinks.
    extra: !(i === 0 || all[i - 1] === ' '),
}))

const extras = () => [...nameEl.value?.querySelectorAll<HTMLElement>('.extra') ?? []]
const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// "David Lawler" closes up into "DL".
async function shrink() {
    if (name.value !== 'name' || calm()) {
        name.value = 'short'
        return
    }
    await nextTick()
    gsap.to(extras(), {
        width: 0,
        opacity: 0,
        filter: 'blur(6px)',
        duration: 0.7,
        ease: 'expo.inOut',
        stagger: { amount: 0.2, from: 'end' },
        onComplete: () => {
            name.value = 'short'
            gsap.set(extras(), { clearProps: 'all' })
        },
    })
}

// "DL" opens out into "David Lawler".
function grow() {
    const was = name.value
    name.value = 'name'
    if (was !== 'short' || calm()) return Promise.resolve()
    return new Promise<void>((resolve) => {
        nextTick(() => {
            gsap.from(extras(), {
                width: 0,
                opacity: 0,
                filter: 'blur(6px)',
                duration: 0.8,
                ease: 'expo.inOut',
                stagger: { amount: 0.2 },
                clearProps: 'all',
                onComplete: resolve,
            })
        })
    })
}

watch(() => route.path, (to, from) => {
    if (from === '/' && to !== '/') shrink()
    else if (to === '/' && from !== '/') growing(grow())
})
</script>

<template>
    <header class="site-header">
        <p ref="nameEl" class="site-header-name" :class="name" :aria-hidden="name === 'hidden'">
            <NuxtLink to="/" class="site-header-home">
                <span aria-hidden="true"><span v-for="(letter, i) in letters" :key="i" class="char" :class="{ extra: letter.extra }">{{ letter.char }}</span></span>
                <span class="sr-only">David Lawler</span>
            </NuxtLink>
        </p>
        <Transition name="site-header-link">
            <NuxtLink v-if="route.path !== '/'" to="/" class="site-header-link">Index</NuxtLink>
        </Transition>
    </header>
</template>

<style scoped lang="scss">
// Drawn with the difference blend, so it reads on any page: the colour is
// picked to come out as the site's own text colour over its own background,
// and as near-white over black.
.site-header {
    position: fixed;
    top: calc($grid-gutter - 10px);
    left: $grid-gutter;
    right: $grid-gutter;
    z-index: 100;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    color: #d3d3d3;
    mix-blend-mode: difference;
    pointer-events: none;

    @media (max-width: 768px) {
        top: 10px;
        left: 10px;
        right: 10px;
    }
}

.site-header-name {
    white-space: pre;

    &.hidden {
        visibility: hidden;
    }

    &.short .extra {
        display: none;
    }
}

.site-header-home,
.site-header-link {
    border-bottom: 0;
    pointer-events: auto;
}

.site-header-link {
    margin-left: auto;
}

// "Index" comes up out of a blur once the name has settled, and goes the
// same way.
.site-header-link-enter-active {
    transition: opacity 0.8s ease 0.5s, filter 0.8s ease 0.5s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s;
}

.site-header-link-leave-active {
    transition: opacity 0.5s ease, filter 0.5s ease, transform 0.5s ease;
}

.site-header-link-enter-from,
.site-header-link-leave-to {
    opacity: 0;
    filter: blur(8px);
    transform: translateY(0.4em);

    @media (prefers-reduced-motion: reduce) {
        filter: none;
        transform: none;
    }
}
</style>
