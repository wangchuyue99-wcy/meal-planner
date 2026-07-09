<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Tag, Toast } from 'vant'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useMenuStore } from '../store/menu'

const route = useRoute()
const router = useRouter()
const menuStore = useMenuStore()

const recipe = ref(null)
const ingredients = ref([])
const nutrition = ref(null)
const loading = ref(true)

// 模拟食材数据
const mockIngredients = {
  'm1': [
    { ingredient_name: '西红柿', amount: 2, unit: '个', category: '蔬菜' },
    { ingredient_name: '鸡蛋', amount: 3, unit: '个', category: '蛋奶' },
    { ingredient_name: '食用油', amount: 10, unit: '毫升', category: '调味品' },
    { ingredient_name: '盐', amount: 3, unit: '克', category: '调味品' },
  ],
  'm2': [
    { ingredient_name: '小米', amount: 50, unit: '克', category: '主食' },
    { ingredient_name: '水', amount: 400, unit: '毫升', category: null },
  ],
  'm3': [
    { ingredient_name: '西兰花', amount: 300, unit: '克', category: '蔬菜' },
    { ingredient_name: '大蒜', amount: 5, unit: '克', category: '蔬菜' },
    { ingredient_name: '食用油', amount: 8, unit: '毫升', category: '调味品' },
  ],
  'm4': [
    { ingredient_name: '猪排骨', amount: 300, unit: '克', category: '肉类' },
    { ingredient_name: '生姜', amount: 10, unit: '克', category: '蔬菜' },
    { ingredient_name: '酱油', amount: 15, unit: '毫升', category: '调味品' },
    { ingredient_name: '冰糖', amount: 10, unit: '克', category: '调味品' },
  ],
  'm7': [
    { ingredient_name: '燕麦', amount: 40, unit: '克', category: '主食' },
    { ingredient_name: '牛奶', amount: 250, unit: '毫升', category: '蛋奶' },
  ],
  'm8': [
    { ingredient_name: '鲜虾', amount: 300, unit: '克', category: '肉类' },
    { ingredient_name: '生姜', amount: 5, unit: '克', category: '蔬菜' },
  ],
}

const mockNutrition = {
  'm1': { calories: 220, protein: 14, fat: 14, carbs: 10 },
  'm2': { calories: 180, protein: 3.5, fat: 1, carbs: 38 },
  'm3': { calories: 120, protein: 6, fat: 5, carbs: 12 },
  'm4': { calories: 480, protein: 30, fat: 32, carbs: 18 },
  'm7': { calories: 250, protein: 10, fat: 8, carbs: 35 },
  'm8': { calories: 200, protein: 35, fat: 6, carbs: 2 },
}

function loadCustomRecipes() {
  try {
    return JSON.parse(localStorage.getItem('meal_planner_custom_recipes') || '[]')
  } catch { return [] }
}

async function fetchDetail() {
  const id = route.params.id
  loading.value = true

  if (isSupabaseConfigured && supabase) {
    const { data: r } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
    recipe.value = r

    const { data: ing } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', id)
    ingredients.value = ing || []

    const { data: nut } = await supabase
      .from('recipe_nutrition')
      .select('*')
      .eq('recipe_id', id)
      .single()
    nutrition.value = nut
  } else {
    // 先查自定义菜谱
    const custom = loadCustomRecipes().find(r => r.id === id)
    if (custom) {
      recipe.value = { name: custom.name, category: custom.category, servings: custom.servings }
      ingredients.value = custom.ingredients || []
      nutrition.value = custom.nutrition && custom.nutrition.calories ? custom.nutrition : null
    } else {
      // 查 mock 数据
      const mockMeta = {
        'm1': { name: '西红柿炒蛋', category: '午餐', servings: 1 },
        'm2': { name: '小米粥', category: '早餐', servings: 1 },
        'm3': { name: '清炒西兰花', category: '晚餐', servings: 1 },
        'm4': { name: '红烧排骨', category: '午餐', servings: 1 },
        'm7': { name: '燕麦牛奶', category: '早餐', servings: 1 },
        'm8': { name: '白灼虾', category: '晚餐', servings: 1 },
      }
      const meta = mockMeta[id]
      if (meta) {
        recipe.value = meta
        ingredients.value = mockIngredients[id] || []
        nutrition.value = mockNutrition[id] || null
      }
    }
  }
  loading.value = false
}

function getLocalDateStr(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addToMenu() {
  if (!recipe.value) return
  const today = getLocalDateStr(new Date())
  menuStore.addRecipeToMeal(today, '午餐', {
    id: route.params.id,
    name: recipe.value.name
  })
  Toast.success('已加入午餐')
  router.push('/plan')
}

onMounted(fetchDetail)
</script>

<template>
  <div class="page">
    <Button size="small" @click="router.back()">← 返回</Button>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="recipe" class="detail">
      <h2>{{ recipe.name }}</h2>
      <div class="meta">
        <Tag type="primary">{{ recipe.category }}</Tag>
        <span>{{ recipe.servings }}人份</span>
      </div>

      <h3>食材清单</h3>
      <div class="ing-list">
        <div v-for="(ing, i) in ingredients" :key="i" class="ing-item">
          <span class="ing-name">{{ ing.ingredient_name || ing.name }}</span>
          <span class="ing-amount">{{ ing.amount }} {{ ing.unit }}</span>
          <span v-if="ing.category" class="ing-cat">{{ ing.category }}</span>
        </div>
        <div v-if="ingredients.length === 0" class="empty">暂无食材数据</div>
      </div>

      <div v-if="nutrition" class="nutrition-section">
        <h3>营养信息（每份）</h3>
        <div class="nut-row">热量 {{ Math.round(nutrition.calories) }} kcal</div>
        <div class="nut-row">蛋白质 {{ Math.round(nutrition.protein) }} g</div>
        <div class="nut-row">脂肪 {{ Math.round(nutrition.fat) }} g</div>
        <div class="nut-row">碳水化合物 {{ Math.round(nutrition.carbs) }} g</div>
      </div>

      <Button type="primary" block @click="addToMenu" style="margin-top:20px">加入今日菜单</Button>
    </div>
    <div v-else class="empty">未找到菜谱</div>
  </div>
</template>

<style scoped>
.page { padding: 12px; }
.loading, .empty { text-align: center; padding: 40px 0; color: #999; }
.meta { display: flex; align-items: center; gap: 8px; margin: 8px 0 20px; font-size: 14px; color: #666; }
h3 { margin: 16px 0 8px; font-size: 15px; }
.ing-list { background: #f7f8fa; border-radius: 8px; padding: 4px 0; }
.ing-item { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
.ing-item:last-child { border-bottom: none; }
.ing-cat { color: #999; font-size: 12px; }
.nutrition-section { margin-top: 20px; background: #f7f8fa; border-radius: 8px; padding: 12px; }
.nut-row { padding: 4px 0; font-size: 14px; }
</style>
