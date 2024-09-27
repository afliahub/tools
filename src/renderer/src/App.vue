<template>
  <div class="flex flex-col h-screen p-4 relative">
    
    <!-- 悬浮按钮 -->
    <button 
      @click="toggleMenu" 
      class="absolute bottom-10 left-5 bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition"
    >
      +
    </button>

    <!-- 树形菜单 -->
    <div v-if="menuVisible" class="absolute bottom-24 left-5 flex flex-col space-y-1">
      <button 
        @click="goToHome" 
        :class="{'bg-blue-300': currentComponent === 'home', 'bg-gray-200 text-gray-800': currentComponent !== 'home'}"
        class="text-gray-800 rounded p-1 shadow-md hover:bg-gray-300 transition text-left"
      >
        Home
      </button>
      <button 
        @click="goToJsonFormatter" 
        :class="{'bg-blue-300': currentComponent === 'jsonFormatter', 'bg-gray-200 text-gray-800': currentComponent !== 'jsonFormatter'}"
        class="text-gray-800 rounded p-1 shadow-md hover:bg-gray-300 transition text-left"
      >
        JSON Formatter
      </button>
      <!-- 可以添加更多菜单项 -->
    </div>

    <!-- 根据当前组件显示内容 -->
    <component :is="currentComponent" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import JsonFormatter from './components/JsonFormatter.vue'; // 引入 JSON Formatter 组件
import Home from './components/Home.vue'; // 引入 Home 组件

const menuVisible = ref(false); // 控制菜单的显示
const currentComponent = ref(Home); // 默认显示 Home 组件

// 切换菜单的显示状态
const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
};

// 跳转到 Home 组件
const goToHome = () => {
  currentComponent.value = Home; // 设置当前组件为 Home
  menuVisible.value = false; // 隐藏菜单
};

// 跳转到 JSON Formatter 组件
const goToJsonFormatter = () => {
  currentComponent.value = JsonFormatter; // 设置当前组件为 JSON Formatter
  menuVisible.value = false; // 隐藏菜单
};
</script>

<style>
/* 样式 */
</style>
