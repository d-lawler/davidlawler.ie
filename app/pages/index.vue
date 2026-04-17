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
const leixlip = computed(() => formatCity('Europe/Dublin'))


const emailCopied = ref(false)

async function copyEmail() {
    await navigator.clipboard.writeText('david@davidlawler.ie')
    emailCopied.value = true
    setTimeout(() => {
        emailCopied.value = false
    }, 2000)
}
</script>

<template>
    <div class="container">
        <Transition name="fade" mode="out-in">
            <p v-if="!showSecond" key="first">David Lawler</p>
            <p v-else key="second">
                Creative Director and Technologist, working with international clients across the cultural sector, on Identity and Digital Experience.
                Currently at Google Brand Studio, EMEA. Always at <a href="https://www.r-a-d.website">Research&nbsp;and&nbsp;Destroy</a>.
            </p>
        </Transition>
        <Transition name="fade" mode="out-in">
            <div v-if="!showSecond" key="first" class="email-line">&nbsp;</div>
            <div v-else key="second" class="email-line">
                Feel free to
                <Transition name="fade" mode="out-in"><a v-if="!emailCopied" key="email"
                        href="mailto:david@davidlawler.ie" @click.prevent="copyEmail">email me</a><span v-else
                        key="copied" class="items-italic">email copied</span>
                </Transition>
            </div>
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
                    <span class="clock-time">{{ leixlip.time }}</span>
                </div>
            </div>
        </Transition>
    </div>
</template>
