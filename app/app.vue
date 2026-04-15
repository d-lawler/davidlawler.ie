<script setup lang="ts">
const cursorX = ref(0)
const cursorY = ref(0)
const cursorVisible = ref(false)
const fontsReady = ref(false)

onMounted(() => {
    cursorX.value = window.innerWidth / 2
    cursorY.value = window.innerHeight / 2

    document.body.addEventListener('mouseenter', () => {
        cursorVisible.value = true
    })
    document.body.addEventListener('mouseleave', () => {
        cursorVisible.value = false
    })
    window.addEventListener('mousemove', (e) => {
        cursorX.value = e.clientX
        cursorY.value = e.clientY
    })

    const reveal = () => { fontsReady.value = true }
    if (document.fonts?.ready) {
        document.fonts.ready.then(reveal)
        setTimeout(reveal, 2000)
    } else {
        reveal()
    }
})
</script>

<template>
  <div class="cursor" :class="{ visible: cursorVisible }" :style="{ left: `${cursorX}px`, top: `${cursorY}px` }" />
  <div class="app-root" :class="{ 'fonts-ready': fontsReady }">
    <NuxtPage />
  </div>
</template>
