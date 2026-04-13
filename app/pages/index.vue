<script setup lang="ts">
useHead({
    title: 'David Lawler',
})

const showSecond = ref(false)

onMounted(() => {
    setTimeout(() => {
        showSecond.value = true
    }, 3000)
})

const now = ref(new Date())

onMounted(() => {
    setInterval(() => {
        now.value = new Date()
    }, 1000)
})

function formatCity(timeZone: string) {
    const date = now.value.toLocaleDateString('en-GB', { timeZone, day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.')
    const time = now.value.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    return { date, time }
}

const london = computed(() => formatCity('Europe/London'))
const dublin = computed(() => formatCity('Europe/Dublin'))
</script>

<template>
    <div class="container">
        <Transition name="fade" mode="out-in">
            <p v-if="!showSecond" key="first">David Lawler</p>
            <p v-else key="second">
                Creative director and technologist working across Identities, Campaigns, and Digital Experiences, for clients in arts, culture, and
                technology. Currently at Google Brand Studio EMEA <span class="items-italic">(via YunoJuno)</span>, always at <a href="https:www.r-a-d.site">Research&nbsp;and&nbsp;Destroy</a>.
            </p>
        </Transition>
        <Transition name="fade" mode="out-in">
            <div v-if="!showSecond" key="first" class="clocks">&nbsp;</div>
            <div v-else key="second" class="clocks">
                <div class="clock-row">
                    <span class="clock-city"><span class="full">London</span><span class="abbr">LDN</span></span>
                    <span class="clock-time">{{ london.time }}</span>
                </div>
                <div class="clock-row">
                    <span class="clock-city"><span class="full">Dublin</span><span class="abbr">DUB</span></span>
                    <span class="clock-time">{{ dublin.time }}</span>
                </div>
                <div class="clock-row">
                    <span class="clock-city"><span class="full">Leixlip</span><span class="abbr">LXP</span></span>
                    <span class="clock-time">{{ dublin.time }}</span>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style lang="scss" scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.8s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.clocks {
    font-size: 1rem;
    display: flex;
    align-items: baseline;
    gap: 1em;

    @media (min-width: 769px) {
        font-size: 24px;
        gap: 2em;
    }
    position: fixed;
    bottom: $grid-gutter;
    left: $grid-margin;
    right: $grid-margin;
}

.clock-row {
    display: flex;
    align-items: baseline;
    gap: 0.3em;

    @media (min-width: 769px) {
        gap: 0.5em;
    }
}

.clock-time {
    font-family: $font-family-mono;
}

.full {
    display: none;

    @media (min-width: 769px) {
        display: inline;
    }
}

.abbr {
    display: inline;

    @media (min-width: 769px) {
        display: none;
    }
}
</style>
