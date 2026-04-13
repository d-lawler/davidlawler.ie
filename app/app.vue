<script setup lang="ts">
const cursorX = ref(0)
const cursorY = ref(0)
const cursorVisible = ref(false)

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
})
</script>

<template>
  <div class="cursor" :class="{ visible: cursorVisible }" :style="{ left: `${cursorX}px`, top: `${cursorY}px` }" />
  <NuxtPage />
</template>
