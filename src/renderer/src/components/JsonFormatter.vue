<template>
  <div class="flex flex-col h-full">
    <!-- 将 h2 改为水印 -->
    <div class="absolute inset-0 flex items-center justify-center text-red-200 text-6xl z-20 opacity-50 pointer-events-none">
      JSON Formatter
    </div>
    
    <div class="flex flex-row flex-grow">
      <textarea
        v-model="inputJson"
        @input="formatJson"
        class="w-1/2 h-full p-2 border border-gray-300 rounded resize-none" 
        placeholder="Paste your JSON..."
      ></textarea>
      <div 
        class="w-1/2 h-full p-2 border border-gray-300 rounded bg-gray-100 overflow-hidden ml-1 relative"
        @mouseenter="showCopyButton = true" 
        @mouseleave="showCopyButton = false"
      >

      <div class="flex justify-end mb-4 absolute top-2 right-1 mx-auto z-10">
        <!-- Switch to toggle between formatted JSON and JSON Schema -->
        <button 
          @click="showSchema = false" 
          :class="{'bg-blue-500 text-white': !showSchema, 'bg-gray-200 text-gray-800': showSchema}" 
          class="px-4 py-2 rounded-l-md focus:outline-none"
        >
          JSON
        </button>
        <button 
          @click="showSchema = true" 
          :class="{'bg-blue-500 text-white': showSchema, 'bg-gray-200 text-gray-800': !showSchema}" 
          class="px-4 py-2 rounded-r-md focus:outline-none"
        >
          Schema
        </button>
      </div>
        <pre v-if="showSchema" class="whitespace-pre-wrap top-1">{{ generateSchema(inputJson) }}</pre>
        <pre v-else-if="formattedJson" class="whitespace-pre-wrap">{{ formattedJson }}</pre>
        <p v-else class="text-red-500">{{ errorMessage }}</p>

        <!-- 复制按钮 -->
        <button 
          v-if="showCopyButton" 
          @click="copyToClipboard(showSchema ? generateSchema(inputJson) : formattedJson)" 
          class="absolute bottom-2 right-2 bg-blue-500 text-white px-2 py-1 rounded"
        >
          Copy It
        </button>

        <!-- 复制成功提示 -->
        <div v-if="showCopySuccess" class="absolute bottom-12 right-2 bg-green-300 text-gray-800 px-2 py-1 rounded">
          Copied!
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const inputJson = ref('');
const formattedJson = ref('');
const errorMessage = ref('');
const showSchema = ref(false); // 控制显示 JSON Schema
const showCopyButton = ref(false); // 控制复制按钮的显示
const showCopySuccess = ref(false); // 控制复制成功提示的显示

// 格式化 JSON 的方法
const formatJson = () => {
  try {
    formattedJson.value = JSON.stringify(JSON.parse(inputJson.value.trim()), null, 2); // 去掉输入的首尾空格
    errorMessage.value = '';
  } catch (error) {
    formattedJson.value = '';
    errorMessage.value = 'JSON parse error';
  }
};

// 生成 JSON Schema 的方法
const generateSchema = (json: string) => {
  try {
    const parsedJson = JSON.parse(json.trim()); // 去掉输入的首尾空格
    return JSON.stringify(generateJsonSchema(parsedJson), null, 2).trim(); // 使用 JSON.stringify 生成格式化的 JSON Schema，并去掉首尾空格
  } catch (error) {
    return 'Invalid JSON';
  }
};

// 简单的 JSON Schema 生成器
const generateJsonSchema = (obj: any) => {
  const schema: any = { type: 'object', properties: {} };
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string') {
      schema.properties[key] = { type: 'string' };
    } else if (typeof value === 'number') {
      schema.properties[key] = { type: 'number' };
    } else if (typeof value === 'boolean') {
      schema.properties[key] = { type: 'boolean' };
    } else if (Array.isArray(value)) {
      schema.properties[key] = { type: 'array', items: generateJsonSchema(value[0]) }; // 假设数组中的项是相同类型
    } else if (typeof value === 'object') {
      schema.properties[key] = generateJsonSchema(value);
    }
  }

  return schema;
};

// 复制到剪贴板的函数
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    showCopySuccess.value = true; // 显示复制成功提示
    setTimeout(() => {
      showCopySuccess.value = false; // 三秒后隐藏提示
    }, 3000);
  }).catch(err => {
    console.error('Copy fail:', err);
  });
};
</script>

<style>
/* 样式 */
pre {
  margin: 0; /* 去掉默认的 margin */
  padding: 0; /* 去掉默认的 padding */
  overflow: auto; /* 允许内容溢出时滚动 */
}

/* 水印样式 */
.absolute {
  position: absolute;
}
.inset-0 {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
.pointer-events-none {
  pointer-events: none; /* 禁用水印的鼠标事件 */
}
</style>