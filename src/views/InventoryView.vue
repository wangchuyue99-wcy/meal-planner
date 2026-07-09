<script setup>
import { ref, computed } from 'vue'
import { Button, Tag, showConfirmDialog } from 'vant'
import { useInventoryStore } from '../store/inventory'

const store = useInventoryStore()

const showForm = ref(false)
const editingItem = ref(null)
const form = ref({ name: '', amount: 1, unit: '个', category: '蔬菜', expiry_date: '' })

const categories = ['蔬菜', '水果', '肉类', '蛋奶', '主食', '调味品', '豆类', '坚果']

const expiring = computed(() => store.getExpiringItems(7))
const expired = computed(() => store.getExpiredItems())
const normalItems = computed(() =>
  store.items.filter(i => {
    if (!i.expiry_date) return true
    const d = new Date(i.expiry_date)
    return d >= new Date() && !expiring.value.find(e => e.id === i.id)
  })
)

function openAdd() {
  editingItem.value = null
  form.value = { name: '', amount: 1, unit: '个', category: '蔬菜', expiry_date: '' }
  showForm.value = true
}

function openEdit(item) {
  editingItem.value = item
  form.value = { ...item }
  showForm.value = true
}

function saveForm() {
  if (!form.value.name) return
  if (editingItem.value) {
    store.updateItem(editingItem.value.id, { ...form.value })
  } else {
    store.addItem({ ...form.value })
  }
  showForm.value = false
}

async function removeItem(id) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要删除这个食材吗？',
      confirmButtonColor: '#FF6B9D',
      confirmButtonText: '删除'
    })
    store.removeItem(id)
  } catch (e) {
    if (e === 'cancel' || e?.action === 'cancel') return
    console.error('删除失败', e)
  }
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2>食材库存</h2>
      <Button type="primary" size="small" @click="openAdd">+ 添加</Button>
    </div>

    <div v-if="expired.length > 0" class="section">
      <div class="section-title warn">⚠️ 已过期</div>
      <div v-for="item in expired" :key="item.id" class="item-card expired">
        <div class="item-top">
          <strong>{{ item.name }}</strong>
          <Tag color="#ee0a24">已过期</Tag>
        </div>
        <div class="item-meta">{{ item.amount }}{{ item.unit }}</div>
        <Button size="mini" @click="removeItem(item.id)">删除</Button>
      </div>
    </div>

    <div v-if="expiring.length > 0" class="section">
      <div class="section-title warn-orange">⏰ 7天内过期</div>
      <div v-for="item in expiring" :key="item.id" class="item-card expiring">
        <div class="item-top">
          <strong>{{ item.name }}</strong>
          <Tag color="#ff976a">即将过期</Tag>
        </div>
        <div class="item-meta">{{ item.amount }}{{ item.unit }} | 过期：{{ item.expiry_date }}</div>
        <Button size="mini" @click="openEdit(item)">编辑</Button>
      </div>
    </div>

    <div class="section">
      <div v-if="normalItems.length > 0" class="section-title">库存列表</div>
      <div v-for="item in normalItems" :key="item.id" class="item-card">
        <div class="item-top">
          <strong>{{ item.name }}</strong>
          <Tag>{{ item.category }}</Tag>
        </div>
        <div class="item-meta">
          {{ item.amount }}{{ item.unit }}
          <span v-if="item.expiry_date"> | 过期：{{ item.expiry_date }}</span>
        </div>
        <div class="item-actions">
          <Button size="mini" @click="openEdit(item)">编辑</Button>
          <Button size="mini" type="danger" plain @click="removeItem(item.id)">删除</Button>
        </div>
      </div>
      <div v-if="store.items.length === 0" class="empty">暂无库存，点击上方按钮添加</div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <Dialog
      v-model:show="showForm"
      :title="editingItem ? '编辑食材' : '添加食材'"
      show-cancel-button
      show-confirm-button
      @confirm="saveForm"
      @cancel="showForm = false"
    >
      <div class="form-body">
        <div class="form-field">
          <label>名称</label>
          <input v-model="form.name" placeholder="如：西红柿" />
        </div>
        <div class="form-field">
          <label>数量</label>
          <input v-model.number="form.amount" type="number" min="0" />
        </div>
        <div class="form-field">
          <label>单位</label>
          <input v-model="form.unit" placeholder="个/克/瓶" />
        </div>
        <div class="form-field">
          <label>分类</label>
          <select v-model="form.category">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="form-field">
          <label>过期日期</label>
          <input v-model="form.expiry_date" type="date" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.page { padding: 12px; padding-bottom: 80px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; }
.section { margin-top: 16px; }
.section-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #333; }
.section-title.warn { color: #ee0a24; }
.section-title.warn-orange { color: #ff976a; }
.item-card {
  background: #fff; border-radius: 8px; padding: 12px;
  margin-bottom: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.item-card.expired { background: #fff0f0; }
.item-card.expiring { background: #fff8e6; }
.item-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.item-meta { font-size: 13px; color: #666; margin-bottom: 8px; }
.item-actions { display: flex; gap: 8px; }
.empty { text-align: center; padding: 40px 0; color: #999; }
.form-body { padding: 12px 0; }
.form-field { margin-bottom: 12px; }
.form-field label { display: block; margin-bottom: 4px; font-size: 13px; color: #666; }
.form-field input, .form-field select {
  width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;
  font-size: 14px; box-sizing: border-box; background: #fff;
}
</style>
