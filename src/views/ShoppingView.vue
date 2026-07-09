<template>
  <div class="page">
    <!-- 顶部 -->
    <div class="top-bar">
      <div class="title-row">
        <span class="title-emoji">🛒</span>
        <h3>采购清单</h3>
      </div>
      <button class="cloud-btn" :class="{ local: !useCloud }" @click="toggleMode">
        {{ useCloud ? '☁️ 云端' : '📱 本地' }}
      </button>
    </div>

    <!-- 日期范围 -->
    <div class="date-range-card">
      <div class="range-row">
        <span class="range-label">📅 从</span>
        <input type="date" v-model="dateFrom" class="date-input" />
        <span class="range-label">到</span>
        <input type="date" v-model="dateTo" class="date-input" />
      </div>
      <button class="gen-btn" @click="generateList">
        ✨ 生成清单
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-wrap">
      <div class="loading-spinner">🍳</div>
      <div class="loading-text">正在生成清单...</div>
    </div>

    <div v-else>
      <!-- 按分类展示 -->
      <div v-if="Object.keys(groupedList).length > 0" class="list-area">
        <div v-for="cat in Object.keys(groupedList)" :key="cat" class="cat-group">
          <div class="cat-label">
            <span>{{ catEmoji(cat) }}</span>
            <span>{{ cat }}</span>
            <span class="cat-count">{{ groupedList[cat].length }}项</span>
          </div>
          <div
            v-for="(item, idx) in groupedList[cat]"
            :key="item.food_item_id + idx"
            class="list-card"
            :class="{ done: item.purchased }"
            @click="togglePurchased(item)"
          >
            <div class="card-left">
              <div class="card-name">{{ item.name }}</div>
              <div class="card-amount">
                需采购：{{ formatAmt(item.total_amount, item.unit) }}
                <span v-if="item.count > 1" class="count-badge">×{{ item.count }}天</span>
              </div>
            </div>
            <div class="card-right">
              <div v-if="item.purchased" class="done-tag">✓ 已购</div>
              <div v-else class="todo-tag">待购</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="hasGenerated && Object.keys(groupedList).length === 0" class="empty-hint">
        <div class="empty-icon">🛒</div>
        <div class="empty-text">所选日期内没有选择食材</div>
        <div class="empty-hint-sub">去「选食材」页面挑选吧 🥗</div>
      </div>

      <!-- 底部操作 -->
      <div v-if="Object.keys(groupedList).length > 0" class="bottom-bar">
        <div class="total-info">
          共 <strong>{{ shoppingList.length }}</strong> 项需采购
        </div>
        <button class="mark-all-btn" @click="markAllDone">
          🎉 全部已购
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Toast } from 'vant'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

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

function catEmoji(c) {
  return { '主食':'🍚', '肉蛋类':'🥚', '奶类':'🥛', '水果类':'🍎', '蔬菜':'🥬', '坚果油':'🥜' }[c] || '🍴'
}

const useCloud = ref(localStorage.getItem('mode') !== 'local')
function toggleMode() {
  useCloud.value = !useCloud.value
  localStorage.setItem('mode', useCloud.value ? 'cloud' : 'local')
  Toast({ message: useCloud.value ? '已切到云端模式' : '已切到本地模式', duration: 1000 })
}

const today = new Date()
const offset = today.getTimezoneOffset()
const localToday = new Date(today.getTime() - offset * 60000).toISOString().slice(0, 10)
const dateFrom = ref(localToday)
const dateTo = ref(localToday)
const loading = ref(false)
const hasGenerated = ref(false)
const shoppingList = ref([])

const groupedList = computed(() => {
  const g = {}
  shoppingList.value.forEach(item => {
    if (!g[item.category]) g[item.category] = []
    g[item.category].push(item)
  })
  return g
})

function formatAmt(amount, unit) {
  if (!amount && amount !== 0) return ''
  if (['个','颗','片','碗'].includes(unit)) return `${amount}${unit}`
  return `${amount}${unit}`
}

// 生成本地模式下的采购清单
function generateLocalList() {
  const mealTypes = ['早餐', '午餐', '晚餐', '加餐']
  const map = {}

  const start = new Date(dateFrom.value + 'T00:00:00')
  const end = new Date(dateTo.value + 'T00:00:00')
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    mealTypes.forEach(meal => {
      try {
        const raw = localStorage.getItem(`meal_sel_${dateStr}_${meal}`)
        const ids = raw ? JSON.parse(raw) : []
        ids.forEach(fid => {
          const food = FOOD_MAP[fid]
          if (!food) return
          const key = fid
          if (!map[key]) {
            map[key] = {
              food_item_id: fid,
              name: food.name,
              category: food.category,
              unit: food.unit,
              total_amount: food.amount || 1,
              count: 1,
              purchased: false
            }
          } else {
            map[key].total_amount += (food.amount || 1)
            map[key].count++
          }
        })
      } catch(e) {}
    })
  }

  shoppingList.value = Object.values(map)
}

async function generateList() {
  loading.value = true
  hasGenerated.value = true

  if (!useCloud.value || !isSupabaseConfigured || !supabase) {
    generateLocalList()
    loading.value = false
    return
  }

  try {
    const { data: selections, error } = await supabase
      .from('daily_selections')
      .select('food_item_id, food_items(name, category, amount, unit)')
      .eq('user_id', 'default')
      .gte('select_date', dateFrom.value)
      .lte('select_date', dateTo.value)

    if (error) throw error

    if (!selections || selections.length === 0) {
      shoppingList.value = []
      loading.value = false
      return
    }

    const map = {}
    selections.forEach(s => {
      const fid = s.food_item_id
      const info = s.food_items
      if (!info) return
      if (!map[fid]) {
        map[fid] = {
          food_item_id: fid,
          name: info.name,
          category: info.category,
          unit: info.unit || 'g',
          total_amount: info.amount || 1,
          count: 1,
          purchased: false
        }
      } else {
        map[fid].total_amount += (info.amount || 1)
        map[fid].count++
      }
    })

    shoppingList.value = Object.values(map)
  } catch(e) {
    console.error('云端生成失败，使用本地数据:', e)
    generateLocalList()
  }
  loading.value = false
}

function togglePurchased(item) {
  item.purchased = !item.purchased
}

function markAllDone() {
  shoppingList.value.forEach(item => { item.purchased = true })
  Toast.success('🎉 已全部标记')
}

onMounted(() => { generateList() })
</script>

<style scoped>
.page {
  padding: 0 0 100px;
  min-height: 100vh;
  background: linear-gradient(180deg, #F0F8FF 0%, #FFF9FC 50%, #FFF5F8 100%);
}

/* 顶部 */
.top-bar {
  display: flex; justify-content: space-between; align-items: center;
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

/* 日期范围卡片 */
.date-range-card {
  margin: 0 16px 16px;
  background: #fff;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 2px 16px rgba(255,107,157,0.08);
}
.range-row {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap; margin-bottom: 14px;
}
.range-label { font-size: 13px; color: #9999BB; }
.date-input {
  border: 1.5px solid #F0F0F8; border-radius: 10px;
  padding: 6px 10px; font-size: 13px;
  color: #4A4A6A; font-family: inherit;
  background: #FFF9FC; cursor: pointer;
  transition: border-color 0.15s;
}
.date-input:focus { border-color: #FF6B9D; outline: none; }

.gen-btn {
  width: 100%; padding: 12px;
  background: linear-gradient(135deg, #FF6B9D, #FF8FB1);
  color: #fff; border: none; border-radius: 14px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 16px rgba(255,107,157,0.3);
  transition: all 0.2s; font-family: inherit;
}
.gen-btn:active { transform: scale(0.97); }

/* 加载中 */
.loading-wrap { text-align: center; padding: 60px 0; }
.loading-spinner { font-size: 40px; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.loading-text { font-size: 14px; color: #9999BB; margin-top: 12px; }

/* 清单区域 */
.list-area { padding: 0 16px; }
.cat-group { margin-bottom: 18px; }
.cat-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: #9999BB;
  padding: 6px 4px 8px;
}
.cat-count {
  margin-left: auto; font-size: 11px;
  background: #F5F5FF; color: #B8B8D1;
  padding: 2px 8px; border-radius: 8px;
}

/* 清单卡片 */
.list-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px; margin-bottom: 8px;
  background: #fff; border-radius: 14px;
  box-shadow: 0 1px 8px rgba(255,107,157,0.06);
  cursor: pointer; transition: all 0.2s;
  border: 1.5px solid transparent;
}
.list-card:active { transform: scale(0.98); }
.list-card.done {
  opacity: 0.55;
  border-color: #E8F8EE;
  background: #F8FFF8;
}
.card-left { flex: 1; }
.card-name { font-size: 14px; font-weight: 600; color: #4A4A6A; }
.card-amount { font-size: 12px; color: #9999BB; margin-top: 4px; }
.count-badge {
  display: inline-block;
  background: linear-gradient(135deg, #FF6B9D, #FF8FB1);
  color: #fff; font-size: 10px;
  padding: 1px 6px; border-radius: 6px; margin-left: 4px;
}
.card-right { margin-left: 12px; }
.done-tag {
  font-size: 12px; color: #07C160;
  background: #E8F8EE; padding: 4px 10px; border-radius: 10px;
}
.todo-tag {
  font-size: 12px; color: #FF6B9D;
  background: #FFF0F5; padding: 4px 10px; border-radius: 10px;
}

/* 空状态 */
.empty-hint { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 15px; color: #CCC; margin-bottom: 6px; }
.empty-hint-sub { font-size: 12px; color: #DDD; }

/* 底部操作栏 */
.bottom-bar {
  position: fixed; bottom: 56px; left: 0; right: 0;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  padding: 12px 20px;
  box-shadow: 0 -2px 20px rgba(255,107,157,0.08);
  display: flex; align-items: center; justify-content: space-between;
  z-index: 100;
}
.total-info { font-size: 13px; color: #4A4A6A; }
.total-info strong { color: #FF6B9D; font-size: 16px; }
.mark-all-btn {
  padding: 8px 18px;
  background: linear-gradient(135deg, #07C160, #38D98F);
  color: #fff; border: none; border-radius: 20px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  box-shadow: 0 2px 12px rgba(7,193,96,0.25);
  font-family: inherit; transition: all 0.15s;
}
.mark-all-btn:active { transform: scale(0.95); }
</style>
