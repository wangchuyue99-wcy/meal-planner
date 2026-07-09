<template>
  <div class="page">
    <!-- 顶部 -->
    <div class="top-bar">
      <div class="title-row">
        <span class="title-emoji">🥗</span>
        <h3>今天吃什么</h3>
      </div>
      <button class="cloud-btn" :class="{ local: !useCloud }" @click="toggleMode">
        {{ useCloud ? '☁️ 云端' : '📱 本地' }}
      </button>
    </div>

    <!-- 日期 -->
    <div class="date-pill">
      <span class="arrow" @click="changeDate(-1)">‹</span>
      <span class="date-label">{{ displayDate }}</span>
      <span class="arrow" @click="changeDate(1)">›</span>
    </div>

    <!-- 餐次 Tab -->
    <div class="meal-tabs">
      <div
        v-for="(m, idx) in mealTypes"
        :key="m"
        class="meal-tab"
        :class="{ active: activeMealIdx === idx }"
        @click="switchMeal(idx)"
      >
        <span class="meal-emoji">{{ mealEmoji(m) }}</span>
        <span>{{ m }}</span>
      </div>
    </div>

    <!-- 食材网格 -->
    <div v-if="categoriesForMeal.length" class="food-area">
      <div v-for="cat in categoriesForMeal" :key="cat" class="cat-group">
        <div class="cat-label">
          <span>{{ catEmoji(cat) }}</span>
          <span>{{ cat }}</span>
        </div>
        <div class="food-grid">
          <div
            v-for="item in itemsByCategory(cat)"
            :key="item.id"
            class="food-card"
            :class="{ picked: isSelected(item.id) }"
            @click="toggleItem(item)"
          >
            <div class="check-circle" v-if="isSelected(item.id)">✓</div>
            <div class="food-name">{{ item.name }}</div>
            <div class="food-info">
              <span v-if="item.amount">{{ formatAmount(item.amount, item.unit) }}</span>
              <span v-if="item.note" class="food-note">{{ item.note }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-hint">
      <div class="empty-icon">🍽️</div>
      <div>暂无食材数据</div>
    </div>

    <!-- 底部已选提示 -->
    <div v-if="selectedIds.size > 0" class="bottom-badge" @click="goToPlan">
      已选 {{ selectedIds.size }} 项 · 去查看 →
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'vant'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const router = useRouter()

// 模式
const useCloud = ref(localStorage.getItem('mode') !== 'local')
function toggleMode() {
  useCloud.value = !useCloud.value
  localStorage.setItem('mode', useCloud.value ? 'cloud' : 'local')
  Toast({ message: useCloud.value ? '已切到云端模式' : '已切到本地模式', duration: 1000 })
  init()
}

// 本地食材数据
const LOCAL_FOODS = [
  { id:'lf001',name:'杂粮粥（黑米+白米）',category:'主食',meal_types:['早餐'],amount:75,unit:'g',note:'1.5两',sort_order:1 },
  { id:'lf002',name:'杂粮粥（白米+红麦）',category:'主食',meal_types:['早餐'],amount:75,unit:'g',note:'1.5两',sort_order:2 },
  { id:'lf003',name:'汤面',category:'主食',meal_types:['早餐'],amount:1,unit:'碗',note:'',sort_order:3 },
  { id:'lf004',name:'全麦面包',category:'主食',meal_types:['早餐'],amount:4.5,unit:'片',note:'4~5片',sort_order:4 },
  { id:'lf005',name:'鲜肉包',category:'主食',meal_types:['早餐'],amount:1.5,unit:'个',note:'大的',sort_order:5 },
  { id:'lf006',name:'土豆',category:'主食',meal_types:['早餐'],amount:1,unit:'个',note:'或番薯约6两',sort_order:6 },
  { id:'lf007',name:'番薯',category:'主食',meal_types:['早餐'],amount:300,unit:'g',note:'或土豆1个',sort_order:7 },
  { id:'lf008',name:'燕麦',category:'主食',meal_types:['早餐'],amount:30,unit:'g',note:'6勺干麦片',sort_order:8 },
  { id:'lf009',name:'汤粉',category:'主食',meal_types:['早餐'],amount:1,unit:'碗',note:'',sort_order:9 },
  { id:'lf010',name:'鸡蛋',category:'肉蛋类',meal_types:['早餐'],amount:1,unit:'个',note:'',sort_order:10 },
  { id:'lf011',name:'瘦肉',category:'肉蛋类',meal_types:['早餐'],amount:50,unit:'g',note:'',sort_order:11 },
  { id:'lf012',name:'虾',category:'肉蛋类',meal_types:['早餐'],amount:100,unit:'g',note:'',sort_order:12 },
  { id:'lf013',name:'脱脂牛奶',category:'奶类',meal_types:['早餐'],amount:250,unit:'ml',note:'',sort_order:13 },
  { id:'lf014',name:'无糖酸奶',category:'奶类',meal_types:['早餐'],amount:120,unit:'g',note:'',sort_order:14 },
  { id:'lf015',name:'苹果',category:'水果类',meal_types:['早餐'],amount:200,unit:'g',note:'约1个',sort_order:15 },
  { id:'lf016',name:'奇异果',category:'水果类',meal_types:['早餐'],amount:200,unit:'g',note:'2个',sort_order:16 },
  { id:'lf017',name:'油桃',category:'水果类',meal_types:['早餐'],amount:200,unit:'g',note:'2个',sort_order:17 },
  { id:'lf018',name:'雪梨',category:'水果类',meal_types:['早餐'],amount:200,unit:'g',note:'1个',sort_order:18 },
  { id:'lf019',name:'橘子',category:'水果类',meal_types:['早餐'],amount:100,unit:'g',note:'4片',sort_order:19 },
  { id:'lf020',name:'米饭',category:'主食',meal_types:['午餐','晚餐'],amount:1,unit:'碗',note:'',sort_order:20 },
  { id:'lf021',name:'汤面',category:'主食',meal_types:['午餐','晚餐'],amount:1,unit:'碗',note:'',sort_order:21 },
  { id:'lf022',name:'汤粉',category:'主食',meal_types:['午餐','晚餐'],amount:1,unit:'碗',note:'',sort_order:22 },
  { id:'lf023',name:'鱼片',category:'肉蛋类',meal_types:['午餐','晚餐'],amount:110,unit:'g',note:'',sort_order:23 },
  { id:'lf024',name:'虾',category:'肉蛋类',meal_types:['午餐','晚餐'],amount:150,unit:'g',note:'',sort_order:24 },
  { id:'lf025',name:'鸡胸肉',category:'肉蛋类',meal_types:['午餐','晚餐'],amount:110,unit:'g',note:'',sort_order:25 },
  { id:'lf026',name:'全瘦牛肉',category:'肉蛋类',meal_types:['午餐','晚餐'],amount:75,unit:'g',note:'',sort_order:26 },
  { id:'lf027',name:'瘦猪肉',category:'肉蛋类',meal_types:['午餐','晚餐'],amount:75,unit:'g',note:'',sort_order:27 },
  { id:'lf028',name:'三文鱼',category:'肉蛋类',meal_types:['午餐','晚餐'],amount:75,unit:'g',note:'',sort_order:28 },
  { id:'lf029',name:'瓜菜+叶菜',category:'蔬菜',meal_types:['午餐','晚餐'],amount:150,unit:'g',note:'瓜菜2两+叶菜1两',sort_order:29 },
  { id:'lf030',name:'瓜类+叶菜',category:'蔬菜',meal_types:['晚餐'],amount:250,unit:'g',note:'瓜类3两+叶菜2两',sort_order:30 },
  { id:'lf031',name:'植物油',category:'坚果油',meal_types:['午餐','晚餐'],amount:8,unit:'ml',note:'半汤匙 白灼蒸为主',sort_order:31 },
  { id:'lf032',name:'草莓',category:'水果类',meal_types:['加餐'],amount:200,unit:'g',note:'10个',sort_order:32 },
  { id:'lf033',name:'奇异果',category:'水果类',meal_types:['加餐'],amount:200,unit:'g',note:'2个',sort_order:33 },
  { id:'lf034',name:'橙子',category:'水果类',meal_types:['加餐'],amount:200,unit:'g',note:'1个',sort_order:34 },
  { id:'lf035',name:'油桃',category:'水果类',meal_types:['加餐'],amount:200,unit:'g',note:'2个',sort_order:35 },
  { id:'lf036',name:'雪梨',category:'水果类',meal_types:['加餐'],amount:200,unit:'g',note:'1个',sort_order:36 },
  { id:'lf037',name:'柚子',category:'水果类',meal_types:['加餐'],amount:200,unit:'g',note:'',sort_order:37 },
  { id:'lf038',name:'杏仁',category:'坚果油',meal_types:['加餐'],amount:10,unit:'g',note:'',sort_order:38 },
  { id:'lf039',name:'核桃',category:'坚果油',meal_types:['加餐'],amount:1,unit:'颗',note:'',sort_order:39 },
  { id:'lf040',name:'带壳坚果',category:'坚果油',meal_types:['加餐'],amount:20,unit:'g',note:'原味非油炸',sort_order:40 },
]

const mealTypes = ['早餐', '午餐', '晚餐', '加餐']
const activeMealIdx = ref(0)

function mealEmoji(m) {
  return { '早餐':'🌅', '午餐':'☀️', '晚餐':'🌙', '加餐':'🍵' }[m] || '🍽️'
}
function catEmoji(c) {
  return { '主食':'🍚', '肉蛋类':'🥚', '奶类':'🥛', '水果类':'🍎', '蔬菜':'🥬', '坚果油':'🥜' }[c] || '🍴'
}

const today = new Date()
const offset = today.getTimezoneOffset()
const localToday = new Date(today.getTime() - offset * 60000).toISOString().slice(0, 10)
const selectedDate = ref(localToday)

const displayDate = computed(() => {
  const d = selectedDate.value
  const days = ['日','一','二','三','四','五','六']
  const date = new Date(d + 'T00:00:00')
  return `${d.slice(5)} 周${days[date.getDay()]}`
})

const allFoodItems = ref([])
const selectedIds = ref(new Set())

const categories = ['主食', '肉蛋类', '奶类', '水果类', '蔬菜', '坚果油']

const categoriesForMeal = computed(() => {
  const cats = new Set()
  allFoodItems.value
    .filter(f => f.meal_types?.includes(mealTypes[activeMealIdx.value]))
    .forEach(f => cats.add(f.category))
  return categories.filter(c => cats.has(c))
})

function itemsByCategory(cat) {
  return allFoodItems.value.filter(f =>
    f.category === cat && f.meal_types?.includes(mealTypes[activeMealIdx.value])
  )
}

function formatAmount(amount, unit) {
  if (!amount) return ''
  if (['个','颗','片','碗'].includes(unit)) return `${amount}${unit}`
  return `${amount}${unit}`
}

function isSelected(foodId) { return selectedIds.value.has(foodId) }

function switchMeal(idx) {
  activeMealIdx.value = idx
  loadSelections()
}

// 选择
async function toggleItem(item) {
  const foodId = item.id
  const userId = 'default'
  const date = selectedDate.value
  const meal = mealTypes[activeMealIdx.value]

  if (selectedIds.value.has(foodId)) {
    selectedIds.value = new Set([...selectedIds.value].filter(id => id !== foodId))
    if (useCloud.value && isSupabaseConfigured && supabase) {
      await supabase.from('daily_selections').delete()
        .eq('user_id', userId).eq('select_date', date)
        .eq('meal_type', meal).eq('food_item_id', foodId)
    }
    Toast({ message: '已取消 💨', duration: 800 })
  } else {
    selectedIds.value = new Set([...selectedIds.value, foodId])
    if (useCloud.value && isSupabaseConfigured && supabase) {
      await supabase.from('daily_selections').upsert({
        user_id: userId, select_date: date, meal_type: meal, food_item_id: foodId
      }, { onConflict: 'user_id,select_date,meal_type,food_item_id' })
    }
    Toast({ message: '已选择 ✅', duration: 800 })
  }
  syncLocal()
}

function syncLocal() {
  const key = `meal_sel_${selectedDate.value}_${mealTypes[activeMealIdx.value]}`
  localStorage.setItem(key, JSON.stringify([...selectedIds.value]))
}

async function loadSelections() {
  if (useCloud.value && isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_selections')
        .select('food_item_id')
        .eq('user_id', 'default')
        .eq('select_date', selectedDate.value)
        .eq('meal_type', mealTypes[activeMealIdx.value])
      if (!error && data) {
        selectedIds.value = new Set(data.map(r => r.food_item_id))
        return
      }
    } catch(e) { console.error('加载云端失败', e) }
  }
  try {
    const raw = localStorage.getItem(`meal_sel_${selectedDate.value}_${mealTypes[activeMealIdx.value]}`)
    selectedIds.value = raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { selectedIds.value = new Set() }
}

function changeDate(delta) {
  const d = new Date(selectedDate.value + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  const off = d.getTimezoneOffset()
  selectedDate.value = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

function goToPlan() {
  router.push('/plan')
}

async function init() {
  if (useCloud.value && isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('food_items').select('*').order('sort_order')
      if (!error && data && data.length > 0) {
        allFoodItems.value = data
        await loadSelections()
        return
      }
    } catch(e) { console.warn('云端食材加载失败', e) }
  }
  allFoodItems.value = [...LOCAL_FOODS]
  await loadSelections()
}

onMounted(init)
watch(selectedDate, () => loadSelections())
</script>

<style scoped>
.page {
  padding: 0 0 90px;
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF0F5 0%, #F8FFF8 40%, #FFF9FC 100%);
}

/* 顶部栏 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 8px;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.title-emoji { font-size: 24px; }
.top-bar h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #FF6B9D;
}

/* 云端/本地按钮 */
.cloud-btn {
  padding: 5px 14px;
  border-radius: 20px;
  border: 1.5px solid #FF6B9D;
  background: #FFF0F5;
  color: #FF6B9D;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.cloud-btn.local {
  border-color: #B8B8D1;
  background: #F5F5FF;
  color: #B8B8D1;
}

/* 日期药丸 */
.date-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 0;
  margin: 0 20px 12px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(255,107,157,0.08);
}
.arrow {
  font-size: 22px;
  color: #FF6B9D;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.15s;
}
.arrow:active { background: #FFF0F5; }
.date-label {
  font-size: 15px;
  font-weight: 600;
  color: #4A4A6A;
  min-width: 110px;
  text-align: center;
}

/* 餐次 Tab */
.meal-tabs {
  display: flex;
  gap: 8px;
  padding: 0 20px 14px;
}
.meal-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 0;
  border-radius: 14px;
  font-size: 13px;
  color: #9999BB;
  background: #fff;
  box-shadow: 0 1px 6px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.2s;
}
.meal-tab.active {
  background: linear-gradient(135deg, #FF6B9D, #FF8FB1);
  color: #fff;
  box-shadow: 0 4px 16px rgba(255,107,157,0.25);
  font-weight: 600;
}
.meal-emoji { font-size: 16px; }

/* 食材区域 */
.food-area { padding: 0 16px; }
.cat-group { margin-bottom: 18px; }
.cat-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #9999BB;
  padding: 4px 4px 8px;
}
.food-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.food-card {
  position: relative;
  width: calc(50% - 5px);
  background: #fff;
  border-radius: 16px;
  padding: 14px 12px 12px;
  box-shadow: 0 2px 12px rgba(255,107,157,0.06);
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;
  border: 2px solid transparent;
}
.food-card:active { transform: scale(0.97); }
.food-card.picked {
  border-color: #FF6B9D;
  background: linear-gradient(135deg, #FFF0F5, #FFF9FC);
  box-shadow: 0 4px 20px rgba(255,107,157,0.15);
}
.check-circle {
  position: absolute;
  top: 8px; right: 8px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B9D, #FF8FB1);
  color: #fff;
  font-size: 13px;
  display: flex; align-items: center; justify-content: center;
}
.food-name {
  font-size: 14px;
  font-weight: 600;
  color: #4A4A6A;
  line-height: 1.3;
}
.food-info {
  margin-top: 6px;
  font-size: 12px;
  color: #9999BB;
}
.food-note {
  display: inline-block;
  background: #F8F8FF;
  padding: 2px 6px;
  border-radius: 6px;
  margin-top: 4px;
  font-size: 11px;
  color: #B8B8D1;
}

/* 空状态 */
.empty-hint {
  text-align: center;
  padding: 60px 0;
  color: #CCCCDF;
  font-size: 14px;
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }

/* 底部已选提示 */
.bottom-badge {
  position: fixed;
  bottom: 56px;
  left: 50%; transform: translateX(-50%);
  background: linear-gradient(135deg, #FF6B9D, #FF8FB1);
  color: #fff;
  padding: 10px 24px;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(255,107,157,0.3);
  cursor: pointer;
  z-index: 100;
  white-space: nowrap;
  animation: slideUp 0.3s ease;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
