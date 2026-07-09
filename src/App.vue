<template>
  <div class="app-container">
    <router-view class="main-content" />
    <Tabbar v-model="active" fixed active-color="#FF6B9D" inactive-color="#B8B8D1">
      <TabbarItem
        v-for="(item, index) in tabItems"
        :key="index"
      >
        <template #icon="{ active }">
          <span style="font-size: 20px">{{ active ? item.iconActive : item.icon }}</span>
        </template>
        {{ item.name }}
      </TabbarItem>
    </Tabbar>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Tabbar, TabbarItem } from 'vant'

const route = useRoute()
const router = useRouter()

const tabItems = [
  { name: '选食材', icon: '🥬', iconActive: '🥗', path: '/recipes' },
  { name: '今日菜单', icon: '📋', iconActive: '📑', path: '/plan' },
  { name: '采购清单', icon: '🛒', iconActive: '🛍️', path: '/shopping' },
]

function getActiveFromPath(path) {
  const idx = tabItems.findIndex(t => path.startsWith(t.path))
  return idx !== -1 ? idx : 0
}

const active = ref(getActiveFromPath(route.path))

watch(active, (val) => {
  if (route.path !== tabItems[val].path) {
    router.push(tabItems[val].path)
  }
})

watch(() => route.path, (path) => {
  const idx = getActiveFromPath(path)
  if (idx !== active.value) {
    active.value = idx
  }
})
</script>

<style>
/* ========== 全局样式 ========== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html, body, #app {
  height: 100%;
  font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
}

:root {
  --primary: #FF6B9D;
  --primary-light: #FFF0F5;
  --secondary: #07C160;
  --secondary-light: #F0FAF4;
  --bg: #FFF9FC;
  --card-bg: #FFFFFF;
  --text: #4A4A6A;
  --text-light: #9999BB;
  --border: #F0F0F8;
  --shadow: 0 2px 12px rgba(255, 107, 157, 0.1);
  --radius: 16px;
  --radius-sm: 10px;
}

body {
  background: var(--bg);
  color: var(--text);
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 60px;
}

/* Vant Tabbar 可爱风 */
.van-tabbar {
  border-top: 1px solid var(--border) !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(10px);
  box-shadow: 0 -2px 20px rgba(255, 107, 157, 0.08);
}

.van-tabbar-item {
  font-size: 11px !important;
  padding: 4px 0 !important;
}

.van-tabbar-item__icon {
  margin-bottom: 2px !important;
}
</style>
