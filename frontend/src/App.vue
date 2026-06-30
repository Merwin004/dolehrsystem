<template>
  <div id="app-root">
    <!-- Global top loading bar -->
    <div v-if="loading > 0" class="global-loader">
      <div class="global-loader-bar"></div>
    </div>
    <RouterView />
  </div>
</template>

<script setup>
import { useLoadingStore } from './stores/loading'
import { storeToRefs } from 'pinia'
const { count: loading } = storeToRefs(useLoadingStore())
</script>

<style>
.global-loader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 99999;
  background: rgba(99, 102, 241, 0.15);
}
.global-loader-bar {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #818cf8, #6366f1);
  background-size: 200% 100%;
  animation: loader-slide 1.2s ease-in-out infinite;
}
@keyframes loader-slide {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
