<script setup>
import { ref, computed } from 'vue'
import { Progress, Tag, Button } from 'vant'
import { useMenuStore } from '../store/menu'

const menuStore = useMenuStore()
const today = getLocalDateStr(new Date())
const selectedDate = ref(today)

function getLocalDateStr(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 营养目标（成人每日推荐）
const targets = { calories: 2000, protein: 60, fat: 65, carbs: 300 }

// 模拟菜谱营养数据
const mockNutrition = {
  'm1': { calories: 220, protein: 14, fat: 14, carbs: 10 },
  'm2': { calories: 180, protein: 3.5, fat: 1, carbs: 38 },
  'm3': { calories: 120, protein: 6, fat: 5, carbs: 12 },
  'm4': { calories: 480, protein: 30, fat: 32, carbs: 18 },
  'm5': { calories: 80, protein: 0.3, fat: 0.2, carbs: 21 },
  'm6': { calories: 260, protein: 18, fat: 16, carbs: 12 },
  'm7': { calories: 250, protein: 10, fat: 8, carbs: 35 },
  'm8': { calories: 200, protein: 35, fat: 6, carbs: 2 },
}

const dayMeals = computed(() => menuStore.getDayMeals(selectedDate.value))

const nutritionSummary = computed(() => {
  const summary = { calories: 0, protein: 0, fat: 0, carbs: 0, meals: {} }
  for (const meal of ['早餐', '午餐', '晚餐']) {
    const recipes = dayMeals.value[meal] || []
    summary.meals[meal] = { calories: 0, protein: 0, fat: 0, carbs: 0 }
    for (const r of recipes) {
      const n = mockNutrition[r.id] || {}
      summary.calories += n.calories || 0
      summary.protein += n.protein || 0
      summary.fat += n.fat || 0
      summary.carbs += n.carbs || 0
      summary.meals[meal].calories += n.calories || 0
      summary.meals[meal].protein += n.protein || 0
      summary.meals[meal].fat += n.fat || 0
      summary.meals[meal].carbs += n.carbs || 0
    }
  }
  return summary
})

// FIX: 使用本地时区的日期处理，避免 timezone 问题
function changeDate(offset) {
  const d = new Date(selectedDate.value + 'T00:00:00')
  d.setDate(d.getDate() + offset)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  selectedDate.value = `${year}-${month}-${day}`
}

function pct(val, target) {
  return Math.min(100, Math.round(val / target * 100))
}
</script>

<template>
  <div class="page">
    <div class="date-bar">
      <Button class="date-btn" size="small" @click="changeDate(-1)">←</Button>
      <span class="date-text">{{ selectedDate }}</span>
      <Button class="date-btn" size="small" @click="changeDate(1)">→</Button>
    </div>

    <div v-if="nutritionSummary.calories === 0" class="empty">
      当日暂无菜单，请先去菜单规划添加菜品
    </div>

    <div v-else>
      <h3>今日营养汇总</h3>
      <div class="nut-card">
        <div class="nut-row">
          <span class="nut-label">热量</span>
          <span class="nut-val">{{ Math.round(nutritionSummary.calories) }} / {{ targets.calories }} kcal</span>
        </div>
        <Progress :percentage="pct(nutritionSummary.calories, targets.calories)" :color="nutritionSummary.calories > targets.calories ? '#ee0a24' : '#07c160'" />
      </div>
      <div class="nut-card">
        <div class="nut-row">
          <span class="nut-label">蛋白质</span>
          <span class="nut-val">{{ Math.round(nutritionSummary.protein) }} / {{ targets.protein }} g</span>
        </div>
        <Progress :percentage="pct(nutritionSummary.protein, targets.protein)" :color="nutritionSummary.protein > targets.protein ? '#ee0a24' : '#1989fa'" />
      </div>
      <div class="nut-card">
        <div class="nut-row">
          <span class="nut-label">脂肪</span>
          <span class="nut-val">{{ Math.round(nutritionSummary.fat) }} / {{ targets.fat }} g</span>
        </div>
        <Progress :percentage="pct(nutritionSummary.fat, targets.fat)" :color="nutritionSummary.fat > targets.fat ? '#ee0a24' : '#ff976a'" />
      </div>
      <div class="nut-card">
        <div class="nut-row">
          <span class="nut-label">碳水化合物</span>
          <span class="nut-val">{{ Math.round(nutritionSummary.carbs) }} / {{ targets.carbs }} g</span>
        </div>
        <Progress :percentage="pct(nutritionSummary.carbs, targets.carbs)" :color="nutritionSummary.carbs > targets.carbs ? '#ee0a24' : '#07c160'" />
      </div>

      <h3 style="margin-top:24px">分餐营养</h3>
      <div v-for="meal in ['早餐', '午餐', '晚餐']" :key="meal" class="meal-nut">
        <h4>{{ meal }}</h4>
        <div v-if="dayMeals[meal] && dayMeals[meal].length > 0" class="meal-nut-detail">
          <span>热量 {{ Math.round(nutritionSummary.meals[meal].calories) }} kcal</span>
          <span>蛋白质 {{ Math.round(nutritionSummary.meals[meal].protein) }}g</span>
          <span>脂肪 {{ Math.round(nutritionSummary.meals[meal].fat) }}g</span>
          <span>碳水 {{ Math.round(nutritionSummary.meals[meal].carbs) }}g</span>
        </div>
        <div v-else class="no-meal">未安排</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 12px; }
.date-bar { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 8px 0 16px; }
.date-btn { background: #f0f0f0; border: none; border-radius: 6px; padding: 6px 12px; font-size: 16px; cursor: pointer; }
.date-text { font-size: 16px; font-weight: 600; }
.empty { text-align: center; padding: 40px 0; color: #999; }
h3 { font-size: 16px; margin: 16px 0 12px; }
h4 { font-size: 14px; margin: 0 0 6px; color: #333; }
.nut-card { background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.nut-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
.nut-label { color: #333; font-weight: 500; }
.nut-val { color: #666; font-size: 13px; }
.meal-nut { background: #f7f8fa; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
.meal-nut-detail { display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; color: #666; }
.no-meal { font-size: 13px; color: #999; }
</style>
