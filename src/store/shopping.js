/**
 * 根据菜单计划生成采购清单
 * 聚合指定日期范围内所有菜谱的食材，去重合并用量
 */
import { useMenuStore } from './menu'

// 模拟食材数据（根据菜谱ID查食材列表）
const mockIngredients = {
  'm1': [ // 西红柿炒蛋
    { ingredient_name: '西红柿', amount: 2, unit: '个', category: '蔬菜' },
    { ingredient_name: '鸡蛋', amount: 3, unit: '个', category: '蛋奶' },
    { ingredient_name: '食用油', amount: 10, unit: '毫升', category: '调味品' },
    { ingredient_name: '盐', amount: 3, unit: '克', category: '调味品' },
  ],
  'm2': [ // 小米粥
    { ingredient_name: '小米', amount: 50, unit: '克', category: '主食' },
    { ingredient_name: '水', amount: 400, unit: '毫升', category: null },
  ],
  'm3': [ // 清炒西兰花
    { ingredient_name: '西兰花', amount: 300, unit: '克', category: '蔬菜' },
    { ingredient_name: '大蒜', amount: 5, unit: '克', category: '蔬菜' },
    { ingredient_name: '食用油', amount: 8, unit: '毫升', category: '调味品' },
  ],
  'm4': [ // 红烧排骨
    { ingredient_name: '猪排骨', amount: 300, unit: '克', category: '肉类' },
    { ingredient_name: '生姜', amount: 10, unit: '克', category: '蔬菜' },
    { ingredient_name: '酱油', amount: 15, unit: '毫升', category: '调味品' },
    { ingredient_name: '冰糖', amount: 10, unit: '克', category: '调味品' },
  ],
  'm7': [ // 燕麦牛奶
    { ingredient_name: '燕麦', amount: 40, unit: '克', category: '主食' },
    { ingredient_name: '牛奶', amount: 250, unit: '毫升', category: '蛋奶' },
  ],
  'm8': [ // 白灼虾
    { ingredient_name: '鲜虾', amount: 300, unit: '克', category: '肉类' },
    { ingredient_name: '生姜', amount: 5, unit: '克', category: '蔬菜' },
  ]
}

export function generateShoppingList(startDate, endDate) {
  const menuStore = useMenuStore()
  const recipeIds = []

  // 收集日期范围内所有菜谱ID
  const dates = Object.keys(menuStore.menuData)
    .filter(d => d >= startDate && d <= endDate)
    .sort()

  for (const date of dates) {
    const day = menuStore.menuData[date]
    for (const meal of ['早餐', '午餐', '晚餐']) {
      for (const r of (day[meal] || [])) {
        if (!recipeIds.find(ri => ri.id === r.id)) {
          recipeIds.push(r)
        }
      }
    }
  }

  // 聚合食材
  const ingMap = {}
  for (const r of recipeIds) {
    const ings = mockIngredients[r.id] || []
    for (const ing of ings) {
      const key = ing.ingredient_name
      if (!ingMap[key]) {
        ingMap[key] = { name: key, amount: 0, unit: ing.unit, category: ing.category, recipes: [] }
      }
      ingMap[key].amount += ing.amount
      if (!ingMap[key].recipes.includes(r.name)) {
        ingMap[key].recipes.push(r.name)
      }
    }
  }

  // FIX: 修复排序函数，处理 category 为 null 的情况
  return Object.values(ingMap).sort((a, b) => {
    const catA = a.category || ''
    const catB = b.category || ''
    return catA.localeCompare(catB)
  })
}
