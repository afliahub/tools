<template>
  <div class="flex flex-col h-full">
    <!-- 将 h2 改为水印 -->
    <div class="absolute inset-0 flex items-center justify-center text-red-200 text-6xl z-20 opacity-50 pointer-events-none">
      JSON Formatter
    </div>
    
    <div class="flex flex-row flex-grow">
      <div class="w-1/2 h-full p-2 border border-gray-300 rounded relative flex">
        <!-- 行号显示 -->
        <div class="line-numbers bg-gray-200 text-gray-700 p-2 text-right">
          <pre>{{ lineNumbers }}</pre>
        </div>
        <textarea
          v-model="inputJson"
          @input="onInput"
          @scroll="syncScroll"
          class="w-full h-full p-2 rounded resize-none" 
          placeholder="Paste your JSON..."
          ref="textarea"
        ></textarea>
        <!-- 查看历史按钮 -->
        <button 
          @click="toggleHistory" 
          class="absolute top-2 right-2 bg-gray-500 text-white px-2 py-1 rounded z-30" 
        >
          View History
        </button>
      </div> 
      <div 
        class="w-1/2 h-full p-2 border border-gray-300 rounded bg-gray-100 overflow-hidden ml-1 relative flex"
        @mouseenter="showCopyButton = true" 
        @mouseleave="showCopyButton = false"
      >
        <!-- 行号显示 -->
        <div class="line-numbers bg-gray-200 text-gray-700 p-2 text-right">
          <pre>{{ outputLineNumbers }}</pre>
        </div>
        <div class="flex flex-col w-full">
          <div class="absolute top-2 right-2 flex">
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
          <pre 
            v-if="showSchema" 
            class="whitespace-pre top-1 w-full p-2 overflow-x-auto" 
            ref="outputPre"
            @scroll="syncOutputScroll"
          >{{ generateSchema(inputJson) }}</pre>
          <pre 
            v-else-if="formattedJson" 
            class="whitespace-pre w-full p-2 overflow-x-auto" 
            ref="outputPre"
            @scroll="syncOutputScroll"
          >{{ formattedJson }}</pre>
          <p v-else class="text-red-500">{{ errorMessage }}</p>
        </div>

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

    <!-- 历史记录列表 -->
    <div v-if="showHistory" ref="historyPopup" :style="{ maxHeight: `${maxHistoryHeight}px`, width: '80%' }" class="absolute top-16 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded p-2 overflow-y-auto z-40">
      <div v-if="history.length > 10" class="mb-2">
        <input 
          v-model="searchQuery" 
          @input="filterHistory" 
          type="text" 
          placeholder="Search history..." 
          class="w-full p-2 border border-gray-300 rounded"
        />
      </div>
      <ul>
        <li v-for="(item, index) in filteredHistory" :key="index" class="flex justify-between items-center cursor-pointer hover:bg-gray-200 p-1">
          <span class="flex-grow" @click="selectHistory(item)">{{ item.json.slice(0, 100) }}{{ item.json.length > 80 ? '...' : '' }}</span>
          <button @click="removeHistory(index)" class="ml-2 text-red-500 hover:text-red-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H3a1 1 0 100 2h1v9a2 2 0 002 2h8a2 2 0 002-2V6h1a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zm3 3a1 1 0 112 0v1h-2V5zM5 8a1 1 0 011-1h8a1 1 0 011 1v7a1 1 0 01-1 1H6a1 1 0 01-1-1V8z" clip-rule="evenodd" />
            </svg>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

// 定义历史记录项的类型
interface HistoryItem {
  id: string;
  json: string;
}

// Helper function to generate a unique identifier
const generateUniqueId = (json: string) => {
  return btoa(json.replace(/\s+/g, '')); // Base64 encode the JSON string without spaces
};

const inputJson = ref('');
const formattedJson = ref('');
const errorMessage = ref('');
const showSchema = ref(false); // 控制显示 JSON Schema
const showCopyButton = ref(false); // 控制复制按钮的显示
const showCopySuccess = ref(false); // 控制复制成功提示的显示
const showHistory = ref(false); // 控制历史记录的显示
const history = ref<HistoryItem[]>([]); // 历史记录
const searchQuery = ref(''); // 搜索查询
const filteredHistory = ref<HistoryItem[]>([]); // 过滤后的历史记录
const maxHistoryHeight = ref(0); // 历史记录列表的最大高度
const lineNumbers = ref('1'); // 输入框行号
const outputLineNumbers = ref('1'); // 输出框行号
let inputTimeout: NodeJS.Timeout | null = null; // 定时器
let closeTimeout: NodeJS.Timeout | null = null; // 定时器
const historyPopup = ref<HTMLElement | null>(null); // 历史记录弹窗引用
const textarea = ref<HTMLTextAreaElement | null>(null); // 文本区域引用
const outputPre = ref<HTMLElement | null>(null); // 输出区域引用

// Load history from local storage on component mount
if (localStorage.getItem('jsonHistory')) {
  history.value = JSON.parse(localStorage.getItem('jsonHistory')!) as HistoryItem[];
  filteredHistory.value = history.value; // 初始化过滤后的历史记录
}

// Watch for changes in inputJson and update line numbers
watch(inputJson, (newValue) => {
  const lines = newValue.split('\n').length;
  lineNumbers.value = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
});

// Watch for changes in formattedJson and update output line numbers
watch([formattedJson, showSchema], () => {
  const output = showSchema.value ? generateSchema(inputJson.value) : formattedJson.value;
  const lines = output.split('\n').length;
  outputLineNumbers.value = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
});

// Watch for changes in inputJson and save to local storage
const saveToHistory = (newJson: string) => {
  try {
    JSON.parse(newJson.trim()); // 尝试解析 JSON，如果解析失败则抛出错误
    const id = generateUniqueId(newJson);
    const existingIndex = history.value.findIndex(item => item.id === id);
    if (existingIndex === -1) {
      history.value.unshift({ id, json: newJson });
    } else {
      // Move the existing item to the top
      const [existingItem] = history.value.splice(existingIndex, 1);
      history.value.unshift(existingItem);
    }
    localStorage.setItem('jsonHistory', JSON.stringify(history.value));
    filteredHistory.value = history.value; // 更新过滤后的历史记录
  } catch (error) {
    // 如果 JSON 解析失败，则不保存到历史记录
    console.error('Invalid JSON, not saving to history:', error);
  }
};

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
  const textToCopy = text.split('\n').map(line => line.trim()).join('\n'); // 去掉行号部分
  navigator.clipboard.writeText(textToCopy).then(() => {
    showCopySuccess.value = true; // 显示复制成功提示
    setTimeout(() => {
      showCopySuccess.value = false; // 三秒后隐藏提示
    }, 3000);
  }).catch(err => {
    console.error('Copy fail:', err);
  });
};

// 选择历史记录的函数
const selectHistory = (item: HistoryItem) => {
  inputJson.value = item.json;
  formatJson(); // 更新格式化后的 JSON
  // Move the selected item to the top
  const existingIndex = history.value.findIndex(historyItem => historyItem.id === item.id);
  if (existingIndex !== -1) {
    const [existingItem] = history.value.splice(existingIndex, 1);
    history.value.unshift(existingItem);
    localStorage.setItem('jsonHistory', JSON.stringify(history.value));
    filteredHistory.value = history.value; // 更新过滤后的历史记录
  }
  // 设置定时器，三秒后关闭历史记录列表
  if (closeTimeout) {
    clearTimeout(closeTimeout);
  }
  closeTimeout = setTimeout(() => {
    showHistory.value = false;
  }, 3000);
};

// 移除历史记录的函数
const removeHistory = (index: number) => {
  history.value.splice(index, 1);
  localStorage.setItem('jsonHistory', JSON.stringify(history.value));
  filteredHistory.value = history.value; // 更新过滤后的历史记录
};

// 输入事件处理函数
const onInput = () => {
  formatJson();
  if (inputTimeout) {
    clearTimeout(inputTimeout);
  }
  inputTimeout = setTimeout(() => {
    saveToHistory(inputJson.value);
  }, 5000); // 5秒后保存到历史记录
};

// 同步滚动
const syncScroll = () => {
  if (textarea.value) {
    const scrollTop = textarea.value.scrollTop;
    const lineNumbersElement = document.querySelector('.line-numbers');
    if (lineNumbersElement) {
      lineNumbersElement.scrollTop = scrollTop;
    }
  }
};

// 同步输出滚动
const syncOutputScroll = () => {
  if (outputPre.value) {
    const scrollTop = outputPre.value.scrollTop;
    const lineNumbersElement = document.querySelectorAll('.line-numbers')[1];
    if (lineNumbersElement) {
      lineNumbersElement.scrollTop = scrollTop;
    }
  }
};

// 过滤历史记录的函数
const filterHistory = () => {
  const query = searchQuery.value.toLowerCase();
  filteredHistory.value = history.value.filter(item => item.json.toLowerCase().includes(query));
};

// 切换历史记录显示
const toggleHistory = (event: MouseEvent) => {
  event.stopPropagation(); // 阻止事件冒泡
  showHistory.value = !showHistory.value;
  if (showHistory.value && closeTimeout) {
    clearTimeout(closeTimeout); // 打开历史记录时清除定时器
  }
};

// 处理点击外部事件
const handleClickOutside = (event: MouseEvent) => {
  if (historyPopup.value && !historyPopup.value.contains(event.target as Node)) {
    showHistory.value = false;
  }
};

// 设置历史记录列表的最大高度
const setMaxHistoryHeight = () => {
  maxHistoryHeight.value = window.innerHeight - 100; // 设置最大高度为窗口高度减去一定的偏移量
};

// 添加和移除全局点击事件监听器
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('resize', setMaxHistoryHeight);
  setMaxHistoryHeight(); // 初始化设置最大高度
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('resize', setMaxHistoryHeight);
});
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

/* 行号样式 */
.line-numbers {
  user-select: none;
  text-align: right;
  padding-right: 10px;
  border-right: 1px solid #ccc;
}
</style>