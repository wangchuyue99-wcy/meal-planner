import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useInventoryStore = defineStore('inventory', () => {
  const items = ref(loadItems())

  function loadItems() {
    try {
      const raw = localStorage.getItem('meal_planner_inventory')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function save() {
    try {
      localStorage.setItem('meal_planner_inventory', JSON.stringify(items.value))
    } catch (e) {
      console.error('保存库存数据失败', e)
    }
  }

  function addItem(item) {
    item.id = Date.now().toString()
    items.value.push(item)
    save()
  }

  function removeItem(id) {
    items.value = items.value.filter(i => i.id !== id)
    save()
  }

  function updateItem(id, updates) {
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) {
      Object.assign(items.value[idx], updates)
      save()
    }
  }

  // FIX: 辅助函数 - 获取本地时区的日期字符串 (YYYY-MM-DD)
  function getLocalDateString(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function getExpiringItems(days = 3) {
    // FIX: 使用本地时区的日期比较，避免 timezone 问题
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const threshold = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
    return items.value.filter(i => {
      if (!i.expiry_date) return false
      const d = new Date(i.expiry_date + 'T00:00:00')
      return d >= today && d <= threshold
    })
  }

  function getExpiredItems() {
    // FIX: 使用本地时区的日期比较，避免 timezone 问题
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return items.value.filter(i => {
      if (!i.expiry_date) return false
      const d = new Date(i.expiry_date + 'T00:00:00')
      return d < today
    })
  }

  return { items, addItem, removeItem, updateItem, getExpiringItems, getExpiredItems }
})
