<template>
  <div class="page">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <span class="back" @click="goBack">‹</span>
      <div class="title-row">
        <span class="title-emoji">🥬</span>
        <h3>食材管理</h3>
      </div>
      <button class="add-btn" @click="openAdd">＋</button>
    </div>

    <div class="hint" v-if="!isSupabaseConfigured">
      ⚠️ 未连接云端，无法管理食材。请确认 Supabase 配置。
    </div>

    <!-- 分类列表 -->
    <div v-if="groupedItems.length" class="list-area">
      <div v-for="group in groupedItems" :key="group.category" class="cat-group">
        <div class="cat-label">
          <span>{{ catEmoji(group.category) }}</span>
          <span>{{ group.category }}</span>
          <span class="cat-count">{{ group.items.length }}</span>
        </div>
        <div
          v-for="item in group.items"
          :key="item.id"
          class="food-row"
        >
          <div class="food-main">
            <div class="food-name">{{ item.name }}</div>
            <div class="food-info">
              <span v-if="item.amount">{{ formatAmount(item.amount, item.unit) }}</span>
              <span v-if="item.note" class="food-note">{{ item.note }}</span>
              <span class="meal-tags">
                <span v-for="m in item.meal_types" :key="m" class="meal-tag">{{ m }}</span>
              </span>
            </div>
          </div>
          <div class="row-actions">
            <span class="act edit" @click="openEdit(item)">✏️</span>
            <span class="act del" @click="confirmDelete(item)">🗑️</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="empty-hint">
      <div class="empty-icon">🍽️</div>
      <div>还没有食材，点右上角 ＋ 添加吧</div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <Popup v-model:show="showForm" position="bottom" round :style="{ height: '82%' }">
      <div class="form-sheet">
        <div class="sheet-title">{{ editingId ? '编辑食材' : '新增食材' }}</div>

        <div class="field">
          <label>名称 *</label>
          <Field v-model="form.name" placeholder="如：鸡腿肉" />
        </div>

        <div class="field">
          <label>分类 *</label>
          <div class="picker-trigger" @click="catPickerShow = true">
            {{ form.category || '请选择分类' }}
          </div>
        </div>

        <!-- 用独立 Popup 做分类选择 -->
        <Popup v-model:show="catPickerShow" position="bottom" round>
          <Picker
            :columns="categoryColumns"
            @confirm="onCatConfirm"
            @cancel="catPickerShow = false"
            :model-value="catPickerValue"
            visible-option-num="6"
            show-toolbar
            title="选择分类"
          />
        </Popup>

        <div class="field">
          <label>适用餐次 *</label>
          <CheckboxGroup v-model="form.meal_types" direction="horizontal" class="meal-checks">
            <Checkbox :name="'早餐'" shape="square">🌅 早餐</Checkbox>
            <Checkbox :name="'午餐'" shape="square">☀️ 午餐</Checkbox>
            <Checkbox :name="'晚餐'" shape="square">🌙 晚餐</Checkbox>
            <Checkbox :name="'加餐'" shape="square">🍵 加餐</Checkbox>
          </CheckboxGroup>
        </div>

        <div class="field two-col">
          <div class="col">
            <label>份量</label>
            <Field v-model="form.amount" type="number" placeholder="如 100" />
          </div>
          <div class="col">
            <label>单位</label>
            <div class="picker-trigger" @click="unitPickerShow = true">
              {{ form.unit || '请选择' }}
            </div>
          </div>
        </div>

        <Popup v-model:show="unitPickerShow" position="bottom" round>
          <Picker
            :columns="unitColumns"
            @confirm="onUnitConfirm"
            @cancel="unitPickerShow = false"
            :model-value="unitPickerValue"
            visible-option-num="7"
            show-toolbar
            title="选择单位"
          />
        </Popup>

        <div class="field">
          <label>备注</label>
          <Field v-model="form.note" placeholder="如：约1个 / 白灼为主" />
        </div>

        <div class="form-actions">
          <button class="btn-cancel" @click="showForm = false">取消</button>
          <button class="btn-save" @click="save">保存</button>
        </div>
      </div>
    </Popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog, Popup, Field, Picker, Checkbox, CheckboxGroup } from 'vant'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const router = useRouter()

const loading = ref(false)
const allItems = ref([])

const categories = ['主食', '肉蛋类', '奶类', '水果类', '蔬菜', '坚果油']
const units = ['g', 'ml', '个', '碗', '片', '颗', '汤匙']
const mealTypesAll = ['早餐', '午餐', '晚餐', '加餐']

function catEmoji(c) {
  return { '主食':'🍚', '肉蛋类':'🥚', '奶类':'🥛', '水果类':'🍎', '蔬菜':'🥬', '坚果油':'🥜' }[c] || '🍴'
}
function formatAmount(amount, unit) {
  if (!amount) return ''
  return `${amount}${unit || ''}`
}

const groupedItems = computed(() => {
  return categories
    .map(cat => ({
      category: cat,
      items: allItems.value
        .filter(i => i.category === cat)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    }))
    .filter(g => g.items.length > 0)
})

// 表单
const showForm = ref(false)
const editingId = ref(null)
const catPickerShow = ref(false)
const unitPickerShow = ref(false)

const categoryColumns = categories.map(c => ({ text: c, value: c }))
const unitColumns = units.map(u => ({ text: u, value: u }))

const form = ref({
  name: '',
  category: '',
  meal_types: [],
  amount: '',
  unit: '',
  note: ''
})

const catPickerValue = computed(() => form.value.category ? [{ text: form.value.category, value: form.value.category }] : [])
const unitPickerValue = computed(() => form.value.unit ? [{ text: form.value.unit, value: form.value.unit }] : [])

function onCatConfirm(val) {
  form.value.category = val.selectedValues[0]
  catPickerShow.value = false
}
function onUnitConfirm(val) {
  form.value.unit = val.selectedValues[0]
  unitPickerShow.value = false
}

function resetForm() {
  form.value = { name: '', category: '', meal_types: [], amount: '', unit: '', note: '' }
  editingId.value = null
}

function openAdd() {
  resetForm()
  showForm.value = true
}

function openEdit(item) {
  editingId.value = item.id
  form.value = {
    name: item.name,
    category: item.category,
    meal_types: [...(item.meal_types || [])],
    amount: item.amount ?? '',
    unit: item.unit || '',
    note: item.note || ''
  }
  showForm.value = true
}

async function loadItems() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .order('category')
      .order('sort_order')
    if (error) throw error
    allItems.value = data || []
  } catch (e) {
    console.error('加载食材失败', e)
    showToast('加载失败：' + (e.message || e))
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.name.trim()) {
    showToast('请填写名称')
    return
  }
  if (!form.value.category) {
    showToast('请选择分类')
    return
  }
  if (!form.value.meal_types.length) {
    showToast('请选择至少一个餐次')
    return
  }

  const payload = {
    name: form.value.name.trim(),
    category: form.value.category,
    meal_types: form.value.meal_types,
    amount: form.value.amount === '' ? null : Number(form.value.amount),
    unit: form.value.unit || 'g',
    note: form.value.note.trim()
  }

  try {
    if (editingId.value) {
      const { error } = await supabase
        .from('food_items')
        .update(payload)
        .eq('id', editingId.value)
      if (error) throw error
      showToast('已更新 ✅')
    } else {
      const maxSort = allItems.value.reduce((m, i) => Math.max(m, i.sort_order || 0), 0)
      const { error } = await supabase
        .from('food_items')
        .insert({ ...payload, sort_order: maxSort + 1 })
      if (error) throw error
      showToast('已添加 ✅')
    }
    showForm.value = false
    await loadItems()
  } catch (e) {
    console.error('保存失败', e)
    showToast('保存失败：' + (e.message || e))
  }
}

async function confirmDelete(item) {
  if (!supabase) {
    showToast('未连接云端，无法删除')
    return
  }
  try {
    await showConfirmDialog({
      title: '删除食材',
      message: `确定删除「${item.name}」吗？`,
      confirmButtonColor: '#FF6B9D',
      confirmButtonText: '删除'
    })
    await doDelete(item)
  } catch (e) {
    // 用户点击取消（reject 值为 'cancel'）时静默，其余视为删除失败需提示
    if (e === 'cancel' || e?.action === 'cancel') return
    console.error('删除失败', e)
    showToast('删除失败：' + (e.message || e))
  }
}

async function doDelete(item) {
  // 先清理被引用记录，避免外键约束导致删除失败
  await supabase.from('daily_selections').delete().eq('food_item_id', item.id)
  await supabase.from('shopping_list').delete().eq('food_item_id', item.id)
  const { error } = await supabase
    .from('food_items')
    .delete()
    .eq('id', item.id)
  if (error) throw error
  showToast('已删除 🗑️')
  await loadItems()
}

function goBack() {
  router.push('/recipes')
}

onMounted(() => {
  if (isSupabaseConfigured && supabase) {
    loadItems()
  } else {
    loading.value = false
  }
})
</script>

<style scoped>
.page {
  padding: 0 0 90px;
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF0F5 0%, #F8FFF8 40%, #FFF9FC 100%);
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
}
.back {
  font-size: 28px;
  color: #FF6B9D;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: center;
  margin-right: 36px;
}
.title-emoji { font-size: 22px; }
.top-bar h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: #FF6B9D;
}
.add-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #FF6B9D, #FF8FB1);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(255,107,157,0.3);
}
.add-btn:active { transform: scale(0.92); }

.hint {
  margin: 0 16px 12px;
  padding: 10px 14px;
  background: #FFF3F3;
  color: #E57373;
  border-radius: 12px;
  font-size: 13px;
}

.list-area { padding: 0 16px; }
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
.cat-count {
  background: #FFF0F5;
  color: #FF6B9D;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 8px;
}
.food-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 8px;
  box-shadow: 0 2px 10px rgba(255,107,157,0.05);
}
.food-main { flex: 1; min-width: 0; }
.food-name {
  font-size: 14px;
  font-weight: 600;
  color: #4A4A6A;
}
.food-info {
  margin-top: 4px;
  font-size: 12px;
  color: #9999BB;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.food-note {
  background: #F8F8FF;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 11px;
  color: #B8B8D1;
}
.meal-tags { display: inline-flex; gap: 3px; }
.meal-tag {
  background: #F0FAF4;
  color: #07C160;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 6px;
}
.row-actions { display: flex; gap: 10px; margin-left: 10px; }
.act {
  font-size: 18px;
  cursor: pointer;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: #F8F8FF;
}
.act:active { transform: scale(0.9); }
.act.del { background: #FFF3F3; }

.empty-hint {
  text-align: center;
  padding: 60px 0;
  color: #CCCCDF;
  font-size: 14px;
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }

/* 表单弹窗 */
.form-sheet {
  padding: 20px 20px 30px;
  height: 100%;
  overflow-y: auto;
}
.sheet-title {
  text-align: center;
  font-size: 17px;
  font-weight: 700;
  color: #FF6B9D;
  margin-bottom: 18px;
}
.field {
  margin-bottom: 16px;
}
.field.two-col {
  display: flex;
  gap: 12px;
}
.field.two-col .col { flex: 1; }
.field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #9999BB;
  margin-bottom: 6px;
}
.field :deep(.van-field) {
  background: #F8F8FF;
  border-radius: 12px;
  padding: 8px 12px;
}
.field :deep(.van-checkbox),
.field :deep(.van-checkbox-group) {
  font-size: 13px;
}
.meal-checks { gap: 12px; }
.field :deep(.van-checkbox__label) { color: #4A4A6A; }

.picker-trigger {
  background: #F8F8FF;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  color: #4A4A6A;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
.btn-cancel, .btn-save {
  flex: 1;
  padding: 12px 0;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}
.btn-cancel {
  background: #F0F0F8;
  color: #9999BB;
}
.btn-save {
  background: linear-gradient(135deg, #FF6B9D, #FF8FB1);
  color: #fff;
  box-shadow: 0 4px 16px rgba(255,107,157,0.25);
}
.btn-cancel:active, .btn-save:active { transform: scale(0.97); }
</style>
