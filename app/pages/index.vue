<script setup lang="ts">
import { levels, radLabel } from '~/data/pretension'

useHead({
    title: 'David Lawler',
})

const showSecond = ref(false)

onMounted(() => {
    setTimeout(() => {
        showSecond.value = true
    }, 3000)
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
const bioParts = computed(() => level.value.bio.split('{rad}'))
</script>

<template>
    <div class="container">
        <Transition name="fade" mode="out-in">
            <p v-if="!showSecond" key="first">David Lawler</p>
            <div v-else key="second">
                <Transition name="swap" mode="out-in">
                    <p :key="levelIndex">
                        {{ bioParts[0] }}<a href="https://www.r-a-d.website">{{ radLabel.replace(/ /g, ' ') }}</a>{{ bioParts[1] }}
                        {{ level.emailPre }}<Transition name="fade" mode="out-in"><a v-if="!emailCopied" key="email"
                                href="mailto:david@davidlawler.ie" @click.prevent="copyEmail">{{ level.emailLink }}</a><span v-else
                                key="copied" class="items-italic">email copied</span>
                        </Transition>{{ level.emailPost }}
                    </p>
                </Transition>
            </div>
        </Transition>
        <Transition name="fade">
            <div v-if="showSecond" class="dial">
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
        </Transition>
    </div>
</template>
