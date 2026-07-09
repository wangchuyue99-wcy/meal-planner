import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/recipes'
  },
  {
    path: '/recipes',
    name: 'Recipes',
    component: () => import('../views/RecipesView.vue')
  },
  {
    path: '/recipes/:id',
    name: 'RecipeDetail',
    component: () => import('../views/RecipeDetailView.vue')
  },
  {
    path: '/plan',
    name: 'Plan',
    component: () => import('../views/PlanView.vue')
  },
  {
    path: '/shopping',
    name: 'Shopping',
    component: () => import('../views/ShoppingView.vue')
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('../views/InventoryView.vue')
  },
  {
    path: '/nutrition',
    name: 'Nutrition',
    component: () => import('../views/NutritionView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
