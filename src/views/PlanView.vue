<template>
  <div class="page">
    <!-- 顶部 -->
    <div class="top-bar">
      <div class="title-row">
        <span class="title-emoji">📋</span>
        <h3>今日菜单</h3>
      </div>
      <button class="cloud-btn" :class="{ local: !useCloud }" @click="toggleMode">
        {{ useCloud ? '☁️ 云端' : '📱 本地' }}
      </button>
    </div>

    <!-- 日期 -->
    <div class="date-pill">
      <span class="arrow" @click="changeDate(-1)">‹</span>
      <input type="date" v-model="selectedDate" class="date-input" />
      <span class="arrow" @click="changeDate(1)">›</span>
    </div>

    <!-- 餐次卡片 -->
    <div v-for="meal in mealTypes" :key="meal" class="meal-card">
      <div class="meal-header">
        <span class="meal-emoji">{{ mealEmoji(meal) }}</span>
        <span class="meal-name">{{ meal }}</span>
        <span class="meal-count">{{ itemsByMeal(meal).length }}项</span>
      </div>

      <div v-if="itemsByMeal(meal).length === 0" class="empty-meal">
        还没选哦 🌱
      </div>

      <div v-else class="item-list">
        <div
          v-for="item in itemsByMeal(meal)"
          :key="item.food_item_id"
          class="food-chip"
        >
          <span class="chip-name">{{ item.name }}</span>
          <span class="chip-amount">{{ item.amount }}{{ item.unit }}</span>
          <span class="chip-remove" @click="removeItem(meal, item.food_item_id)">✕</span>
        </div>
      </div>
    </div>

    <!-- 底部统计 -->
    <div v-if="totalItems > 0" class="summary-card">
      <div class="summary-icon">🎉</div>
      <div class="summary-text">
        今天共选了 <strong>{{ totalItems }}</strong> 样食材
      </div>
      <button class="go-shop-btn" @click="goShopping">
        🛒 去生成采购清单
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const router = useRouter()

const FOOD_MAP = {
  'lf001':{name:'杂粮粥（黑米+白米）',category:'主食',unit:'g',amount:75},
  'lf002':{name:'杂粮粥（白米+红麦）',category:'主食',unit:'g',amount:75},
  'lf003':{name:'汤面',category:'主食',unit:'碗',amount:1},
  'lf004':{name:'全麦面包',category:'主食',unit:'片',amount:4.5},
  'lf005':{name:'鲜肉包',category:'主食',unit:'个',amount:1.5},
  'lf006':{name:'土豆',category:'主食',unit:'个',amount:1},
  'lf007':{name:'番薯',category:'主食',unit:'g',amount:300},
  'lf008':{name:'燕麦',category:'主食',unit:'g',amount:30},
  'lf009':{name:'汤粉',category:'主食',unit:'碗',amount:1},
  'lf010':{name:'鸡蛋',category:'肉蛋类',unit:'个',amount:1},
  'lf011':{name:'瘦肉',category:'肉蛋类',unit:'g',amount:50},
  'lf012':{name:'虾（早餐）',category:'肉蛋类',unit:'g',amount:100},
  'lf013':{name:'脱脂牛奶',category:'奶类',unit:'ml',amount:250},
  'lf014':{name:'无糖酸奶',category:'奶类',unit:'g',amount:120},
  'lf015':{name:'苹果',category:'水果类',unit:'g',amount:200},
  'lf016':{name:'奇异果',category:'水果类',unit:'g',amount:200},
  'lf017':{name:'油桃',category:'水果类',unit:'g',amount:200},
  'lf018':{name:'雪梨',category:'水果类',unit:'g',amount:200},
  'lf019':{name:'橘子',category:'水果类',unit:'g',amount:100},
  'lf020':{name:'米饭',category:'主食',unit:'碗',amount:1},
  'lf021':{name:'汤面',category:'主食',unit:'碗',amount:1},
  'lf022':{name:'汤粉',category:'主食',unit:'碗',amount:1},
  'lf023':{name:'鱼片',category:'肉蛋类',unit:'g',amount:110},
  'lf024':{name:'虾',category:'肉蛋类',unit:'g',amount:150},
  'lf025':{name:'鸡胸肉',category:'肉蛋类',unit:'g',amount:110},
  'lf026':{name:'全瘦牛肉',category:'肉蛋类',unit:'g',amount:75},
  'lf027':{name:'瘦猪肉',category:'肉蛋类',unit:'g',amount:75},
  'lf028':{name:'三文鱼',category:'肉蛋类',unit:'g',amount:75},
  'lf029':{name:'瓜菜+叶菜',category:'蔬菜',unit:'g',amount:150},
  'lf030':{name:'瓜类+叶菜',category:'蔬菜',unit:'g',amount:250},
  'lf031':{name:'植物油',category:'坚果油',unit:'ml',amount:8},
  'lf032':{name:'草莓',category:'水果类',unit:'g',amount:200},
  'lf033':{name:'奇异果',category:'水果类',unit:'g',amount:200},
  'lf034':{name:'橙子',category:'水果类',unit:'g',amount:200},
  'lf035':{name:'油桃',category:'水果类',unit:'g',amount:200},
  'lf036':{name:'雪梨',category:'水果类',unit:'g',amount:200},
  'lf037':{name:'柚子',category:'水果类',unit:'g',amount:200},
  'lf038':{name:'杏仁',category:'坚果油',unit:'g',amount:10},
  'lf039':{name:'核桃',category:'坚果油',unit:'颗',amount:1},
  'lf040':{name:'带壳坚果',category:'坚果油',unit:'g',amount:20},
}

function mealEmoji(m) {
  return { '早餐':'🌅', '午餐':'☀️', '晚餐':'🌙', '加餐':'🍵' }[m] || '🍽️'
}

const useCloud = ref(localStorage.getItem('mode') !== 'local')
function toggleMode() {
  useCloud.value = !useCloud.value
  localStorage.setItem('mode', useCloud.value ? 'cloud' : 'local')
  showToast({ message: useCloud.value ? '已切到云端模式' : '已切到本地模式', duration: 1000 })
  loadData()
}

const mealTypes = ['早餐', '午餐', '晚餐', '加餐']
const today = new Date()
const offset = today.getTimezoneOffset()
const localToday = new Date(today.getTime() - offset * 60000).toISOString().slice(0, 10)
const selectedDate = ref(localToday)
const allSelections = ref([])

const totalItems = computed(() => allSelections.value.length)

function itemsByMeal(meal) {
  return allSelections.value.filter(s => s.meal_type === meal)
}

function loadLocalData() {
  const result = []
  mealTypes.forEach(meal => {
    try {
      const raw = localStorage.getItem(`meal_sel_${selectedDate.value}_${meal}`)
      const ids = raw ? JSON.parse(raw) : []
      ids.forEach(fid => {
        const food = FOOD_MAP[fid]
        if (food) result.push({ meal_type: meal, food_item_id: fid, ...food })
      })
    } catch(e) {}
  })
  allSelections.value = result
}

async function loadData() {
  if (!useCloud.value || !isSupabaseConfigured || !supabase) {
    loadLocalData()
    return
  }
  try {
    const { data, error } = await supabase
      .from('daily_selections')
      .select('meal_type, food_item_id, food_items(name, category, amount, unit)')
      .eq('user_id', 'default')
      .eq('select_date', selectedDate.value)
    if (error) throw error
    allSelections.value = (data || []).map(s => ({
      meal_type: s.meal_type,
      food_item_id: s.food_item_id,
      name: s.food_items?.name || '',
      category: s.food_items?.category || '',
      amount: s.food_items?.amount || 0,
      unit: s.food_items?.unit || ''
    }))
  } catch(e) {
    console.error('云端加载失败，使用本地数据:', e)
    loadLocalData()
  }
}

async function removeItem(meal, foodId) {
  try {
    const key = `meal_sel_${selectedDate.value}_${meal}`
    const raw = localStorage.getItem(key)
    const ids = raw ? JSON.parse(raw) : []
    localStorage.setItem(key, JSON.stringify(ids.filter(id => id !== foodId)))
    if (useCloud.value && isSupabaseConfigured && supabase) {
      await supabase.from('daily_selections').delete()
        .eq('user_id', 'default').eq('select_date', selectedDate.value)
        .eq('meal_type', meal).eq('food_item_id', foodId)
    }
  } catch(e) {}
  loadData()
  showSuccessToast('已移除 💨')
}

function changeDate(delta) {
  const d = new Date(selectedDate.value + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  const off = d.getTimezoneOffset()
  selectedDate.value = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

function goShopping() {
  router.push('/shopping')
}

watch(selectedDate, () => loadData())
onMounted(loadData)
</script>

<style scoped>
.page {
  padding: 0 0 100px;
  min-height: 100vh;
  background: linear-gradient(180deg, #F0F8FF 0%, #FFF9FC 50%, #FFF5F8 100%);
}
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 8px;
}
.title-row { display: flex; align-items: center; gap: 6px; }
.title-emoji { font-size: 24px; }
.top-bar h3 { margin: 0; font-size: 20px; font-weight: 700; color: #4A4A6A; }

.cloud-btn {
  padding: 5px 14px; border-radius: 20px;
  border: 1.5px solid #B8B8D1; background: #F5F5FF;
  color: #B8B8D1; font-size: 12px; cursor: pointer; transition: all 0.2s;
}
.cloud-btn.local { border-color: #FF6B9D; background: #FFF0F5; color: #FF6B9D; }

/* 日期药丸 */
.date-pill {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; padding: 8px 16px; margin: 0 20px 16px;
  background: #fff; border-radius: 20px;
  box-shadow: 0 2px 12px rgba(180,180,220,0.1);
}
.arrow {
  font-size: 22px; color: #B8B8D1; cursor: pointer;
  width: 32px; height: 32px; display: flex;
  align-items: center; justify-content: center; border-radius: 50%;
}
.arrow:active { background: #F5F5FF; }
.date-input {
  border: none; background: transparent; text-align: center;
  font-size: 14px; color: #4A4A6A; font-weight: 500;
  font-family: inherit; cursor: pointer;
}

/* 餐次卡片 */
.meal-card {
  margin: 0 16px 14px;
  background: #fff;
  border-radius: 18px;
  padding: 14px 16px;
  box-shadow: 0 2px 16px rgba(255,107,157,0.06);
}
.meal-header {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 10px; padding-bottom: 8px;
  border-bottom: 1.5px solid #FFF0F5;
}
.meal-emoji { font-size: 20px; }
.meal-name { font-size: 15px; font-weight: 700; color: #4A4A6A; }
.meal-count {
  margin-left: auto; font-size: 12px;
  background: #FFF0F5; color: #FF6B9D;
  padding: 2px 10px; border-radius: 10px; font-weight: 600;
}

.empty-meal {
  text-align: center; padding: 16px 0;
  color: #CCCCDF; font-size: 13px;
}

/* 食材 chip */
.item-list { display: flex; flex-wrap: wrap; gap: 8px; }
.food-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px 6px 12px;
  background: #FFF9FC;
  border: 1.5px solid #FFE8F0;
  border-radius: 20px;
  font-size: 13px;
  transition: all 0.15s;
}
.chip-name { font-weight: 500; color: #4A4A6A; }
.chip-amount { font-size: 11px; color: #9999BB; }
.chip-remove {
  width: 18px; height: 18px; border-radius: 50%;
  background: #FFE8F0; color: #FF6B9D;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; cursor: pointer; margin-left: 2px;
  transition: all 0.15s;
}
.chip-remove:active { background: #FF6B9D; color: #fff; }

/* 底部统计 */
.summary-card {
  margin: 20px 16px 0;
  background: linear-gradient(135deg, #FFF0F5, #FFF5F8);
  border-radius: 20px; padding: 20px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(255,107,157,0.12);
}
.summary-icon { font-size: 36px; margin-bottom: 8px; }
.summary-text { font-size: 14px; color: #4A4A6A; margin-bottom: 14px; }
.summary-text strong { color: #FF6B9D; font-size: 18px; }
.go-shop-btn {
  display: inline-block;
  padding: 10px 28px;
  background: linear-gradient(135deg, #FF6B9D, #FF8FB1);
  color: #fff; border: none; border-radius: 24px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 16px rgba(255,107,157,0.3);
  transition: all 0.2s; font-family: inherit;
}
.go-shop-btn:active { transform: scale(0.96); }
</style>
