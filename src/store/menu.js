import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMenuStore = defineStore('menu', () => {
  // 菜单数据结构：{ '2026-07-08': { '早餐': [recipeId1, ...], '午餐': [...], '晚餐': [...] } }
  const menuData = ref(loadMenuData())

  function loadMenuData() {
    try {
      const raw = localStorage.getItem('meal_planner_menu')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  function saveMenuData() {
    try {
      localStorage.setItem('meal_planner_menu', JSON.stringify(menuData.value))
    } catch (e) {
      console.error('保存菜单数据失败', e)
      // FIX: 可以在这里添加 Toast 提示，但需要导入 Toast
    }
  }

  function getDayMeals(date) {
    if (!menuData.value[date]) {
      menuData.value[date] = { '早餐': [], '午餐': [], '晚餐': [] }
    }
    return menuData.value[date]
  }

  function addRecipeToMeal(date, mealType, recipe) {
    const dayMeals = getDayMeals(date)
    // 避免重复添加
    if (!dayMeals[mealType].find(r => r.id === recipe.id)) {
      dayMeals[mealType].push(recipe)
      saveMenuData()
    }
  }

  function removeRecipeFromMeal(date, mealType, recipeId) {
    const dayMeals = getDayMeals(date)
    dayMeals[mealType] = dayMeals[mealType].filter(r => r.id !== recipeId)
    saveMenuData()
  }

  function getShoppingList(startDate, endDate) {
    // 聚合 startDate 到 endDate 之间所有菜谱的食材
    const allRecipes = []
    const dates = Object.keys(menuData.value).sort()
    for (const date of dates) {
      if (date < startDate || date > endDate) continue
      const day = menuData.value[date]
      for (const mealType of ['早餐', '午餐', '晚餐']) {
        allRecipes.push(...(day[mealType] || []))
      }
    }
    return allRecipes
  }

  return { menuData, getDayMeals, addRecipeToMeal, removeRecipeFromMeal, getShoppingList, saveMenuData }
})
