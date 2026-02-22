
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import emptyHappy from './assets/empty-happy.svg'
import cornerSpark from './assets/corner-spark.svg'
import cornerLeaf from './assets/corner-leaf.svg'
import { getSupabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

const STORAGE_KEY = 'nutri-app-state'
const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001'

type MealType =
  | 'Desayuno'
  | 'Media mañana'
  | 'Almuerzo'
  | 'Merienda'
  | 'Cena'
  | 'Snacks'

type FoodCategory =
  | 'Frutas'
  | 'Verduras'
  | 'Proteínas'
  | 'Granos'
  | 'Lácteos'
  | 'Grasas saludables'
  | 'Bebidas'
  | 'Otros'

type FoodItem = {
  id: string
  name: string
  category: FoodCategory
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

type MealEntry = {
  id: string
  name: string
  mealType: MealType
  time: string
  date: string
  portion: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  note: string
}

type Goals = {
  mode: 'Mantenimiento' | 'Pérdida' | 'Ganancia'
  caloriesTarget: number
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  reminders: boolean
}

type ActivityEntry = {
  id: string
  name: string
  category: ActivityCategory
  minutes: number
  intensity: 'Suave' | 'Moderada' | 'Alta'
  time: string
  date: string
}

type Profile = {
  name: string
  sex: 'Femenino' | 'Masculino'
  age: number
  height: number
  weight: number
  goalWeight: number
  activity: 'Baja' | 'Moderada' | 'Alta' | 'Muy alta'
}

type WeightEntry = {
  id: string
  weight: number
  date: string
  note: string
}

type BodyCompositionEntry = {
  id: string
  date: string
  fatPercentage: number | null
  muscleMass: number | null
  waterPercentage: number | null
  visceralFat: number | null
  boneMass: number | null
  metabolicAge: number | null
  note: string
}

type ActivityCategory =
  | 'Tenis'
  | 'Fútbol'
  | 'Funcional'
  | 'Gimnasio'
  | 'Caminata'
  | 'Running'
  | 'Yoga'
  | 'Fuerza'
  | 'Pilates'
  | 'Otro'

type FastingProtocol = {
  enabled: boolean
  method: '16:8'
  eatingWindowStart: string
  eatingWindowEnd: string
  mealSchedule: { meal: MealType; time: string }[]
  fastingAllowedFoods: string[]
  freeDays: number[] // 0=Dom, 6=Sab
}

type MealSuggestion = {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  mealType: MealType
  tags: string[]
}

type AppState = {
  meals: MealEntry[]
  waterGlasses: number
  goals: Goals
  favorites: string[]
  customFoods: FoodItem[]
  streak: number
  lastActiveDate: string
  theme: 'light' | 'dark'
  profile: Profile
  activities: ActivityEntry[]
  weightHistory: WeightEntry[]
  bodyComposition: BodyCompositionEntry[]
  openaiApiKey: string
  fastingProtocol: FastingProtocol
  dailySteps: { date: string; steps: number }[]
  weddingDate: string
}

type OpenAIEstimate = {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  confidence: 'alta' | 'media' | 'baja'
  detectedIngredients: string[]
  reasoning: string
}

type Toast = { id: string; message: string }

const mealTypes: MealType[] = [
  'Desayuno',
  'Media mañana',
  'Almuerzo',
  'Merienda',
  'Cena',
  'Snacks'
]

const mealTypeStyles: Record<MealType, string> = {
  Desayuno: 'bg-sage-100 text-sage-700',
  'Media mañana': 'bg-soil-100 text-soil-700',
  Almuerzo: 'bg-coral-100 text-coral-700',
  Merienda: 'bg-sage-100 text-sage-700',
  Cena: 'bg-soil-100 text-soil-700',
  Snacks: 'bg-coral-100 text-coral-700'
}

// Base de datos expandida de alimentos con valores nutricionales por porción estándar
const baseFoods: FoodItem[] = [
  // === FRUTAS ===
  { id: 'f-1', name: 'Manzana', category: 'Frutas', calories: 95, protein: 0, carbs: 25, fat: 0, fiber: 4 },
  { id: 'f-2', name: 'Banana', category: 'Frutas', calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3 },
  { id: 'f-3', name: 'Naranja', category: 'Frutas', calories: 62, protein: 1, carbs: 15, fat: 0, fiber: 3 },
  { id: 'f-4', name: 'Frutilla', category: 'Frutas', calories: 50, protein: 1, carbs: 12, fat: 0, fiber: 3 },
  { id: 'f-5', name: 'Ensalada de frutas', category: 'Frutas', calories: 120, protein: 1, carbs: 30, fat: 0, fiber: 4 },
  { id: 'f-6', name: 'Licuado de frutas', category: 'Frutas', calories: 180, protein: 4, carbs: 35, fat: 2, fiber: 3 },
  { id: 'f-7', name: 'Fruta enlatada light', category: 'Frutas', calories: 70, protein: 0, carbs: 18, fat: 0, fiber: 2 },
  { id: 'f-8', name: 'Pasas de uva', category: 'Frutas', calories: 130, protein: 1, carbs: 34, fat: 0, fiber: 2 },
  { id: 'f-9', name: 'Orejones (fruta deshidratada)', category: 'Frutas', calories: 95, protein: 1, carbs: 25, fat: 0, fiber: 3 },

  // === VERDURAS Y HORTALIZAS ===
  { id: 'v-1', name: 'Tomate', category: 'Verduras', calories: 22, protein: 1, carbs: 5, fat: 0, fiber: 1 },
  { id: 'v-2', name: 'Papa', category: 'Verduras', calories: 160, protein: 4, carbs: 37, fat: 0, fiber: 4 },
  { id: 'v-3', name: 'Batata', category: 'Verduras', calories: 115, protein: 2, carbs: 27, fat: 0, fiber: 4 },
  { id: 'v-4', name: 'Choclo', category: 'Verduras', calories: 125, protein: 4, carbs: 27, fat: 2, fiber: 3 },
  { id: 'v-5', name: 'Calabaza', category: 'Verduras', calories: 50, protein: 2, carbs: 12, fat: 0, fiber: 3 },
  { id: 'v-6', name: 'Zapallitos', category: 'Verduras', calories: 20, protein: 1, carbs: 4, fat: 0, fiber: 1 },
  { id: 'v-7', name: 'Berenjena', category: 'Verduras', calories: 35, protein: 1, carbs: 9, fat: 0, fiber: 3 },
  { id: 'v-8', name: 'Brócoli', category: 'Verduras', calories: 55, protein: 4, carbs: 11, fat: 0, fiber: 5 },
  { id: 'v-9', name: 'Repollo', category: 'Verduras', calories: 25, protein: 1, carbs: 6, fat: 0, fiber: 2 },
  { id: 'v-10', name: 'Zanahoria', category: 'Verduras', calories: 50, protein: 1, carbs: 12, fat: 0, fiber: 3 },
  { id: 'v-11', name: 'Lechuga', category: 'Verduras', calories: 10, protein: 1, carbs: 2, fat: 0, fiber: 1 },
  { id: 'v-12', name: 'Champiñones', category: 'Verduras', calories: 22, protein: 3, carbs: 3, fat: 0, fiber: 1 },
  { id: 'v-13', name: 'Espinaca', category: 'Verduras', calories: 23, protein: 3, carbs: 4, fat: 0, fiber: 2 },
  { id: 'v-14', name: 'Cebolla', category: 'Verduras', calories: 44, protein: 1, carbs: 10, fat: 0, fiber: 2 },
  { id: 'v-15', name: 'Pimiento', category: 'Verduras', calories: 30, protein: 1, carbs: 6, fat: 0, fiber: 2 },
  { id: 'v-16', name: 'Jardinera (mezcla de verduras)', category: 'Verduras', calories: 65, protein: 3, carbs: 13, fat: 0, fiber: 4 },

  // === PROTEÍNAS ANIMALES ===
  { id: 'p-1', name: 'Pechuga de pollo', category: 'Proteínas', calories: 165, protein: 31, carbs: 0, fat: 4, fiber: 0 },
  { id: 'p-2', name: 'Muslo de pollo', category: 'Proteínas', calories: 210, protein: 26, carbs: 0, fat: 11, fiber: 0 },
  { id: 'p-3', name: 'Pollo a la plancha', category: 'Proteínas', calories: 185, protein: 35, carbs: 0, fat: 4, fiber: 0 },
  { id: 'p-4', name: 'Bife magro', category: 'Proteínas', calories: 220, protein: 26, carbs: 0, fat: 12, fiber: 0 },
  { id: 'p-5', name: 'Cuadril', category: 'Proteínas', calories: 200, protein: 28, carbs: 0, fat: 9, fiber: 0 },
  { id: 'p-6', name: 'Nalga', category: 'Proteínas', calories: 180, protein: 29, carbs: 0, fat: 6, fiber: 0 },
  { id: 'p-7', name: 'Bola de lomo', category: 'Proteínas', calories: 175, protein: 28, carbs: 0, fat: 6, fiber: 0 },
  { id: 'p-8', name: 'Lomo', category: 'Proteínas', calories: 190, protein: 30, carbs: 0, fat: 7, fiber: 0 },
  { id: 'p-9', name: 'Peceto', category: 'Proteínas', calories: 165, protein: 29, carbs: 0, fat: 5, fiber: 0 },
  { id: 'p-10', name: 'Hamburguesa casera', category: 'Proteínas', calories: 250, protein: 20, carbs: 2, fat: 18, fiber: 0 },
  { id: 'p-11', name: 'Huevo', category: 'Proteínas', calories: 78, protein: 6, carbs: 1, fat: 5, fiber: 0 },
  { id: 'p-12', name: 'Huevo revuelto', category: 'Proteínas', calories: 150, protein: 10, carbs: 2, fat: 11, fiber: 0 },
  { id: 'p-13', name: 'Huevo duro', category: 'Proteínas', calories: 78, protein: 6, carbs: 1, fat: 5, fiber: 0 },
  { id: 'p-14', name: 'Filete de pescado', category: 'Proteínas', calories: 150, protein: 28, carbs: 0, fat: 3, fiber: 0 },
  { id: 'p-15', name: 'Atún al natural (lata)', category: 'Proteínas', calories: 120, protein: 26, carbs: 0, fat: 1, fiber: 0 },
  { id: 'p-16', name: 'Salmón', category: 'Proteínas', calories: 230, protein: 25, carbs: 0, fat: 14, fiber: 0 },
  { id: 'p-17', name: 'Merluza', category: 'Proteínas', calories: 90, protein: 19, carbs: 0, fat: 1, fiber: 0 },

  // === CEREALES Y LEGUMBRES ===
  { id: 'c-1', name: 'Arroz blanco', category: 'Granos', calories: 205, protein: 4, carbs: 45, fat: 0, fiber: 1 },
  { id: 'c-2', name: 'Arroz integral', category: 'Granos', calories: 220, protein: 5, carbs: 46, fat: 2, fiber: 4 },
  { id: 'c-3', name: 'Quinoa', category: 'Granos', calories: 220, protein: 8, carbs: 39, fat: 4, fiber: 5 },
  { id: 'c-4', name: 'Avena', category: 'Granos', calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4 },
  { id: 'c-5', name: 'Lentejas', category: 'Granos', calories: 230, protein: 18, carbs: 40, fat: 1, fiber: 16 },
  { id: 'c-6', name: 'Garbanzos', category: 'Granos', calories: 270, protein: 15, carbs: 45, fat: 4, fiber: 12 },
  { id: 'c-7', name: 'Porotos', category: 'Granos', calories: 225, protein: 15, carbs: 41, fat: 1, fiber: 15 },
  { id: 'c-8', name: 'Arvejas', category: 'Granos', calories: 120, protein: 8, carbs: 21, fat: 0, fiber: 8 },
  { id: 'c-9', name: 'Fideos', category: 'Granos', calories: 220, protein: 8, carbs: 43, fat: 1, fiber: 2 },
  { id: 'c-10', name: 'Fideos integrales', category: 'Granos', calories: 200, protein: 8, carbs: 40, fat: 1, fiber: 6 },
  { id: 'c-11', name: 'Polenta', category: 'Granos', calories: 180, protein: 4, carbs: 38, fat: 1, fiber: 2 },
  { id: 'c-12', name: 'Granola', category: 'Granos', calories: 200, protein: 5, carbs: 32, fat: 7, fiber: 3 },
  { id: 'c-13', name: 'Ravioles de verdura', category: 'Granos', calories: 280, protein: 10, carbs: 42, fat: 8, fiber: 3 },
  { id: 'c-14', name: 'Ravioles de ricota', category: 'Granos', calories: 300, protein: 12, carbs: 40, fat: 10, fiber: 2 },
  { id: 'c-15', name: 'Milanesa de soja', category: 'Granos', calories: 180, protein: 15, carbs: 15, fat: 8, fiber: 4 },
  { id: 'c-16', name: 'Soja texturizada', category: 'Granos', calories: 170, protein: 25, carbs: 15, fat: 1, fiber: 8 },

  // === PANIFICADOS ===
  { id: 'pa-1', name: 'Pan lactal integral', category: 'Granos', calories: 80, protein: 3, carbs: 15, fat: 1, fiber: 2 },
  { id: 'pa-2', name: 'Tostadas de gluten', category: 'Granos', calories: 45, protein: 4, carbs: 6, fat: 1, fiber: 1 },
  { id: 'pa-3', name: 'Discos de arroz', category: 'Granos', calories: 35, protein: 1, carbs: 8, fat: 0, fiber: 0 },
  { id: 'pa-4', name: 'Rapiditas light integrales', category: 'Granos', calories: 90, protein: 3, carbs: 18, fat: 1, fiber: 3 },
  { id: 'pa-5', name: 'Pan integral', category: 'Granos', calories: 70, protein: 3, carbs: 13, fat: 1, fiber: 2 },

  // === LÁCTEOS ===
  { id: 'l-1', name: 'Leche descremada', category: 'Lácteos', calories: 90, protein: 9, carbs: 13, fat: 0, fiber: 0 },
  { id: 'l-2', name: 'Leche en polvo descremada', category: 'Lácteos', calories: 100, protein: 10, carbs: 14, fat: 0, fiber: 0 },
  { id: 'l-3', name: 'Yogur descremado', category: 'Lácteos', calories: 100, protein: 10, carbs: 12, fat: 0, fiber: 0 },
  { id: 'l-4', name: 'Yogur natural sin azúcar', category: 'Lácteos', calories: 60, protein: 6, carbs: 5, fat: 2, fiber: 0 },
  { id: 'l-5', name: 'Yogur griego', category: 'Lácteos', calories: 130, protein: 12, carbs: 8, fat: 5, fiber: 0 },
  { id: 'l-6', name: 'Queso fresco mantecoso', category: 'Lácteos', calories: 280, protein: 20, carbs: 2, fat: 22, fiber: 0 },
  { id: 'l-7', name: 'Queso cuartirolo', category: 'Lácteos', calories: 260, protein: 18, carbs: 2, fat: 20, fiber: 0 },
  { id: 'l-8', name: 'Queso de máquina (fetas)', category: 'Lácteos', calories: 50, protein: 4, carbs: 1, fat: 4, fiber: 0 },
  { id: 'l-9', name: 'Queso untable', category: 'Lácteos', calories: 80, protein: 5, carbs: 2, fat: 6, fiber: 0 },
  { id: 'l-10', name: 'Queso untable light', category: 'Lácteos', calories: 45, protein: 6, carbs: 2, fat: 2, fiber: 0 },
  { id: 'l-11', name: 'Ricota', category: 'Lácteos', calories: 170, protein: 14, carbs: 4, fat: 11, fiber: 0 },

  // === GRASAS Y ACEITES ===
  { id: 'g-1', name: 'Aceite de oliva', category: 'Grasas saludables', calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0 },
  { id: 'g-2', name: 'Aceite vegetal', category: 'Grasas saludables', calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0 },
  { id: 'g-3', name: 'Rocío vegetal', category: 'Grasas saludables', calories: 10, protein: 0, carbs: 0, fat: 1, fiber: 0 },
  { id: 'g-4', name: 'Pasta de maní', category: 'Grasas saludables', calories: 190, protein: 8, carbs: 6, fat: 16, fiber: 2 },
  { id: 'g-5', name: 'Palta', category: 'Grasas saludables', calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7 },

  // === FRUTOS SECOS Y SEMILLAS ===
  { id: 'fs-1', name: 'Almendras', category: 'Grasas saludables', calories: 165, protein: 6, carbs: 6, fat: 14, fiber: 3 },
  { id: 'fs-2', name: 'Nueces', category: 'Grasas saludables', calories: 185, protein: 4, carbs: 4, fat: 18, fiber: 2 },
  { id: 'fs-3', name: 'Castañas', category: 'Grasas saludables', calories: 70, protein: 1, carbs: 15, fat: 1, fiber: 2 },
  { id: 'fs-4', name: 'Maní tostado sin sal', category: 'Grasas saludables', calories: 170, protein: 7, carbs: 5, fat: 14, fiber: 2 },
  { id: 'fs-5', name: 'Pistachos', category: 'Grasas saludables', calories: 160, protein: 6, carbs: 8, fat: 13, fiber: 3 },
  { id: 'fs-6', name: 'Avellanas', category: 'Grasas saludables', calories: 180, protein: 4, carbs: 5, fat: 17, fiber: 3 },
  { id: 'fs-7', name: 'Semillas de chía', category: 'Grasas saludables', calories: 140, protein: 5, carbs: 12, fat: 9, fiber: 10 },
  { id: 'fs-8', name: 'Semillas de lino', category: 'Grasas saludables', calories: 150, protein: 5, carbs: 8, fat: 12, fiber: 8 },

  // === BEBIDAS ===
  { id: 'b-1', name: 'Agua', category: 'Bebidas', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  { id: 'b-2', name: 'Soda', category: 'Bebidas', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  { id: 'b-3', name: 'Gaseosa light', category: 'Bebidas', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  { id: 'b-4', name: 'Agua saborizada light', category: 'Bebidas', calories: 5, protein: 0, carbs: 1, fat: 0, fiber: 0 },
  { id: 'b-5', name: 'Jugo light', category: 'Bebidas', calories: 10, protein: 0, carbs: 2, fat: 0, fiber: 0 },
  { id: 'b-6', name: 'Té', category: 'Bebidas', calories: 2, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  { id: 'b-7', name: 'Café', category: 'Bebidas', calories: 5, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  { id: 'b-8', name: 'Mate cocido', category: 'Bebidas', calories: 5, protein: 0, carbs: 1, fat: 0, fiber: 0 },
  { id: 'b-9', name: 'Mate cebado', category: 'Bebidas', calories: 10, protein: 0, carbs: 2, fat: 0, fiber: 0 },
  { id: 'b-10', name: 'Café con leche', category: 'Bebidas', calories: 60, protein: 4, carbs: 6, fat: 2, fiber: 0 },
  { id: 'b-11', name: 'Smoothie verde', category: 'Bebidas', calories: 180, protein: 4, carbs: 35, fat: 3, fiber: 6 },

  // === PREPARACIONES - DESAYUNO/MERIENDA ===
  { id: 'pr-1', name: 'Avena con frutos rojos', category: 'Granos', calories: 280, protein: 10, carbs: 45, fat: 6, fiber: 7 },
  { id: 'pr-2', name: 'Yogur con granola', category: 'Lácteos', calories: 250, protein: 12, carbs: 38, fat: 6, fiber: 4 },
  { id: 'pr-3', name: 'Panqueques de avena', category: 'Granos', calories: 220, protein: 10, carbs: 30, fat: 6, fiber: 4 },
  { id: 'pr-4', name: 'Tostadas integrales con huevo', category: 'Proteínas', calories: 250, protein: 15, carbs: 25, fat: 10, fiber: 4 },
  { id: 'pr-5', name: 'Tostadas con palta', category: 'Grasas saludables', calories: 280, protein: 6, carbs: 25, fat: 18, fiber: 8 },
  { id: 'pr-6', name: 'Tostadas con queso untable', category: 'Lácteos', calories: 150, protein: 8, carbs: 18, fat: 5, fiber: 2 },

  // === PREPARACIONES - PLATOS PRINCIPALES ===
  { id: 'pp-1', name: 'Ensalada César', category: 'Verduras', calories: 350, protein: 20, carbs: 15, fat: 25, fiber: 4 },
  { id: 'pp-2', name: 'Ensalada de quinoa y palta', category: 'Verduras', calories: 380, protein: 12, carbs: 40, fat: 18, fiber: 8 },
  { id: 'pp-3', name: 'Ensalada de lentejas con huevo', category: 'Granos', calories: 350, protein: 22, carbs: 35, fat: 12, fiber: 12 },
  { id: 'pp-4', name: 'Pollo al champiñón', category: 'Proteínas', calories: 280, protein: 35, carbs: 8, fat: 12, fiber: 2 },
  { id: 'pp-5', name: 'Pollo a la parrilla con ensalada', category: 'Proteínas', calories: 320, protein: 38, carbs: 10, fat: 14, fiber: 4 },
  { id: 'pp-6', name: 'Tortilla de papa al horno', category: 'Proteínas', calories: 280, protein: 14, carbs: 25, fat: 14, fiber: 3 },
  { id: 'pp-7', name: 'Cuadril con calabazas asadas', category: 'Proteínas', calories: 350, protein: 32, carbs: 18, fat: 16, fiber: 4 },
  { id: 'pp-8', name: 'Hamburguesa de legumbres con vegetales', category: 'Granos', calories: 320, protein: 18, carbs: 35, fat: 12, fiber: 10 },
  { id: 'pp-9', name: 'Milanesa de berenjena a la napolitana', category: 'Verduras', calories: 350, protein: 18, carbs: 28, fat: 18, fiber: 6 },
  { id: 'pp-10', name: 'Pastel de calabaza con pollo', category: 'Proteínas', calories: 380, protein: 28, carbs: 30, fat: 16, fiber: 5 },
  { id: 'pp-11', name: 'Bifes a la mostaza con vegetales', category: 'Proteínas', calories: 340, protein: 30, carbs: 12, fat: 18, fiber: 4 },
  { id: 'pp-12', name: 'Tarta de zapallitos', category: 'Verduras', calories: 280, protein: 12, carbs: 25, fat: 15, fiber: 4 },
  { id: 'pp-13', name: 'Tarta de verdura', category: 'Verduras', calories: 300, protein: 12, carbs: 28, fat: 16, fiber: 5 },
  { id: 'pp-14', name: 'Pescado con brócoli gratinado', category: 'Proteínas', calories: 320, protein: 35, carbs: 12, fat: 14, fiber: 5 },
  { id: 'pp-15', name: 'Salmón con vegetales', category: 'Proteínas', calories: 400, protein: 32, carbs: 15, fat: 24, fiber: 5 },
  { id: 'pp-16', name: 'Fajitas integrales caseras', category: 'Proteínas', calories: 380, protein: 25, carbs: 35, fat: 15, fiber: 6 },
  { id: 'pp-17', name: 'Omelette caprese', category: 'Proteínas', calories: 280, protein: 18, carbs: 6, fat: 20, fiber: 1 },
  { id: 'pp-18', name: 'Arroz con pollo', category: 'Proteínas', calories: 420, protein: 30, carbs: 45, fat: 12, fiber: 2 },
  { id: 'pp-19', name: 'Fideos con salsa de tomate', category: 'Granos', calories: 350, protein: 12, carbs: 55, fat: 8, fiber: 4 },
  { id: 'pp-20', name: 'Milanesa de pollo con ensalada', category: 'Proteínas', calories: 450, protein: 35, carbs: 25, fat: 24, fiber: 3 },
  { id: 'pp-21', name: 'Wok de vegetales con pollo', category: 'Proteínas', calories: 320, protein: 28, carbs: 20, fat: 14, fiber: 6 },
  { id: 'pp-22', name: 'Guiso de lentejas', category: 'Granos', calories: 350, protein: 20, carbs: 45, fat: 8, fiber: 14 },
  { id: 'pp-23', name: 'Polenta con salsa', category: 'Granos', calories: 280, protein: 8, carbs: 45, fat: 6, fiber: 3 },
  { id: 'pp-24', name: 'Revuelto gramajo', category: 'Proteínas', calories: 420, protein: 18, carbs: 35, fat: 24, fiber: 3 },

  // === COMIDAS ESPORÁDICAS ===
  { id: 'ce-1', name: 'Lomito con papas', category: 'Otros', calories: 650, protein: 30, carbs: 55, fat: 35, fiber: 4 },
  { id: 'ce-2', name: 'Pizza (porción)', category: 'Otros', calories: 280, protein: 12, carbs: 35, fat: 10, fiber: 2 },
  { id: 'ce-3', name: 'Helado (bocha)', category: 'Otros', calories: 140, protein: 2, carbs: 18, fat: 7, fiber: 0 },
  { id: 'ce-4', name: 'Facturas', category: 'Otros', calories: 250, protein: 4, carbs: 30, fat: 12, fiber: 1 },
  { id: 'ce-5', name: 'Empanada de carne', category: 'Otros', calories: 280, protein: 10, carbs: 25, fat: 15, fiber: 1 },
  { id: 'ce-6', name: 'Empanada de pollo', category: 'Otros', calories: 250, protein: 12, carbs: 24, fat: 12, fiber: 1 },
  { id: 'ce-7', name: 'Empanada de verdura', category: 'Otros', calories: 220, protein: 8, carbs: 26, fat: 10, fiber: 2 },
  { id: 'ce-8', name: 'Asado', category: 'Proteínas', calories: 450, protein: 35, carbs: 0, fat: 34, fiber: 0 },
  { id: 'ce-9', name: 'Choripán', category: 'Otros', calories: 480, protein: 18, carbs: 35, fat: 30, fiber: 2 },

  // === TOSTADAS RECETARIO ===
  { id: 'to-1', name: 'Tostada con palta y huevo', category: 'Proteínas', calories: 320, protein: 14, carbs: 25, fat: 20, fiber: 8 },
  { id: 'to-2', name: 'Tostada con ricota y frutos rojos', category: 'Lácteos', calories: 220, protein: 12, carbs: 22, fat: 10, fiber: 3 },
  { id: 'to-3', name: 'Tostada con queso untable y tomate', category: 'Lácteos', calories: 160, protein: 8, carbs: 18, fat: 6, fiber: 2 },
  { id: 'to-4', name: 'Tostada con mantequilla de maní y banana', category: 'Grasas saludables', calories: 310, protein: 10, carbs: 35, fat: 16, fiber: 4 },
  { id: 'to-5', name: 'Tostada con hummus y vegetales', category: 'Granos', calories: 230, protein: 9, carbs: 28, fat: 10, fiber: 6 },
  { id: 'to-6', name: 'Tostada caprese', category: 'Lácteos', calories: 240, protein: 12, carbs: 20, fat: 13, fiber: 2 },
  { id: 'to-7', name: 'Tostada con queso untable y salmón', category: 'Proteínas', calories: 280, protein: 18, carbs: 16, fat: 16, fiber: 2 },

  // === SMOOTHIE BOWLS ===
  { id: 'sb-1', name: 'Smoothie bowl de frutas', category: 'Frutas', calories: 320, protein: 8, carbs: 55, fat: 8, fiber: 7 },
  { id: 'sb-2', name: 'Smoothie bowl proteico', category: 'Lácteos', calories: 350, protein: 20, carbs: 40, fat: 12, fiber: 6 },

  // === WRAPS Y SANDWICHES ===
  { id: 'wr-1', name: 'Wrap de pollo y vegetales', category: 'Proteínas', calories: 340, protein: 28, carbs: 30, fat: 12, fiber: 4 },
  { id: 'wr-2', name: 'Wrap de atún y palta', category: 'Proteínas', calories: 380, protein: 24, carbs: 28, fat: 20, fiber: 6 },
  { id: 'wr-3', name: 'Crepe de espinaca y ricota', category: 'Lácteos', calories: 280, protein: 16, carbs: 22, fat: 14, fiber: 3 },
  { id: 'wr-4', name: 'Sandwich integral de pavo', category: 'Proteínas', calories: 300, protein: 22, carbs: 30, fat: 10, fiber: 4 },
  { id: 'wr-5', name: 'Wrap mediterráneo', category: 'Verduras', calories: 290, protein: 10, carbs: 32, fat: 14, fiber: 5 },
  { id: 'wr-6', name: 'Crepe de pollo y champiñones', category: 'Proteínas', calories: 310, protein: 24, carbs: 25, fat: 13, fiber: 2 },

  // === PLATOS DEL PLAN NUTRICIONAL ===
  { id: 'pn-1', name: 'Pollo al horno con ensalada mixta', category: 'Proteínas', calories: 350, protein: 35, carbs: 12, fat: 18, fiber: 4 },
  { id: 'pn-2', name: 'Tortilla de vegetales con ensalada', category: 'Proteínas', calories: 300, protein: 16, carbs: 20, fat: 18, fiber: 5 },
  { id: 'pn-3', name: 'Milanesa de pollo al horno con ensalada', category: 'Proteínas', calories: 400, protein: 32, carbs: 22, fat: 20, fiber: 4 },
  { id: 'pn-4', name: 'Yogur griego con frutas', category: 'Lácteos', calories: 200, protein: 14, carbs: 25, fat: 6, fiber: 2 },
  { id: 'pn-5', name: 'Hummus', category: 'Granos', calories: 180, protein: 8, carbs: 20, fat: 8, fiber: 5 },

  // === ENSALADAS (Recetario Lic. Cecilia Lamberghini) ===
  { id: 'en-1', name: 'Ensalada griega', category: 'Verduras', calories: 250, protein: 8, carbs: 12, fat: 18, fiber: 3 },
  { id: 'en-2', name: 'Ensalada caprese', category: 'Verduras', calories: 280, protein: 14, carbs: 8, fat: 20, fiber: 2 },
  { id: 'en-3', name: 'Ensalada de mango y roquefort', category: 'Verduras', calories: 320, protein: 10, carbs: 28, fat: 20, fiber: 4 },
  { id: 'en-4', name: 'Ensalada de pera y nueces', category: 'Verduras', calories: 300, protein: 8, carbs: 25, fat: 20, fiber: 5 },
  { id: 'en-5', name: 'Ensalada cuatro colores', category: 'Verduras', calories: 200, protein: 6, carbs: 18, fat: 12, fiber: 5 },
  { id: 'en-6', name: 'Ensalada violeta', category: 'Verduras', calories: 220, protein: 7, carbs: 20, fat: 13, fiber: 6 },
  { id: 'en-7', name: 'Ensalada con queso de cabra', category: 'Verduras', calories: 310, protein: 14, carbs: 12, fat: 24, fiber: 3 },
  { id: 'en-8', name: 'Ensalada verde de quinoa', category: 'Verduras', calories: 280, protein: 10, carbs: 32, fat: 12, fiber: 6 },
  { id: 'en-9', name: 'Ensalada de rabanito', category: 'Verduras', calories: 180, protein: 5, carbs: 14, fat: 12, fiber: 4 },
  { id: 'en-10', name: 'Ensalada caprese con pasta', category: 'Granos', calories: 380, protein: 16, carbs: 42, fat: 16, fiber: 3 },
  { id: 'en-11', name: 'Ensalada festival', category: 'Verduras', calories: 260, protein: 8, carbs: 22, fat: 16, fiber: 5 },
  { id: 'en-12', name: 'Ensalada arcoíris', category: 'Verduras', calories: 220, protein: 7, carbs: 20, fat: 13, fiber: 6 },
  { id: 'en-13', name: 'Ensalada frutal', category: 'Verduras', calories: 190, protein: 4, carbs: 28, fat: 8, fiber: 5 },
  { id: 'en-14', name: 'Ensalada con tofu', category: 'Proteínas', calories: 250, protein: 16, carbs: 14, fat: 16, fiber: 4 },
  { id: 'en-15', name: 'Ensalada suprema', category: 'Proteínas', calories: 280, protein: 22, carbs: 12, fat: 16, fiber: 4 },
  { id: 'en-16', name: 'Ensalada rústica', category: 'Verduras', calories: 260, protein: 10, carbs: 22, fat: 15, fiber: 5 },
  { id: 'en-17', name: 'Ensalada mexicana', category: 'Verduras', calories: 290, protein: 12, carbs: 28, fat: 14, fiber: 7 },
  { id: 'en-18', name: 'Ensalada César simple', category: 'Verduras', calories: 280, protein: 14, carbs: 16, fat: 18, fiber: 3 },
  { id: 'en-19', name: 'Ensalada con atún', category: 'Proteínas', calories: 300, protein: 26, carbs: 12, fat: 16, fiber: 4 },
  { id: 'en-20', name: 'Ensalada de porotos negros', category: 'Granos', calories: 270, protein: 14, carbs: 36, fat: 8, fiber: 10 },
  { id: 'en-21', name: 'Ensalada de mar', category: 'Proteínas', calories: 240, protein: 20, carbs: 14, fat: 12, fiber: 3 },
  { id: 'en-22', name: 'Ensalada campestre', category: 'Verduras', calories: 250, protein: 8, carbs: 20, fat: 16, fiber: 5 },
  { id: 'en-23', name: 'Ensalada gourmet', category: 'Verduras', calories: 310, protein: 12, carbs: 18, fat: 22, fiber: 4 },
  { id: 'en-24', name: 'Ensalada de tofu y quinoa', category: 'Proteínas', calories: 280, protein: 16, carbs: 28, fat: 12, fiber: 6 },
  { id: 'en-25', name: 'Ensalada con arroz negro y heura', category: 'Proteínas', calories: 320, protein: 20, carbs: 34, fat: 12, fiber: 5 },
  { id: 'en-26', name: 'Ensalada radical', category: 'Verduras', calories: 230, protein: 6, carbs: 22, fat: 14, fiber: 6 },
]

// Sistema de estimación de calorías por IA basado en palabras clave
type FoodKeyword = {
  keywords: string[]
  caloriesBase: number
  proteinBase: number
  carbsBase: number
  fatBase: number
  fiberBase: number
  multiplier?: number
}

const foodKeywords: FoodKeyword[] = [
  // Proteínas
  { keywords: ['pollo', 'pechuga'], caloriesBase: 165, proteinBase: 31, carbsBase: 0, fatBase: 4, fiberBase: 0 },
  { keywords: ['carne', 'bife', 'lomo', 'cuadril', 'asado'], caloriesBase: 200, proteinBase: 28, carbsBase: 0, fatBase: 10, fiberBase: 0 },
  { keywords: ['pescado', 'merluza', 'filet'], caloriesBase: 130, proteinBase: 25, carbsBase: 0, fatBase: 3, fiberBase: 0 },
  { keywords: ['salmón', 'salmon'], caloriesBase: 230, proteinBase: 25, carbsBase: 0, fatBase: 14, fiberBase: 0 },
  { keywords: ['atún', 'atun'], caloriesBase: 120, proteinBase: 26, carbsBase: 0, fatBase: 1, fiberBase: 0 },
  { keywords: ['huevo', 'huevos'], caloriesBase: 78, proteinBase: 6, carbsBase: 1, fatBase: 5, fiberBase: 0 },
  { keywords: ['milanesa'], caloriesBase: 280, proteinBase: 20, carbsBase: 15, fatBase: 16, fiberBase: 1 },

  // Carbohidratos
  { keywords: ['arroz'], caloriesBase: 205, proteinBase: 4, carbsBase: 45, fatBase: 0, fiberBase: 1 },
  { keywords: ['fideos', 'pasta', 'tallarines', 'espagueti'], caloriesBase: 220, proteinBase: 8, carbsBase: 43, fatBase: 1, fiberBase: 2 },
  { keywords: ['papa', 'papas', 'puré', 'pure'], caloriesBase: 160, proteinBase: 4, carbsBase: 37, fatBase: 0, fiberBase: 4 },
  { keywords: ['pan', 'tostada', 'tostadas'], caloriesBase: 80, proteinBase: 3, carbsBase: 15, fatBase: 1, fiberBase: 2 },
  { keywords: ['quinoa'], caloriesBase: 220, proteinBase: 8, carbsBase: 39, fatBase: 4, fiberBase: 5 },
  { keywords: ['avena'], caloriesBase: 150, proteinBase: 5, carbsBase: 27, fatBase: 3, fiberBase: 4 },
  { keywords: ['lentejas'], caloriesBase: 230, proteinBase: 18, carbsBase: 40, fatBase: 1, fiberBase: 16 },
  { keywords: ['garbanzos'], caloriesBase: 270, proteinBase: 15, carbsBase: 45, fatBase: 4, fiberBase: 12 },

  // Verduras
  { keywords: ['ensalada'], caloriesBase: 50, proteinBase: 2, carbsBase: 8, fatBase: 1, fiberBase: 3 },
  { keywords: ['verduras', 'vegetales', 'brócoli', 'brocoli'], caloriesBase: 50, proteinBase: 3, carbsBase: 10, fatBase: 0, fiberBase: 4 },
  { keywords: ['calabaza', 'zapallo'], caloriesBase: 50, proteinBase: 2, carbsBase: 12, fatBase: 0, fiberBase: 3 },
  { keywords: ['tomate'], caloriesBase: 22, proteinBase: 1, carbsBase: 5, fatBase: 0, fiberBase: 1 },

  // Lácteos
  { keywords: ['yogur', 'yogurt'], caloriesBase: 100, proteinBase: 10, carbsBase: 12, fatBase: 0, fiberBase: 0 },
  { keywords: ['leche'], caloriesBase: 90, proteinBase: 9, carbsBase: 13, fatBase: 0, fiberBase: 0 },
  { keywords: ['queso'], caloriesBase: 100, proteinBase: 7, carbsBase: 1, fatBase: 8, fiberBase: 0 },

  // Frutas
  { keywords: ['fruta', 'frutas', 'manzana', 'banana', 'naranja'], caloriesBase: 80, proteinBase: 1, carbsBase: 20, fatBase: 0, fiberBase: 3 },
  { keywords: ['licuado', 'smoothie'], caloriesBase: 180, proteinBase: 4, carbsBase: 35, fatBase: 2, fiberBase: 3 },

  // Grasas
  { keywords: ['palta', 'aguacate'], caloriesBase: 160, proteinBase: 2, carbsBase: 9, fatBase: 15, fiberBase: 7 },
  { keywords: ['aceite'], caloriesBase: 120, proteinBase: 0, carbsBase: 0, fatBase: 14, fiberBase: 0 },
  { keywords: ['frutos secos', 'almendras', 'nueces', 'maní', 'mani'], caloriesBase: 170, proteinBase: 5, carbsBase: 6, fatBase: 15, fiberBase: 2 },

  // Preparaciones comunes
  { keywords: ['tarta'], caloriesBase: 280, proteinBase: 12, carbsBase: 25, fatBase: 15, fiberBase: 4 },
  { keywords: ['empanada'], caloriesBase: 250, proteinBase: 10, carbsBase: 25, fatBase: 13, fiberBase: 1 },
  { keywords: ['pizza'], caloriesBase: 280, proteinBase: 12, carbsBase: 35, fatBase: 10, fiberBase: 2 },
  { keywords: ['hamburguesa'], caloriesBase: 350, proteinBase: 20, carbsBase: 30, fatBase: 18, fiberBase: 2 },
  { keywords: ['sandwich', 'sándwich', 'sanguche'], caloriesBase: 350, proteinBase: 15, carbsBase: 35, fatBase: 15, fiberBase: 3 },
  { keywords: ['wrap', 'fajita'], caloriesBase: 350, proteinBase: 20, carbsBase: 35, fatBase: 14, fiberBase: 4 },
  { keywords: ['guiso'], caloriesBase: 350, proteinBase: 18, carbsBase: 40, fatBase: 12, fiberBase: 8 },
  { keywords: ['wok', 'salteado'], caloriesBase: 300, proteinBase: 20, carbsBase: 25, fatBase: 14, fiberBase: 5 },
  { keywords: ['omelette', 'tortilla'], caloriesBase: 250, proteinBase: 14, carbsBase: 5, fatBase: 18, fiberBase: 1 },

  // Bebidas
  { keywords: ['café', 'cafe', 'cortado'], caloriesBase: 30, proteinBase: 2, carbsBase: 3, fatBase: 1, fiberBase: 0 },
  { keywords: ['mate'], caloriesBase: 10, proteinBase: 0, carbsBase: 2, fatBase: 0, fiberBase: 0 },
  { keywords: ['té', 'te'], caloriesBase: 2, proteinBase: 0, carbsBase: 0, fatBase: 0, fiberBase: 0 },
]

// Modificadores de porción y preparación
const portionModifiers: { keywords: string[]; multiplier: number }[] = [
  { keywords: ['grande', 'mucho', 'abundante', 'plato lleno', 'doble'], multiplier: 1.5 },
  { keywords: ['chico', 'pequeño', 'poco', 'media porción', 'mitad'], multiplier: 0.6 },
  { keywords: ['normal', 'regular', 'porción'], multiplier: 1.0 },
]

const preparationModifiers: { keywords: string[]; caloriesAdd: number; fatAdd: number }[] = [
  { keywords: ['frito', 'fritas', 'fritura'], caloriesAdd: 100, fatAdd: 10 },
  { keywords: ['gratinado', 'con queso'], caloriesAdd: 80, fatAdd: 8 },
  { keywords: ['con salsa', 'en salsa'], caloriesAdd: 50, fatAdd: 4 },
  { keywords: ['a la plancha', 'grillado', 'asado'], caloriesAdd: 10, fatAdd: 1 },
  { keywords: ['al horno', 'horneado'], caloriesAdd: 20, fatAdd: 2 },
  { keywords: ['al vapor'], caloriesAdd: 0, fatAdd: 0 },
  { keywords: ['con aceite'], caloriesAdd: 60, fatAdd: 7 },
  { keywords: ['con palta', 'con aguacate'], caloriesAdd: 80, fatAdd: 8 },
  { keywords: ['light', 'diet', 'descremado'], caloriesAdd: -30, fatAdd: -3 },
]

// Función principal de estimación de calorías por IA
const estimateCaloriesFromDescription = (description: string): {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  confidence: 'alta' | 'media' | 'baja'
  detectedIngredients: string[]
} => {
  const normalizedDesc = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let totalFiber = 0
  const detectedIngredients: string[] = []
  let matchCount = 0

  // Buscar ingredientes principales
  for (const food of foodKeywords) {
    for (const keyword of food.keywords) {
      const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (normalizedDesc.includes(normalizedKeyword)) {
        totalCalories += food.caloriesBase
        totalProtein += food.proteinBase
        totalCarbs += food.carbsBase
        totalFat += food.fatBase
        totalFiber += food.fiberBase
        detectedIngredients.push(keyword)
        matchCount++
        break // Solo contar una vez por categoría
      }
    }
  }

  // Aplicar modificadores de porción
  let portionMultiplier = 1.0
  for (const mod of portionModifiers) {
    for (const keyword of mod.keywords) {
      if (normalizedDesc.includes(keyword)) {
        portionMultiplier = mod.multiplier
        break
      }
    }
  }

  // Aplicar modificadores de preparación
  for (const mod of preparationModifiers) {
    for (const keyword of mod.keywords) {
      const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (normalizedDesc.includes(normalizedKeyword)) {
        totalCalories += mod.caloriesAdd
        totalFat += mod.fatAdd
        break
      }
    }
  }

  // Aplicar multiplicador de porción
  totalCalories = Math.round(totalCalories * portionMultiplier)
  totalProtein = Math.round(totalProtein * portionMultiplier)
  totalCarbs = Math.round(totalCarbs * portionMultiplier)
  totalFat = Math.round(totalFat * portionMultiplier)
  totalFiber = Math.round(totalFiber * portionMultiplier)

  // Si no se detectó nada, dar una estimación genérica
  if (matchCount === 0) {
    return {
      calories: 300,
      protein: 15,
      carbs: 30,
      fat: 12,
      fiber: 3,
      confidence: 'baja',
      detectedIngredients: []
    }
  }

  // Determinar confianza
  const confidence = matchCount >= 3 ? 'alta' : matchCount >= 2 ? 'media' : 'baja'

  return {
    calories: Math.max(totalCalories, 50),
    protein: Math.max(totalProtein, 0),
    carbs: Math.max(totalCarbs, 0),
    fat: Math.max(totalFat, 0),
    fiber: Math.max(totalFiber, 0),
    confidence,
    detectedIngredients
  }
}

// Función para estimar calorías usando OpenAI
const estimateCaloriesWithOpenAI = async (
  description: string,
  apiKey: string
): Promise<OpenAIEstimate> => {
  const prompt = `Eres un nutricionista experto. Analiza esta descripción de comida y estima los valores nutricionales.

COMIDA: "${description}"

Responde SOLO con un JSON válido (sin markdown, sin explicaciones extra) con esta estructura exacta:
{
  "calories": número (calorías totales estimadas),
  "protein": número (gramos de proteína),
  "carbs": número (gramos de carbohidratos),
  "fat": número (gramos de grasa),
  "fiber": número (gramos de fibra),
  "confidence": "alta" | "media" | "baja" (qué tan seguro estás de la estimación),
  "detectedIngredients": ["ingrediente1", "ingrediente2", ...] (lista de ingredientes detectados),
  "reasoning": "breve explicación de cómo calculaste" (máximo 50 palabras)
}

Consideraciones:
- Asume porciones estándar argentinas si no se especifica tamaño
- Si dice "grande" multiplica por 1.5, si dice "chico" por 0.6
- Incluye todo: pan, aderezos, aceite de cocción, etc.
- Sé preciso con las calorías, no redondees demasiado`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un nutricionista experto que estima calorías y macronutrientes. Siempre respondes en JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error(`Error de API: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Limpiar el contenido de posibles markdown
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanContent)

    return {
      calories: Math.round(parsed.calories || 0),
      protein: Math.round(parsed.protein || 0),
      carbs: Math.round(parsed.carbs || 0),
      fat: Math.round(parsed.fat || 0),
      fiber: Math.round(parsed.fiber || 0),
      confidence: parsed.confidence || 'media',
      detectedIngredients: parsed.detectedIngredients || [],
      reasoning: parsed.reasoning || ''
    }
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error)
    // Fallback al sistema de reglas si falla OpenAI
    const fallback = estimateCaloriesFromDescription(description)
    return {
      ...fallback,
      reasoning: 'Estimación de respaldo (error en API)'
    }
  }
}

// Generar frase motivacional con OpenAI (varía cada vez)
const fetchMotivationalFromAI = async (
  apiKey: string,
  weddingDaysLeft: number,
  streak: number
): Promise<{ daily: string; context: string }> => {
  const prompt = `Generá una frase motivacional corta para una app de nutrición y fitness. La persona tiene un objetivo de boda en ${weddingDaysLeft} días y lleva ${streak} días de racha activa.

Respondé SOLO con un JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "daily": "Una frase motivacional corta (máximo 15 palabras). Tono positivo, en español, tuteo. Ej: Cada día que entrenas te acerca a tu mejor versión.",
  "context": "Una línea breve de contexto (máximo 10 palabras). Ej: La consistencia es la clave."
}

Reglas: frases distintas cada vez, no repitas las mismas. Variá entre: entrenamiento, alimentación, disciplina, progreso, boda, futuro.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Sos un coach motivacional. Respondés siempre en JSON válido con las claves "daily" y "context". Frases en español, cortas e inspiradoras.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 150
      })
    })

    if (!response.ok) throw new Error(`Error de API: ${response.status}`)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanContent)
    return {
      daily: (parsed.daily || '').slice(0, 120),
      context: (parsed.context || '').slice(0, 80)
    }
  } catch (error) {
    console.error('Error al generar frase motivacional:', error)
    throw error
  }
}

const activityCategories: { id: ActivityCategory; label: string; emoji: string; tone: string }[] = [
  { id: 'Tenis', label: 'Tenis', emoji: '🎾', tone: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  { id: 'Fútbol', label: 'Fútbol', emoji: '⚽', tone: 'bg-sage-100 text-sage-700 dark:bg-sage-800 dark:text-sage-300' },
  { id: 'Funcional', label: 'Funcional', emoji: '🔥', tone: 'bg-coral-100 text-coral-700 dark:bg-coral-900/50 dark:text-coral-300' },
  { id: 'Gimnasio', label: 'Gimnasio', emoji: '🏋️‍♀️', tone: 'bg-soil-100 text-soil-700 dark:bg-soil-900/50 dark:text-soil-300' },
  { id: 'Caminata', label: 'Caminata', emoji: '🚶‍♀️', tone: 'bg-sage-100 text-sage-700' },
  { id: 'Running', label: 'Running', emoji: '🏃‍♂️', tone: 'bg-coral-100 text-coral-700' },
  { id: 'Yoga', label: 'Yoga', emoji: '🧘‍♀️', tone: 'bg-sage-100 text-sage-700' },
  { id: 'Fuerza', label: 'Fuerza', emoji: '💪', tone: 'bg-soil-100 text-soil-700' },
  { id: 'Pilates', label: 'Pilates', emoji: '🧘‍♂️', tone: 'bg-sage-100 text-sage-700' },
  { id: 'Otro', label: 'Otro', emoji: '✨', tone: 'bg-sage-100 text-sage-700' }
]

const defaultGoals: Goals = {
  mode: 'Pérdida',
  caloriesTarget: 1800,
  proteinTarget: 135,
  carbsTarget: 180,
  fatTarget: 60,
  reminders: true
}

const defaultProfile: Profile = {
  name: 'Fernando',
  sex: 'Masculino',
  age: 30,
  height: 173,
  weight: 74.9,
  goalWeight: 70,
  activity: 'Moderada'
}

const defaultFastingProtocol: FastingProtocol = {
  enabled: true,
  method: '16:8',
  eatingWindowStart: '13:30',
  eatingWindowEnd: '21:30',
  mealSchedule: [
    { meal: 'Almuerzo', time: '13:30' },
    { meal: 'Merienda', time: '17:00' },
    { meal: 'Cena', time: '21:30' }
  ],
  fastingAllowedFoods: [
    'Agua', 'Té', 'Café', 'Mate cebado', 'Mate cocido',
    'Jugo de vegetales (<50kcal)', 'Stevia', 'Canela'
  ],
  freeDays: [6] // Sábado
}

// Menú semanal de la nutricionista
const weeklyMealPlan: { day: string; meals: { type: MealType; options: string[] }[] }[] = [
  {
    day: 'Lunes',
    meals: [
      { type: 'Almuerzo', options: ['Pollo al horno con ensalada mixta', 'Wok de vegetales con pollo'] },
      { type: 'Merienda', options: ['Yogur griego con frutas', 'Tostada con palta'] },
      { type: 'Cena', options: ['Tortilla de vegetales con ensalada', 'Omelette caprese'] }
    ]
  },
  {
    day: 'Martes',
    meals: [
      { type: 'Almuerzo', options: ['Ensalada de quinoa y palta', 'Ensalada de lentejas con huevo'] },
      { type: 'Merienda', options: ['Smoothie bowl proteico', 'Tostada con ricota y frutos rojos'] },
      { type: 'Cena', options: ['Salmón con vegetales', 'Pescado con brócoli gratinado'] }
    ]
  },
  {
    day: 'Miércoles',
    meals: [
      { type: 'Almuerzo', options: ['Milanesa de pollo al horno con ensalada', 'Milanesa de berenjena a la napolitana'] },
      { type: 'Merienda', options: ['Avena con frutos rojos', 'Yogur con granola'] },
      { type: 'Cena', options: ['Tarta de verdura', 'Tarta de zapallitos'] }
    ]
  },
  {
    day: 'Jueves',
    meals: [
      { type: 'Almuerzo', options: ['Wok de vegetales con pollo', 'Arroz con pollo'] },
      { type: 'Merienda', options: ['Wrap de atún y palta', 'Tostada con hummus y vegetales'] },
      { type: 'Cena', options: ['Bifes a la mostaza con vegetales', 'Cuadril con calabazas asadas'] }
    ]
  },
  {
    day: 'Viernes',
    meals: [
      { type: 'Almuerzo', options: ['Ensalada César', 'Pollo a la parrilla con ensalada'] },
      { type: 'Merienda', options: ['Tostada con mantequilla de maní y banana', 'Smoothie bowl de frutas'] },
      { type: 'Cena', options: ['Fajitas integrales caseras', 'Wrap de pollo y vegetales'] }
    ]
  },
  {
    day: 'Sábado',
    meals: [
      { type: 'Almuerzo', options: ['Hamburguesa de legumbres con vegetales', 'Pastel de calabaza con pollo'] },
      { type: 'Merienda', options: ['Panqueques de avena', 'Crepe de espinaca y ricota'] },
      { type: 'Cena', options: ['Revuelto gramajo', 'Polenta con salsa'] }
    ]
  },
  {
    day: 'Domingo',
    meals: [
      { type: 'Almuerzo', options: ['Guiso de lentejas', 'Fideos con salsa de tomate'] },
      { type: 'Merienda', options: ['Yogur griego con frutas', 'Tostada caprese'] },
      { type: 'Cena', options: ['Omelette caprese', 'Tortilla de vegetales con ensalada'] }
    ]
  }
]

// Guías alimentarias de la nutricionista
const nutritionistGuidelines = {
  recommended: [
    'Vegetales crudos y cocidos (preferir crudos)',
    'Proteínas magras: pollo, pescado, huevo, carne magra',
    'Granos integrales: arroz integral, quinoa, avena',
    'Aceite de oliva como grasa principal',
    'Frutas frescas y de estación',
    'Legumbres: lentejas, garbanzos, porotos',
    'Frutos secos y semillas (porciones moderadas)',
    'Lácteos descremados'
  ],
  avoid: [
    'Alimentos ultraprocesados',
    'Azúcar agregada',
    'Harinas refinadas en exceso',
    'Frituras',
    'Gaseosas azucaradas',
    'Snacks empaquetados',
    'Fiambres y embutidos',
    'Exceso de sal'
  ],
  hydration: '2 litros de agua por día mínimo',
  exercise: '45 min actividad moderada diaria + fuerza 3x/semana'
}

const portionScale = [0.7, 1, 1.3]

const tabLabelsBase = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'progreso', label: 'Progreso' },
  { id: 'asistente', label: 'Asistente' },
  { id: 'biblioteca', label: 'Biblioteca' },
  { id: 'metas', label: 'Metas' },
  { id: 'historial', label: 'Historial' }
]

const progresoSubTabs = [
  { id: 'peso', label: 'Peso' },
  { id: 'composicion', label: 'Composición' },
  { id: 'analisis', label: 'Análisis' }
]

const sparkle =
  'radial-gradient(circle at top left, rgba(255, 255, 255, 0.6), transparent 60%)'

const glass =
  'rounded-3xl border border-sage-100/70 bg-white/70 shadow-soft backdrop-blur-xl dark:border-sage-800/60 dark:bg-sage-950/70'

const cardBase = glass

const formatDateKey = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatShortDate = (date: Date) =>
  date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  })

/** Fecha en formato DIA MES AÑO (ej: 20 febrero 2025) */
const formatDateDisplay = (dateKey: string) => {
  const d = new Date(dateKey + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s+de\s+/g, ' ')
}

/** Hora en 24h (ej: 14:30) */
const formatTime = (date: Date) =>
  date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

const formatTimeInput = (date: Date) => date.toTimeString().slice(0, 5)

const randomId = () => `id-${Math.random().toString(36).slice(2, 10)}`

const getDefaultState = (): AppState => ({
  meals: [],
  waterGlasses: 0,
  goals: defaultGoals,
  favorites: [],
  customFoods: [],
  streak: 0,
  lastActiveDate: formatDateKey(new Date()),
  theme: 'light',
  profile: defaultProfile,
  activities: [],
  weightHistory: [],
  bodyComposition: [{
    id: 'initial-bc',
    date: '2025-02-18',
    fatPercentage: 23.7,
    muscleMass: 37.2,
    waterPercentage: null,
    visceralFat: 8,
    boneMass: null,
    metabolicAge: null,
    note: 'Medición inicial nutricionista - IMC 25'
  }],
  openaiApiKey: '',
  fastingProtocol: defaultFastingProtocol,
  dailySteps: [],
  weddingDate: '2026-11-07'
})

const mergeParsedState = (parsed: Partial<AppState>): AppState => ({
  meals: parsed.meals ?? [],
  waterGlasses: parsed.waterGlasses ?? 0,
  goals: { ...defaultGoals, ...(parsed.goals ?? {}) },
  favorites: parsed.favorites ?? [],
  customFoods: parsed.customFoods ?? [],
  streak: parsed.streak ?? 0,
  lastActiveDate: parsed.lastActiveDate ?? formatDateKey(new Date()),
  theme: parsed.theme ?? 'light',
  profile: { ...defaultProfile, ...(parsed.profile ?? {}) },
  activities: normalizeActivities(parsed.activities),
  weightHistory: parsed.weightHistory ?? [],
  bodyComposition: parsed.bodyComposition ?? [],
  openaiApiKey: parsed.openaiApiKey ?? '',
  fastingProtocol: { ...defaultFastingProtocol, ...(parsed.fastingProtocol ?? {}) },
  dailySteps: parsed.dailySteps ?? [],
  weddingDate: parsed.weddingDate ?? '2026-11-07'
})

const loadState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      return mergeParsedState(JSON.parse(saved) as Partial<AppState>)
    } catch {
      // ignore
    }
  }
  return getDefaultState()
}

const saveState = (
  state: AppState,
  userId?: string,
  options?: { onError?: (message: string) => void; skipSupabase?: boolean }
) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  if (options?.skipSupabase) return
  const supabase = getSupabase()
  if (supabase && userId) {
    supabase
      .from('app_state_users')
      .upsert(
        { user_id: userId, state, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .then((result) => {
        if (result.error) {
          options?.onError?.(
            'No se pudo guardar en la nube. En Supabase, ejecutá la migración de la tabla app_state_users.'
          )
        }
      }, () => {
        options?.onError?.(
          'No se pudo guardar en la nube. Revisá la tabla app_state_users y RLS en Supabase.'
        )
      })
  } else if (supabase && !userId) {
    supabase
      .from('app_state')
      .upsert(
        { id: 'default', state, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      .then(() => {}, () => {})
  } else {
    fetch(`${API_BASE}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    }).then(() => {}, () => {})
  }
}

const findFood = (name: string, customFoods: FoodItem[]) => {
  return [...customFoods, ...baseFoods].find(
    (food) => food.name.toLowerCase() === name.toLowerCase()
  )
}

const buildMealEntry = (
  name: string,
  mealType: MealType,
  portion: number,
  customFoods: FoodItem[],
  note: string = '',
  timeOverride?: string,
  dateOverride?: string
): MealEntry => {
  const food = findFood(name, customFoods)
  const scale = portionScale[portion - 1] ?? 1

  return {
    id: randomId(),
    name,
    mealType,
    time: timeOverride ?? formatTime(new Date()),
    date: dateOverride ?? formatDateKey(new Date()),
    portion,
    calories: Math.round((food?.calories ?? 280) * scale),
    protein: Math.round((food?.protein ?? 12) * scale),
    carbs: Math.round((food?.carbs ?? 36) * scale),
    fat: Math.round((food?.fat ?? 9) * scale),
    fiber: Math.round((food?.fiber ?? 5) * scale),
    note
  }
}

const getWeeklySummary = (meals: MealEntry[]) => {
  const today = new Date()
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const key = formatDateKey(date)
    const dayMeals = meals.filter((meal) => meal.date === key)

    return {
      date: formatShortDate(date),
      calories: dayMeals.reduce((acc, meal) => acc + meal.calories, 0),
      protein: dayMeals.reduce((acc, meal) => acc + meal.protein, 0),
      carbs: dayMeals.reduce((acc, meal) => acc + meal.carbs, 0),
      fat: dayMeals.reduce((acc, meal) => acc + meal.fat, 0)
    }
  })
}

const getMonthDays = (baseDate: Date) => {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const grid: { date: Date | null; label: string }[] = []

  for (let i = 0; i < startWeekday; i += 1) {
    grid.push({ date: null, label: '' })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    grid.push({ date: new Date(year, month, day), label: String(day) })
  }

  while (grid.length % 7 !== 0) {
    grid.push({ date: null, label: '' })
  }

  return grid
}

const totalMacros = (meals: MealEntry[]) =>
  meals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories
      acc.protein += meal.protein
      acc.carbs += meal.carbs
      acc.fat += meal.fat
      acc.fiber += meal.fiber
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )

const getCompletionColor = (ratio: number) => {
  if (ratio >= 0.9 && ratio <= 1.1) return 'bg-sage-400'
  if (ratio >= 0.7) return 'bg-soil-300'
  return 'bg-coral-300'
}

const getWeekday = (dateKey: string) => {
  const date = new Date(dateKey)
  return date.getDay()
}

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-sage-200 dark:bg-sage-700 ${className}`} />
)

const getGreeting = () => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const ProgressRing = ({
  value,
  max,
  label,
  unit,
  color = 'coral'
}: {
  value: number
  max: number
  label: string
  unit: string
  color?: 'coral' | 'sage' | 'soil'
}) => {
  const ratio = max > 0 ? Math.min(1, value / max) : 0
  const r = 28
  const stroke = 6
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - ratio)
  const colorClass =
    color === 'coral'
      ? 'stroke-coral-500'
      : color === 'sage'
        ? 'stroke-sage-500'
        : 'stroke-amber-600'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg className="h-16 w-16 -rotate-90" viewBox={`0 0 ${r * 2 + stroke * 2} ${r * 2 + stroke * 2}`}>
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-sage-200 dark:text-sage-700"
        />
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={`${colorClass} transition-all duration-700`}
        />
      </svg>
      <span className="text-xs font-semibold text-sage-700 dark:text-sage-200">
        {value}/{max}{unit}
      </span>
      <span className="text-[10px] text-sage-500">{label}</span>
    </div>
  )
}

const activityFactor: Record<Profile['activity'], number> = {
  Baja: 1.2,
  Moderada: 1.45,
  Alta: 1.65,
  'Muy alta': 1.85
}

const calculateTdee = (profile: Profile) => {
  const base =
    10 * profile.weight +
    6.25 * profile.height -
    5 * profile.age +
    (profile.sex === 'Masculino' ? 5 : -161)

  return Math.round(base * activityFactor[profile.activity])
}

const calculateMacroTargets = (calories: number) => {
  const protein = Math.round((calories * 0.3) / 4)
  const carbs = Math.round((calories * 0.4) / 4)
  const fat = Math.round((calories * 0.3) / 9)
  return { protein, carbs, fat }
}

const normalizeActivities = (activities: AppState['activities'] | undefined): ActivityEntry[] => {
  if (!Array.isArray(activities)) return []
  return activities.map((activity) => ({
    id: activity.id ?? randomId(),
    name: activity.name ?? activity.category ?? 'Actividad física',
    category: activity.category ?? 'Caminata',
    minutes: activity.minutes ?? 30,
    intensity: activity.intensity ?? 'Moderada',
    time: activity.time ?? formatTimeInput(new Date()),
    date: activity.date ?? formatDateKey(new Date())
  }))
}

const IconLeaf = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <path d="M5 13c5-8 12-9 14-8-1 6-5 12-13 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M5 13c2 2 5 4 8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const IconClock = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const IconDrop = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <path d="M12 3s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11Z" stroke="currentColor" strokeWidth="2" />
  </svg>
)

const IconChart = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <path d="M4 18V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 18V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 18V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const IconBook = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <path d="M6 5h10a2 2 0 0 1 2 2v11H8a2 2 0 0 0-2 2V5Z" stroke="currentColor" strokeWidth="2" />
    <path d="M6 5v15" stroke="currentColor" strokeWidth="2" />
  </svg>
)

const IconTarget = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    <path d="M12 3V1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const IconUser = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M4 20c2-4 6-6 8-6s6 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const IconCalendar = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const IconSpark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <path d="M12 3l2.5 6L21 11l-6.5 2L12 21l-2.5-8L3 11l6.5-2L12 3Z" stroke="currentColor" strokeWidth="2" />
  </svg>
)

const IconScale = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <rect x="4" y="14" width="16" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M12 14V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="6" r="2" stroke="currentColor" strokeWidth="2" />
  </svg>
)

const IconBody = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7v6M12 13l-3 6M12 13l3 6M8 10h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const IconNote = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${className}`} fill="none">
    <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const getFastingStatus = (protocol: FastingProtocol) => {
  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 5)
  const currentDay = now.getDay()
  const isFreeDay = protocol.freeDays.includes(currentDay)

  if (!protocol.enabled || isFreeDay) {
    return { isFasting: false, label: isFreeDay ? 'Día libre' : 'Protocolo desactivado', timeLeft: '', progress: 0, nextMeal: null as null | { meal: MealType; time: string } }
  }

  const isFasting = currentTime < protocol.eatingWindowStart || currentTime > protocol.eatingWindowEnd

  // Calculate progress and time remaining
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const nowMinutes = timeToMinutes(currentTime)
  const startMinutes = timeToMinutes(protocol.eatingWindowStart)
  const endMinutes = timeToMinutes(protocol.eatingWindowEnd)

  let progress = 0
  let timeLeft = ''

  if (isFasting) {
    // Fasting window: from eatingWindowEnd to eatingWindowStart (next day if needed)
    const fastingDuration = (24 * 60 - endMinutes) + startMinutes // 16 hours
    if (nowMinutes > endMinutes) {
      // After eating window ended
      const elapsed = nowMinutes - endMinutes
      progress = elapsed / fastingDuration
      const remaining = fastingDuration - elapsed
      timeLeft = `${Math.floor(remaining / 60)}h ${remaining % 60}m para comer`
    } else {
      // Before eating window starts
      const elapsed = (24 * 60 - endMinutes) + nowMinutes
      progress = elapsed / fastingDuration
      const remaining = startMinutes - nowMinutes
      timeLeft = `${Math.floor(remaining / 60)}h ${remaining % 60}m para comer`
    }
  } else {
    // Eating window
    const eatingDuration = endMinutes - startMinutes
    const elapsed = nowMinutes - startMinutes
    progress = elapsed / eatingDuration
    const remaining = endMinutes - nowMinutes
    timeLeft = `Ventana cierra en ${Math.floor(remaining / 60)}h ${remaining % 60}m`
  }

  // Find next meal
  let nextMeal: { meal: MealType; time: string } | null = null
  for (const m of protocol.mealSchedule) {
    if (m.time > currentTime) {
      nextMeal = m
      break
    }
  }

  return { isFasting, label: isFasting ? 'Ayuno' : 'Ventana alimentaria', timeLeft, progress: Math.min(1, Math.max(0, progress)), nextMeal }
}

const getMealTypeForCurrentTime = (_protocol: FastingProtocol): MealType => {
  const currentTime = new Date().toTimeString().slice(0, 5)
  if (currentTime >= '13:00' && currentTime < '15:00') return 'Almuerzo'
  if (currentTime >= '15:00' && currentTime < '19:00') return 'Merienda'
  if (currentTime >= '19:00' && currentTime < '23:00') return 'Cena'
  return 'Almuerzo' // default
}

const getTodayMealPlan = () => {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const todayName = dayNames[new Date().getDay()]
  return weeklyMealPlan.find(d => d.day === todayName) ?? weeklyMealPlan[0]
}

const SectionTitle = ({ icon, text }: { icon: ReactNode; text: string }) => (
  <div className="flex items-center gap-2">
    <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-sage-100 text-sage-600 dark:bg-sage-900 dark:text-sage-200">
      {icon}
    </span>
    <span>{text}</span>
  </div>
)

const EmptyState = ({
  title,
  description,
  emoji
}: {
  title: string
  description: string
  emoji?: string
}) => (
  <div className="mt-6 flex flex-col items-center gap-3 text-center text-sm text-sage-500">
    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-sage-100/80 shadow-soft dark:bg-sage-900/80">
      {emoji ? (
        <span className="text-5xl" aria-hidden>{emoji}</span>
      ) : (
        <img src={emptyHappy} alt="" className="h-16 w-16" />
      )}
    </div>
    <p className="font-medium text-sage-600 dark:text-sage-200">{title}</p>
    <p className="text-xs text-sage-500 dark:text-sage-400 max-w-xs">{description}</p>
  </div>
)

const App = () => {
  const [state, setState] = useState<AppState>(() => loadState())
  const [activeTab, setActiveTab] = useState('inicio')
  const [tabDirection, setTabDirection] = useState(1)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pullStartY = useRef(0)
  const pullDistanceRef = useRef(0)
  const hydrationReminderShown = useRef(false)
  const initialLoadDoneRef = useRef(false)
  const waterGlassesRef = useRef(state.waterGlasses)
  waterGlassesRef.current = state.waterGlasses
  const [activeProgresoSubTab, setActiveProgresoSubTab] = useState<'peso' | 'composicion' | 'analisis'>('peso')
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  useEffect(() => {
    if (activeTab === 'inicio') setSummaryExpanded(false)
  }, [activeTab])

  const [mealName, setMealName] = useState('')
  const [mealNote, setMealNote] = useState('')
  const [selectedMealType, setSelectedMealType] = useState<MealType>(() => getMealTypeForCurrentTime(defaultFastingProtocol))
  const [portion, setPortion] = useState(2)
  const [mealTime, setMealTime] = useState(() => formatTimeInput(new Date()))
  const [mealDate, setMealDate] = useState(() => formatDateKey(new Date()))
  const [inputMode, setInputMode] = useState<'lista' | 'ia'>('ia')
  const [aiDescription, setAiDescription] = useState('')
  const [aiEstimate, setAiEstimate] = useState<OpenAIEstimate | null>(null)
  const [isLoadingAi, setIsLoadingAi] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [tempApiKey, setTempApiKey] = useState('')
  const [waterHover, setWaterHover] = useState(0)
  const [lastFilledGlass, setLastFilledGlass] = useState<number | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const celebrationShownForDate = useRef<string | null>(null)
  useEffect(() => {
    if (lastFilledGlass !== null) {
      const t = setTimeout(() => setLastFilledGlass(null), 500)
      return () => clearTimeout(t)
    }
  }, [lastFilledGlass])
  const [toast, setToast] = useState<Toast | null>(null)
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryCategory, setLibraryCategory] = useState<FoodCategory | 'Todas'>('Todas')
  const [libraryExpanded, setLibraryExpanded] = useState(false)
  useEffect(() => {
    setLibraryExpanded(false)
  }, [librarySearch, libraryCategory])
  const [customFood, setCustomFood] = useState({
    name: '',
    category: 'Otros' as FoodCategory,
    calories: 180,
    protein: 6,
    carbs: 24,
    fat: 6,
    fiber: 3
  })
  const [historySearch, setHistorySearch] = useState('')
  const [historyMealFilter, setHistoryMealFilter] = useState<MealType | 'Todas'>('Todas')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [showRegisterCheck, setShowRegisterCheck] = useState(false)
  useEffect(() => {
    if (!showRegisterCheck) return
    const t = setTimeout(() => setShowRegisterCheck(false), 1200)
    return () => clearTimeout(t)
  }, [showRegisterCheck])
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null)
  const [editingActivity, setEditingActivity] = useState<ActivityEntry | null>(null)
  const [activityForm, setActivityForm] = useState({
    name: '',
    category: 'Gimnasio' as ActivityCategory,
    minutes: 30,
    intensity: 'Moderada' as ActivityEntry['intensity'],
    time: formatTimeInput(new Date())
  })
  const [weightForm, setWeightForm] = useState({
    weight: 0,
    note: ''
  })
  const [bodyCompForm, setBodyCompForm] = useState({
    fatPercentage: '' as string | number,
    muscleMass: '' as string | number,
    waterPercentage: '' as string | number,
    visceralFat: '' as string | number,
    boneMass: '' as string | number,
    metabolicAge: '' as string | number,
    note: ''
  })
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [editingProfile, setEditingProfile] = useState(false)
  const [assistantMode, setAssistantMode] = useState<'plan' | 'ingredients' | 'macros' | 'chat'>('chat')
  const [ingredientsInput, setIngredientsInput] = useState('')
  const [assistantResult, setAssistantResult] = useState<string>('')
  const [isLoadingAssistant, setIsLoadingAssistant] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [fastingTime, setFastingTime] = useState(() => getFastingStatus(defaultFastingProtocol))
  const [stepsInput, setStepsInput] = useState('')
  const [aiMotivational, setAiMotivational] = useState<{ daily: string; context: string; date: string } | null>(null)
  const [aiMotivationalLoading, setAiMotivationalLoading] = useState(false)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(Boolean(getSupabase()))
  const [authError, setAuthError] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [requestInviteView, setRequestInviteView] = useState(false)
  const [requestInviteEmail, setRequestInviteEmail] = useState('')
  const [requestInviteSent, setRequestInviteSent] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [inviteValid, setInviteValid] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [invitationRequests, setInvitationRequests] = useState<{ id: string; email: string; status: string; requested_at: string }[]>([])
  const [invitationsList, setInvitationsList] = useState<{ id: string; email: string; token: string; created_at: string; used_at: string | null }[]>([])
  const [newInviteEmail, setNewInviteEmail] = useState('')
  const [invitationsLoading, setInvitationsLoading] = useState(false)

  const tabLabels = useMemo(
    () => [...tabLabelsBase, ...(isAdmin ? [{ id: 'invitaciones', label: 'Invitaciones' }] : [])],
    [isAdmin]
  )

  useEffect(() => {
    const todayKey = formatDateKey(new Date())
    setState((prev) => {
      if (prev.lastActiveDate === todayKey) {
        return prev
      }

      const newStreak = prev.lastActiveDate ? prev.streak + 1 : prev.streak

      return {
        ...prev,
        streak: newStreak,
        lastActiveDate: todayKey
      }
    })
  }, [])

  // Auth: sesión y cambios
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setAuthLoading(false)
      return
    }
    // Timeout por si getSession nunca responde (red, URL/key incorrecta)
    const timeout = setTimeout(() => {
      setAuthUser(null)
      setAuthLoading(false)
    }, 8000)
    supabase.auth.getSession().then(
      ({ data: { session } }) => {
        setAuthUser(session?.user ?? null)
        setAuthLoading(false)
      },
      () => {
        setAuthUser(null)
        setAuthLoading(false)
      }
    ).finally(() => clearTimeout(timeout))
    let subscription: { unsubscribe: () => void } | null = null
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthUser(session?.user ?? null)
      })
      subscription = data.subscription
    } catch {
      // ignore
    }
    return () => {
      clearTimeout(timeout)
      subscription?.unsubscribe()
    }
  }, [])

  // ¿Es admin? (solo cuando hay usuario)
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase || !authUser) {
      setIsAdmin(false)
      return
    }
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(data === true), () => setIsAdmin(false))
  }, [authUser])

  // Al iniciar sesión, marcar invitación como usada si el email coincide (por si registró con confirmación)
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase || !authUser?.email) return
    supabase
      .from('invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('email', authUser.email)
      .is('used_at', null)
      .then(() => {}, () => {})
  }, [authUser?.id])

  // Cargar solicitudes e invitaciones cuando es admin
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase || !authUser || !isAdmin) return
    setInvitationsLoading(true)
    Promise.all([
      supabase.from('invitation_requests').select('id, email, status, requested_at').order('requested_at', { ascending: false }),
      supabase.from('invitations').select('id, email, token, created_at, used_at').order('created_at', { ascending: false })
    ])
      .then(([reqRes, invRes]) => {
        if (reqRes.data) setInvitationRequests(reqRes.data as typeof invitationRequests)
        if (invRes.data) setInvitationsList(invRes.data as typeof invitationsList)
      }, () => {})
      .finally(() => setInvitationsLoading(false))
  }, [authUser, isAdmin, activeTab])

  // Invite en URL: validar token y obtener email
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase || authUser) return
    const params = new URLSearchParams(window.location.search)
    const token = params.get('invite')
    if (!token) {
      setInviteValid(false)
      return
    }
    setInviteToken(token)
    supabase.rpc('get_invite_for_token', { t: token })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setInviteValid(false)
          return
        }
        setInviteEmail((data[0] as { email: string }).email)
        setInviteValid(true)
      }, () => setInviteValid(false))
  }, [authUser])

  // Cargar estado: con auth desde app_state_users; sin auth desde app_state o API
  useEffect(() => {
    const supabase = getSupabase()
    if (supabase && authUser) {
      initialLoadDoneRef.current = false
      if (refreshTrigger > 0) setIsRefreshing(true)
      void Promise.resolve(
        supabase
          .from('app_state_users')
          .select('state')
          .eq('user_id', authUser.id)
          .single()
          .then(({ data, error }) => {
            if (error && error.code !== 'PGRST116') {
              setToast({
                id: randomId(),
                message:
                  'No se pudo cargar desde la nube. En Supabase ejecutá la migración app_state_users y revisá RLS.'
              })
            }
            if (data?.state && typeof data.state === 'object') {
              setState(mergeParsedState(data.state as Partial<AppState>))
            } else {
              const saved = localStorage.getItem(STORAGE_KEY)
              if (saved) {
                try {
                  setState(mergeParsedState(JSON.parse(saved) as Partial<AppState>))
                } catch { /* ignore */ }
              }
            }
          }, () => {
            setToast({
              id: randomId(),
              message:
                'Error al conectar con la nube. Revisá la tabla app_state_users en Supabase.'
            })
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
              try {
                setState(mergeParsedState(JSON.parse(saved) as Partial<AppState>))
              } catch { /* ignore */ }
            }
          })
      ).finally(() => {
        initialLoadDoneRef.current = true
        setIsRefreshing(false)
      })
    } else if (supabase && !authUser) {
      // En pantalla de login no cargamos estado
    } else if (!supabase) {
      fetch(`${API_BASE}/api/state`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data === 'object') setState(mergeParsedState(data as Partial<AppState>))
        }, () => {})
    }
  }, [authUser, refreshTrigger])

  useEffect(() => {
    const skipSupabase = !!authUser && !initialLoadDoneRef.current
    saveState(state, authUser?.id, {
      onError: (msg) => setToast({ id: randomId(), message: msg }),
      skipSupabase
    })
    document.documentElement.classList.toggle('dark', state.theme === 'dark')
  }, [state, authUser?.id])

  // Recordatorio suave de hidratación (una vez por sesión, si tiene menos de 8 vasos)
  useEffect(() => {
    if (!authUser || activeTab !== 'inicio' || hydrationReminderShown.current) return
    const t = setTimeout(() => {
      if (hydrationReminderShown.current || waterGlassesRef.current >= 8) return
      hydrationReminderShown.current = true
      setToast({ id: randomId(), message: '¿Sumamos un vaso de agua? 💧' })
    }, 90000) // 90 segundos
    return () => clearTimeout(t)
  }, [authUser, activeTab])

  // Pull to refresh (solo cuando hay usuario y estamos en la app)
  useEffect(() => {
    if (!authUser) return
    const onStart = (e: TouchEvent) => {
      pullStartY.current = e.touches[0].clientY
    }
    const onMove = (e: TouchEvent) => {
      if (window.scrollY > 0) return
      const y = e.touches[0].clientY
      const delta = y - pullStartY.current
      if (delta > 0) {
        const d = Math.min(100, delta * 0.5)
        pullDistanceRef.current = d
        setPullDistance(d)
      }
    }
    const onEnd = () => {
      if (pullDistanceRef.current > 55) setRefreshTrigger((t) => t + 1)
      pullDistanceRef.current = 0
      setPullDistance(0)
      pullStartY.current = 0
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [authUser])

  // Update fasting timer every minute
  useEffect(() => {
    const updateFasting = () => setFastingTime(getFastingStatus(state.fastingProtocol))
    updateFasting()
    const interval = setInterval(updateFasting, 60_000)
    return () => clearInterval(interval)
  }, [state.fastingProtocol])

  const todayKey = formatDateKey(new Date())
  const todaysMeals = state.meals
    .filter((meal) => meal.date === todayKey)
    .sort((a, b) => a.time.localeCompare(b.time))

  // Todos los tipos siempre (aunque hagas IF a veces desayunás)
  const activeMealTypes = mealTypes

  const recentMeals = state.meals
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
    .slice(0, 5)

  const dailyTotals = totalMacros(todaysMeals)
  const weeklyData = useMemo(() => getWeeklySummary(state.meals), [state.meals])

  const weightChartData = useMemo(() => {
    return state.weightHistory
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map((entry) => ({
        date: new Date(entry.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
        peso: entry.weight,
        objetivo: state.profile.goalWeight
      }))
  }, [state.weightHistory, state.profile.goalWeight])

  const bodyCompChartData = useMemo(() => {
    return state.bodyComposition
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10)
      .map((entry) => ({
        date: new Date(entry.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
        grasa: entry.fatPercentage,
        musculo: entry.muscleMass
      }))
  }, [state.bodyComposition])

  const weeklyStats = useMemo(() => {
    const last7Days = weeklyData.slice(-7)
    const avgCalories = Math.round(last7Days.reduce((acc, d) => acc + d.calories, 0) / 7)
    const avgProtein = Math.round(last7Days.reduce((acc, d) => acc + d.protein, 0) / 7)
    const avgCarbs = Math.round(last7Days.reduce((acc, d) => acc + d.carbs, 0) / 7)
    const avgFat = Math.round(last7Days.reduce((acc, d) => acc + d.fat, 0) / 7)
    const daysOnTarget = last7Days.filter(
      (d) => d.calories >= state.goals.caloriesTarget * 0.9 && d.calories <= state.goals.caloriesTarget * 1.1
    ).length
    return { avgCalories, avgProtein, avgCarbs, avgFat, daysOnTarget }
  }, [weeklyData, state.goals.caloriesTarget])

  const weightProgress = useMemo(() => {
    if (state.weightHistory.length < 2) return null
    const sorted = state.weightHistory.slice().sort((a, b) => a.date.localeCompare(b.date))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const change = last.weight - first.weight
    const daysElapsed = Math.max(1, Math.round((new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24)))
    const weeklyRate = (change / daysElapsed) * 7
    return { change, weeklyRate, current: last.weight, start: first.weight }
  }, [state.weightHistory])

  const calendarDays = useMemo(() => getMonthDays(calendarMonth), [calendarMonth])

  const mealsByDate = useMemo(() => {
    const map: Record<string, MealEntry[]> = {}
    state.meals.forEach((meal) => {
      if (!map[meal.date]) map[meal.date] = []
      map[meal.date].push(meal)
    })
    return map
  }, [state.meals])

  // === Weekly Activity Summary ===
  const weeklyActivity = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay()) // Sunday
    weekStart.setHours(0, 0, 0, 0)
    const weekKey = formatDateKey(weekStart)

    const thisWeekActivities = state.activities.filter(a => a.date >= weekKey)
    const totalMinutes = thisWeekActivities.reduce((acc, a) => acc + a.minutes, 0)
    const daysActive = new Set(thisWeekActivities.map(a => a.date)).size
    const categoryBreakdown: Record<string, number> = {}
    thisWeekActivities.forEach(a => {
      categoryBreakdown[a.category] = (categoryBreakdown[a.category] || 0) + a.minutes
    })
    const strengthSessions = thisWeekActivities.filter(a =>
      a.category === 'Fuerza' || a.category === 'Gimnasio' || a.category === 'Funcional'
    ).length
    const topCategories = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)

    return { totalMinutes, daysActive, strengthSessions, topCategories, count: thisWeekActivities.length }
  }, [state.activities])

  // === Today's Steps ===
  const todaySteps = useMemo(() => {
    const entry = state.dailySteps.find(s => s.date === todayKey)
    return entry?.steps ?? 0
  }, [state.dailySteps, todayKey])

  const handleAddSteps = () => {
    const steps = parseInt(stepsInput)
    if (isNaN(steps) || steps < 0) return
    setState(prev => ({
      ...prev,
      dailySteps: [
        ...prev.dailySteps.filter(s => s.date !== todayKey),
        { date: todayKey, steps }
      ]
    }))
    setStepsInput('')
    setToast({ id: randomId(), message: `¡${steps.toLocaleString()} pasos registrados! 👟` })
  }

  // === Wedding Countdown & Motivational ===
  const weddingCountdown = useMemo(() => {
    const wedding = new Date(state.weddingDate + 'T00:00:00')
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = wedding.getTime() - now.getTime()
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))
    const weeksLeft = Math.floor(daysLeft / 7)
    const totalDays = Math.ceil((wedding.getTime() - new Date('2026-02-19').getTime()) / (1000 * 60 * 60 * 24))
    const progress = Math.max(0, Math.min(1, 1 - daysLeft / totalDays))
    return { daysLeft, weeksLeft, progress }
  }, [state.weddingDate])

  const weddingMilestone = useMemo(() => {
    const { daysLeft, progress } = weddingCountdown
    if (daysLeft <= 0) return null
    if (daysLeft <= 7) return { text: '¡Última semana!', emoji: '💒' }
    if (daysLeft <= 30) return { text: '1 mes para el gran día', emoji: '💍' }
    if (progress >= 0.75) return { text: '75% del camino', emoji: '✨' }
    if (progress >= 0.5) return { text: '50% del camino', emoji: '🌟' }
    if (progress >= 0.25) return { text: '25% del camino', emoji: '🌱' }
    return null
  }, [weddingCountdown])

  const motivationalMessages = useMemo(() => {
    const { daysLeft } = weddingCountdown
    const messages = [
      'Cada día que entrenas es un día más cerca de tu mejor versión.',
      'No se trata de ser perfecto, se trata de ser constante.',
      'Tu yo del futuro te va a agradecer por el esfuerzo de hoy.',
      'El dolor del entrenamiento dura minutos, el orgullo dura para siempre.',
      'Disciplina es elegir entre lo que querés ahora y lo que más querés.',
      'Pequeños progresos diarios = grandes resultados.',
      'El mejor momento para empezar fue ayer. El segundo mejor es ahora.',
      'No cuentes los días, hacé que los días cuenten.',
      'Sudor hoy, confianza mañana.',
      'Tu cuerpo puede soportar casi todo. Es tu mente la que tenés que convencer.',
      'Cada repetición, cada comida saludable, te acerca al altar en tu mejor forma.',
      'La consistencia le gana al talento cuando el talento no es consistente.',
      'Entrená como si tu casamiento fuera mañana.',
      'Vos elegiste este camino. Ahora caminalo con todo.',
      'El compromiso con tu salud es el regalo más lindo para tu futuro.'
    ]
    const dayIndex = new Date().getDate() % messages.length
    const extraContext = daysLeft <= 30
      ? '¡Última recta! Cada día cuenta.'
      : daysLeft <= 90
        ? 'Entraste en los últimos 3 meses. A meterle con todo.'
        : daysLeft <= 180
          ? 'Medio año para brillar. Vas muy bien.'
          : 'Tenés tiempo de sobra, pero la consistencia empieza hoy.'
    return { daily: messages[dayIndex], context: extraContext }
  }, [weddingCountdown])

  // Frase motivacional con IA (varía cada día si hay API key)
  useEffect(() => {
    if (!state.openaiApiKey || aiMotivationalLoading) return
    const needNew = !aiMotivational || aiMotivational.date !== todayKey
    if (!needNew) return

    setAiMotivationalLoading(true)
    fetchMotivationalFromAI(state.openaiApiKey, weddingCountdown.daysLeft, state.streak)
      .then(({ daily, context }) => {
        setAiMotivational({ daily, context, date: todayKey })
      }, () => {})
      .finally(() => setAiMotivationalLoading(false))
  }, [state.openaiApiKey, todayKey, weddingCountdown.daysLeft, state.streak])

  // === Mentor: What to do today ===
  const mentorChecklist = useMemo(() => {
    const items: { label: string; done: boolean; icon: string }[] = []
    // Meals check
    const mealsToday = todaysMeals.length
    items.push({
      label: mealsToday >= 3 ? 'Registraste tus 3 comidas' : `Registrar comidas (${mealsToday}/3)`,
      done: mealsToday >= 3,
      icon: '🍽️'
    })
    // Water check
    items.push({
      label: state.waterGlasses >= 8 ? '8 vasos de agua completados' : `Tomar agua (${state.waterGlasses}/8 vasos)`,
      done: state.waterGlasses >= 8,
      icon: '💧'
    })
    // Activity check
    const activityToday = state.activities.filter(a => a.date === todayKey)
    const activityMinToday = activityToday.reduce((acc, a) => acc + a.minutes, 0)
    items.push({
      label: activityMinToday >= 30 ? `¡Actividad completada! (${activityMinToday} min)` : `Actividad física (${activityMinToday}/30 min)`,
      done: activityMinToday >= 30,
      icon: '💪'
    })
    // Steps check
    items.push({
      label: todaySteps >= 8000 ? `${todaySteps.toLocaleString()} pasos` : `Caminar (${todaySteps.toLocaleString()}/8.000 pasos)`,
      done: todaySteps >= 8000,
      icon: '👟'
    })
    // Calories check
    const calOk = dailyTotals.calories >= state.goals.caloriesTarget * 0.85 && dailyTotals.calories <= state.goals.caloriesTarget * 1.1
    items.push({
      label: calOk ? `Calorías en rango (${dailyTotals.calories} kcal)` : `Ajustar calorías (${dailyTotals.calories}/${state.goals.caloriesTarget} kcal)`,
      done: calOk,
      icon: '🔥'
    })
    const completedCount = items.filter(i => i.done).length
    return { items, completedCount, total: items.length }
  }, [todaysMeals, state.waterGlasses, state.activities, todayKey, todaySteps, dailyTotals, state.goals.caloriesTarget])

  const prevTodayKeyRef = useRef(todayKey)
  const prevCompletedRef = useRef(0)
  useEffect(() => {
    if (prevTodayKeyRef.current !== todayKey) {
      prevTodayKeyRef.current = todayKey
      celebrationShownForDate.current = null
      prevCompletedRef.current = 0
      setState((prev) => ({ ...prev, waterGlasses: 0 }))
    }
  }, [todayKey])

  useEffect(() => {
    const { completedCount, total } = mentorChecklist
    const justBecameComplete = total > 0 && completedCount === total && prevCompletedRef.current < total
    prevCompletedRef.current = completedCount
    if (justBecameComplete && celebrationShownForDate.current !== todayKey) {
      celebrationShownForDate.current = todayKey
      setShowCelebration(true)
    }
  }, [todayKey, mentorChecklist.completedCount, mentorChecklist.total])

  const selectedDateMeals = useMemo(() => {
    const key = formatDateKey(selectedDate)
    return state.meals.filter((m) => m.date === key).sort((a, b) => a.time.localeCompare(b.time))
  }, [state.meals, selectedDate])

  const selectedDateTotals = useMemo(() => totalMacros(selectedDateMeals), [selectedDateMeals])

  const filteredSelectedDateMeals = useMemo(() => {
    if (historyMealFilter === 'Todas') return selectedDateMeals
    return selectedDateMeals.filter((m) => m.mealType === historyMealFilter)
  }, [selectedDateMeals, historyMealFilter])

  const filteredSelectedDateTotals = useMemo(() => totalMacros(filteredSelectedDateMeals), [filteredSelectedDateMeals])

  const macrosChart = [
    { name: 'Proteínas', value: dailyTotals.protein, color: '#5c8a6b' },
    { name: 'Carbos', value: dailyTotals.carbs, color: '#b07f4c' },
    { name: 'Grasas', value: dailyTotals.fat, color: '#ff6a3a' }
  ]

  const dailyCalorieRatio = dailyTotals.calories / state.goals.caloriesTarget

  const achievements = [
    dailyTotals.fiber >= 25
      ? 'Excelente ingesta de fibra hoy 🌾'
      : 'Suma 2 porciones de fibra para el objetivo',
    todaysMeals.length >= 4
      ? '¡Día completo! Registraste 4 comidas ✨'
      : 'Vas bien, registra una comida más',
    state.waterGlasses >= 6
      ? 'Hidratación 💧 constante, gran hábito'
      : 'Te faltan vasos de agua para tu meta'
  ]

  const weekendProteinDrop = useMemo(() => {
    const proteinByDay = state.meals.reduce(
      (acc, meal) => {
        const day = getWeekday(meal.date)
        acc[day] = (acc[day] ?? 0) + meal.protein
        return acc
      },
      {} as Record<number, number>
    )

    const weekend = (proteinByDay[0] ?? 0) + (proteinByDay[6] ?? 0)
    const weekday =
      (proteinByDay[1] ?? 0) +
      (proteinByDay[2] ?? 0) +
      (proteinByDay[3] ?? 0) +
      (proteinByDay[4] ?? 0) +
      (proteinByDay[5] ?? 0)

    return weekend < weekday * 0.4
  }, [state.meals])

  const libraryFoods = useMemo(() => {
    const combined = [...baseFoods, ...state.customFoods]
    return combined.filter((food) => {
      if (libraryCategory !== 'Todas' && food.category !== libraryCategory) {
        return false
      }
      if (!librarySearch.trim()) return true
      return food.name.toLowerCase().includes(librarySearch.toLowerCase())
    })
  }, [librarySearch, libraryCategory, state.customFoods])

  const handleAddMeal = () => {
    if (!mealName.trim()) return
    const entry = buildMealEntry(mealName.trim(), selectedMealType, portion, state.customFoods, mealNote.trim(), mealTime, mealDate)
    setState((prev) => ({
      ...prev,
      meals: [entry, ...prev.meals]
    }))
    setMealName('')
    setMealNote('')
    setMealTime(formatTimeInput(new Date()))
    setMealDate(formatDateKey(new Date()))
    setToast({ id: randomId(), message: '¡Registro guardado con éxito!' })
    setShowRegisterCheck(true)
  }

  const handleAiEstimate = async (description: string) => {
    setAiDescription(description)
    if (description.trim().length < 3) {
      setAiEstimate(null)
      return
    }

    // Si hay API key de OpenAI, usar IA real
    if (state.openaiApiKey) {
      setIsLoadingAi(true)
      try {
        const estimate = await estimateCaloriesWithOpenAI(description, state.openaiApiKey)
        setAiEstimate(estimate)
      } catch (error) {
        console.error('Error en estimación:', error)
        // Fallback a sistema de reglas
        const fallback = estimateCaloriesFromDescription(description)
        setAiEstimate({ ...fallback, reasoning: 'Estimación de respaldo' })
      } finally {
        setIsLoadingAi(false)
      }
    } else {
      // Sin API key, usar sistema de reglas
      const estimate = estimateCaloriesFromDescription(description)
      setAiEstimate({ ...estimate, reasoning: 'Sin API key - usando reglas básicas' })
    }
  }

  const handleSaveApiKey = () => {
    if (tempApiKey.trim().startsWith('sk-')) {
      setState((prev) => ({ ...prev, openaiApiKey: tempApiKey.trim() }))
      setShowApiKeyModal(false)
      setTempApiKey('')
      setToast({ id: randomId(), message: 'API Key guardada correctamente' })
    } else {
      setToast({ id: randomId(), message: 'API Key inválida. Debe empezar con sk-' })
    }
  }

  const handleRemoveApiKey = () => {
    setState((prev) => ({ ...prev, openaiApiKey: '' }))
    setToast({ id: randomId(), message: 'API Key eliminada' })
  }

  const handleAddMealFromAi = () => {
    if (!aiDescription.trim() || !aiEstimate) return
    const scale = portionScale[portion - 1] ?? 1
    const entry: MealEntry = {
      id: randomId(),
      name: aiDescription.trim(),
      mealType: selectedMealType,
      time: mealTime,
      date: mealDate,
      portion,
      calories: Math.round(aiEstimate.calories * scale),
      protein: Math.round(aiEstimate.protein * scale),
      carbs: Math.round(aiEstimate.carbs * scale),
      fat: Math.round(aiEstimate.fat * scale),
      fiber: Math.round(aiEstimate.fiber * scale),
      note: `IA (${aiEstimate.confidence}): ${aiEstimate.detectedIngredients.join(', ')}${aiEstimate.reasoning ? ' - ' + aiEstimate.reasoning : ''}`
    }
    setState((prev) => ({
      ...prev,
      meals: [entry, ...prev.meals]
    }))
    setAiDescription('')
    setAiEstimate(null)
    setMealTime(formatTimeInput(new Date()))
    setMealDate(formatDateKey(new Date()))
    setToast({ id: randomId(), message: '¡Comida registrada con estimación IA!' })
    setShowRegisterCheck(true)
  }

  const handleReAdd = (meal: MealEntry) => {
    const entry = buildMealEntry(meal.name, meal.mealType, meal.portion, state.customFoods)
    setState((prev) => ({
      ...prev,
      meals: [entry, ...prev.meals]
    }))
    setToast({ id: randomId(), message: '¡Comida re-registrada!' })
  }

  const handleRemoveMeal = (mealId: string) => {
    setState((prev) => ({
      ...prev,
      meals: prev.meals.filter((meal) => meal.id !== mealId)
    }))
    setToast({ id: randomId(), message: 'Comida eliminada' })
  }

  const handleUpdateMeal = (updatedMeal: MealEntry) => {
    setState((prev) => ({
      ...prev,
      meals: prev.meals.map((meal) => meal.id === updatedMeal.id ? updatedMeal : meal)
    }))
    setEditingMeal(null)
    setToast({ id: randomId(), message: 'Comida actualizada' })
  }

  const handleRemoveActivity = (activityId: string) => {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== activityId)
    }))
    setToast({ id: randomId(), message: 'Actividad eliminada' })
  }

  const handleUpdateActivity = (updatedActivity: ActivityEntry) => {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) => a.id === updatedActivity.id ? updatedActivity : a)
    }))
    setEditingActivity(null)
    setToast({ id: randomId(), message: 'Actividad actualizada' })
  }

  const handleToggleFavorite = (foodName: string) => {
    setState((prev) => {
      const exists = prev.favorites.includes(foodName)
      return {
        ...prev,
        favorites: exists
          ? prev.favorites.filter((fav) => fav !== foodName)
          : [...prev.favorites, foodName]
      }
    })
  }

  const handleAddCustomFood = () => {
    if (!customFood.name.trim()) return
    const newFood: FoodItem = {
      id: randomId(),
      name: customFood.name,
      category: customFood.category,
      calories: customFood.calories,
      protein: customFood.protein,
      carbs: customFood.carbs,
      fat: customFood.fat,
      fiber: customFood.fiber
    }
    setState((prev) => ({
      ...prev,
      customFoods: [newFood, ...prev.customFoods]
    }))
    setCustomFood({
      name: '',
      category: 'Otros',
      calories: 180,
      protein: 6,
      carbs: 24,
      fat: 6,
      fiber: 3
    })
    setToast({ id: randomId(), message: 'Alimento personalizado agregado' })
  }

  const handleUpdateGoals = (field: keyof Goals, value: Goals[keyof Goals]) => {
    setState((prev) => ({
      ...prev,
      goals: { ...prev.goals, [field]: value }
    }))
  }

  const handleUpdateProfile = (field: keyof Profile, value: Profile[keyof Profile]) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, [field]: value }
    }))
  }

  const handleAddActivity = () => {
    if (!activityForm.name.trim() && !activityForm.category) return
    const activityLabel =
      activityForm.name.trim() ||
      activityCategories.find((category) => category.id === activityForm.category)?.label ||
      'Actividad física'
    const entry: ActivityEntry = {
      id: randomId(),
      name: activityLabel,
      category: activityForm.category,
      minutes: activityForm.minutes,
      intensity: activityForm.intensity,
      time: activityForm.time,
      date: formatDateKey(new Date())
    }
    setState((prev) => ({
      ...prev,
      activities: [entry, ...prev.activities]
    }))
    setActivityForm((prev) => ({
      ...prev,
      name: '',
      minutes: 30,
      intensity: 'Moderada',
      time: formatTimeInput(new Date())
    }))
    setToast({ id: randomId(), message: '¡Actividad registrada! 💪' })
  }

  const handleAutoGoals = () => {
    const tdee = calculateTdee(state.profile)
    const adjustment =
      state.goals.mode === 'Pérdida'
        ? -350
        : state.goals.mode === 'Ganancia'
          ? 300
          : 0

    const calories = Math.max(1400, tdee + adjustment)
    const macros = calculateMacroTargets(calories)

    setState((prev) => ({
      ...prev,
      goals: {
        ...prev.goals,
        caloriesTarget: calories,
        proteinTarget: macros.protein,
        carbsTarget: macros.carbs,
        fatTarget: macros.fat
      }
    }))

    setToast({ id: randomId(), message: 'Objetivos ajustados automáticamente' })
  }

  const handleAddWeight = () => {
    if (weightForm.weight <= 0) return
    const entry: WeightEntry = {
      id: randomId(),
      weight: weightForm.weight,
      date: formatDateKey(new Date()),
      note: weightForm.note
    }
    setState((prev) => ({
      ...prev,
      weightHistory: [entry, ...prev.weightHistory],
      profile: { ...prev.profile, weight: weightForm.weight }
    }))
    setWeightForm({ weight: 0, note: '' })
    setToast({ id: randomId(), message: 'Peso registrado correctamente' })
  }

  const handleDeleteWeight = (id: string) => {
    setState((prev) => ({
      ...prev,
      weightHistory: prev.weightHistory.filter((w) => w.id !== id)
    }))
  }

  const handleAddBodyComp = () => {
    const entry: BodyCompositionEntry = {
      id: randomId(),
      date: formatDateKey(new Date()),
      fatPercentage: bodyCompForm.fatPercentage === '' ? null : Number(bodyCompForm.fatPercentage),
      muscleMass: bodyCompForm.muscleMass === '' ? null : Number(bodyCompForm.muscleMass),
      waterPercentage: bodyCompForm.waterPercentage === '' ? null : Number(bodyCompForm.waterPercentage),
      visceralFat: bodyCompForm.visceralFat === '' ? null : Number(bodyCompForm.visceralFat),
      boneMass: bodyCompForm.boneMass === '' ? null : Number(bodyCompForm.boneMass),
      metabolicAge: bodyCompForm.metabolicAge === '' ? null : Number(bodyCompForm.metabolicAge),
      note: bodyCompForm.note
    }
    setState((prev) => ({
      ...prev,
      bodyComposition: [entry, ...prev.bodyComposition]
    }))
    setBodyCompForm({
      fatPercentage: '',
      muscleMass: '',
      waterPercentage: '',
      visceralFat: '',
      boneMass: '',
      metabolicAge: '',
      note: ''
    })
    setToast({ id: randomId(), message: 'Composición corporal registrada' })
  }

  const handleDeleteBodyComp = (id: string) => {
    setState((prev) => ({
      ...prev,
      bodyComposition: prev.bodyComposition.filter((b) => b.id !== id)
    }))
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return

    const current = [...state.meals]
    const draggingIndex = current.findIndex((meal) => meal.id === draggingId)
    const targetIndex = current.findIndex((meal) => meal.id === targetId)

    if (draggingIndex === -1 || targetIndex === -1) return

    const [moved] = current.splice(draggingIndex, 1)
    current.splice(targetIndex, 0, moved)

    setState((prev) => ({
      ...prev,
      meals: current
    }))
  }

  const monthGrid = getMonthDays(new Date())
  const historyMeals = state.meals.filter((meal) =>
    meal.name.toLowerCase().includes(historySearch.toLowerCase())
  )
  const tdeeValue = calculateTdee(state.profile)

  // Macro deficit for "completar macros" mode
  const macroDeficit = {
    calories: Math.max(0, state.goals.caloriesTarget - dailyTotals.calories),
    protein: Math.max(0, state.goals.proteinTarget - dailyTotals.protein),
    carbs: Math.max(0, state.goals.carbsTarget - dailyTotals.carbs),
    fat: Math.max(0, state.goals.fatTarget - dailyTotals.fat)
  }

  // Get local suggestions to fill macro deficit
  const getMacroSuggestions = (): MealSuggestion[] => {
    const allFoods = [...baseFoods, ...state.customFoods]
    const scored = allFoods
      .filter(f => f.calories > 0 && f.calories <= macroDeficit.calories + 50)
      .map(f => {
        let score = 0
        if (macroDeficit.protein > 20 && f.protein >= 15) score += f.protein * 2
        if (macroDeficit.carbs > 30 && f.carbs >= 15) score += f.carbs
        if (macroDeficit.fat > 10 && f.fat >= 5) score += f.fat
        score += f.fiber * 0.5
        // Prefer foods from the plan
        if (f.id.startsWith('pn-') || f.id.startsWith('to-') || f.id.startsWith('wr-') || f.id.startsWith('pp-')) score += 20
        return { ...f, score, tags: [f.category], mealType: getMealTypeForCurrentTime(state.fastingProtocol) }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
    return scored
  }

  // OpenAI assistant for ingredient-based suggestions
  const handleAssistantQuery = async () => {
    if (!ingredientsInput.trim()) return
    setIsLoadingAssistant(true)
    setAssistantResult('')

    if (state.openaiApiKey) {
      try {
        const systemPrompt = `Eres un asistente nutricional personal. El usuario sigue un protocolo de Ayuno Intermitente 16:8 con ventana alimentaria de ${state.fastingProtocol.eatingWindowStart} a ${state.fastingProtocol.eatingWindowEnd}.

Guías de su nutricionista:
- Preferir vegetales crudos, proteínas magras, granos integrales
- Aceite de oliva como grasa principal
- 2L de agua por día
- Evitar ultraprocesados, azúcar agregada, frituras
- Objetivo diario: ${state.goals.caloriesTarget} kcal, ${state.goals.proteinTarget}g proteína, ${state.goals.carbsTarget}g carbos, ${state.goals.fatTarget}g grasas

Hoy ya consumió: ${dailyTotals.calories} kcal, ${dailyTotals.protein}g proteína, ${dailyTotals.carbs}g carbos, ${dailyTotals.fat}g grasas.
Le faltan: ${macroDeficit.calories} kcal, ${macroDeficit.protein}g proteína, ${macroDeficit.carbs}g carbos, ${macroDeficit.fat}g grasas.

Responde en español, de forma concisa y práctica. Sugiere 2-3 opciones de comidas con los ingredientes que tiene. Para cada opción incluye: nombre, ingredientes principales, calorías estimadas y macros (P/C/G). Formatea con saltos de línea claros.`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.openaiApiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Tengo estos ingredientes disponibles: ${ingredientsInput}. ¿Qué puedo cocinar?` }
            ],
            temperature: 0.7,
            max_tokens: 800
          })
        })
        const data = await response.json()
        setAssistantResult(data.choices?.[0]?.message?.content ?? 'No se pudo obtener una respuesta.')
      } catch {
        setAssistantResult('Error al consultar la IA. Verificá tu API Key o intentá de nuevo.')
      }
    } else {
      // Local fallback: search matching foods
      const words = ingredientsInput.toLowerCase().split(/[,\s]+/).filter(Boolean)
      const allFoods = [...baseFoods, ...state.customFoods]
      const matches = allFoods.filter(f =>
        words.some(w => f.name.toLowerCase().includes(w))
      )
      if (matches.length > 0) {
        const lines = matches.slice(0, 5).map(f =>
          `• ${f.name} — ${f.calories} kcal | P: ${f.protein}g | C: ${f.carbs}g | G: ${f.fat}g`
        )
        setAssistantResult(`Encontré estos alimentos en tu base de datos:\n\n${lines.join('\n')}\n\nTip: Configurá tu API Key de OpenAI para recibir sugerencias de recetas personalizadas.`)
      } else {
        setAssistantResult('No encontré coincidencias en la base de datos. Configurá tu API Key de OpenAI para recibir sugerencias de recetas personalizadas con esos ingredientes.')
      }
    }
    setIsLoadingAssistant(false)
  }

  const handleChatSend = async () => {
    const text = chatInput.trim()
    if (!text) return
    const userMsg: { role: 'user' | 'assistant'; content: string } = { role: 'user', content: text }
    setChatMessages((prev) => [...prev, userMsg])
    setChatInput('')
    setIsLoadingChat(true)

    if (state.openaiApiKey) {
      try {
        const mealsTodaySummary = todaysMeals.length === 0
          ? 'Aún no registró comidas hoy.'
          : todaysMeals.map((m) => `- ${m.mealType} ${m.time}: ${m.name} (${m.calories} kcal, P:${m.protein}g C:${m.carbs}g G:${m.fat}g)`).join('\n')
        const deficitCal = Math.max(0, state.goals.caloriesTarget - dailyTotals.calories)
        const deficitP = Math.max(0, state.goals.proteinTarget - dailyTotals.protein)
        const customFoodNames = state.customFoods.length === 0 ? 'Ninguno' : state.customFoods.slice(0, 30).map((f) => f.name).join(', ')
        const lastWeight = state.weightHistory.length > 0
          ? state.weightHistory.slice().sort((a, b) => b.date.localeCompare(a.date))[0]
          : null
        const activitiesToday = state.activities.filter((a) => a.date === todayKey)
        const activitiesSummary = activitiesToday.length === 0 ? 'Ninguna registrada hoy.' : activitiesToday.map((a) => `${a.category} ${a.minutes} min`).join(', ')

        const userContext = `
Datos actuales del usuario (usá esto para razonar y dar respuestas personalizadas):

- Fecha de hoy: ${todayKey}
- Comidas registradas hoy: ${todaysMeals.length}
${mealsTodaySummary}

- Totales del día: ${dailyTotals.calories} kcal, ${dailyTotals.protein}g proteína, ${dailyTotals.carbs}g carbos, ${dailyTotals.fat}g grasas, ${dailyTotals.fiber}g fibra
- Objetivos diarios: ${state.goals.caloriesTarget} kcal, ${state.goals.proteinTarget}g proteína, ${state.goals.carbsTarget}g carbos, ${state.goals.fatTarget}g grasas
- Le faltan aprox: ${deficitCal} kcal, ${deficitP}g proteína para el objetivo de hoy
- Vasos de agua hoy: ${state.waterGlasses}/8
- Ayuno intermitente: IF 16:8, ventana ${state.fastingProtocol.eatingWindowStart}-${state.fastingProtocol.eatingWindowEnd}
- Alimentos personalizados en su biblioteca: ${customFoodNames}
${lastWeight ? `- Último peso registrado: ${lastWeight.weight} kg (${lastWeight.date})` : ''}
- Actividad física hoy: ${activitiesSummary}
`

        const systemPrompt = `Sos un asistente de nutrición y alimentación en español. Ayudás con:
- Comidas saludables, recetas y preparaciones
- Nutrición, macros, calorías y planes alimentarios
- Listas de supermercado y qué comprar
- Ayuno intermitente y ventana alimentaria

IMPORTANTE: Tenés acceso a la información que el usuario cargó en la app. Usala para razonar y dar respuestas personalizadas (qué le falta hoy, sugerir según lo que ya comió, recordar sus alimentos favoritos, etc.). Si pregunta por "hoy" o "mi día", referite a sus datos actuales.
${userContext}

Responde en español, de forma clara y práctica. Si pide lista de super, dala por categorías. Mantené respuestas concisas pero útiles.`

        const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
          { role: 'system', content: systemPrompt },
          ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: text }
        ]

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.openaiApiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 800
          })
        })
        const data = await response.json()
        const reply = data.choices?.[0]?.message?.content ?? 'No pude generar una respuesta.'
        setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      } catch {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Error al consultar. Verificá tu API Key de OpenAI o intentá de nuevo.' }])
      }
    } else {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Para usar el asistente de preguntas necesitás configurar tu API Key de OpenAI (Registro rápido > Describir con IA > Configurar).' }
      ])
    }
    setIsLoadingChat(false)
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = getSupabase()
    if (!supabase || !authEmail.trim() || !authPassword) return
    setAuthError(null)
    setAuthSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
      if (error) throw error
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Error al iniciar sesión.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleRequestInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = getSupabase()
    if (!supabase || !requestInviteEmail.trim()) return
    setAuthError(null)
    setAuthSubmitting(true)
    try {
      const { error } = await supabase.from('invitation_requests').insert({
        email: requestInviteEmail.trim().toLowerCase(),
        status: 'pending'
      })
      if (error) throw error
      setRequestInviteSent(true)
      setRequestInviteEmail('')
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Error al pedir invitación.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = getSupabase()
    if (!supabase || !inviteEmail?.trim() || !authPassword) return
    setAuthError(null)
    setAuthSubmitting(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: inviteEmail.trim(),
        password: authPassword,
        options: { emailRedirectTo: window.location.origin }
      })
      if (error) throw error
      await supabase.from('invitations').update({ used_at: new Date().toISOString() }).eq('email', inviteEmail.trim())
      setAuthError('Revisá tu email para confirmar la cuenta (si está activado en Supabase). Si no, ya podés iniciar sesión.')
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Error al completar registro.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleAcceptRequest = async (requestId: string, email: string) => {
    const supabase = getSupabase()
    if (!supabase || !authUser) return
    const { data: inv } = await supabase.from('invitations').insert({
      email: email.toLowerCase(),
      created_by: authUser.id
    }).select('id, email, token, created_at, used_at').single()
    if (inv?.token) {
      await supabase.from('invitation_requests').update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
        responded_by: authUser.id
      }).eq('id', requestId)
      setInvitationRequests(prev => prev.filter(r => r.id !== requestId))
      setInvitationsList(prev => [{ id: inv.id, email: inv.email, token: inv.token, created_at: inv.created_at, used_at: inv.used_at }, ...prev])
      const link = `${window.location.origin}${window.location.pathname}?invite=${inv.token}`
      window.navigator.clipboard.writeText(link)
      setToast({ id: randomId(), message: 'Link copiado al portapapeles' })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    const supabase = getSupabase()
    if (!supabase || !authUser) return
    await supabase.from('invitation_requests').update({
      status: 'rejected',
      responded_at: new Date().toISOString(),
      responded_by: authUser.id
    }).eq('id', requestId)
    setInvitationRequests(prev => prev.filter(r => r.id !== requestId))
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = getSupabase()
    if (!supabase || !authUser || !newInviteEmail.trim()) return
    const { data, error } = await supabase.from('invitations').insert({
      email: newInviteEmail.trim().toLowerCase(),
      created_by: authUser.id
    }).select('id, email, token, created_at, used_at').single()
    if (error) {
      setToast({ id: randomId(), message: 'Error al crear invitación' })
      return
    }
    if (data?.token) {
      const link = `${window.location.origin}${window.location.pathname}?invite=${data.token}`
      window.navigator.clipboard.writeText(link)
      setInvitationsList(prev => [{ id: data.id, email: data.email, token: data.token, created_at: data.created_at, used_at: data.used_at }, ...prev])
      setNewInviteEmail('')
      setToast({ id: randomId(), message: 'Link copiado al portapapeles' })
    }
  }

  const handleSignOut = () => {
    getSupabase()?.auth.signOut()
  }

  const supabase = getSupabase()

  // Sin Supabase (ej. Vercel sin variables): pedir configurar para ver login y guardar datos
  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sage-50 p-4 dark:bg-sage-950">
        <div className="w-full max-w-md rounded-3xl border border-sage-200 bg-white p-6 shadow-soft dark:border-sage-700 dark:bg-sage-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-500 text-white">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <path d="M5 13c5-8 12-9 14-8-1 6-5 12-13 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="font-display text-xl font-semibold text-sage-900 dark:text-sage-100">Nutr.io</h1>
          </div>
          <h2 className="mb-2 font-semibold text-sage-800 dark:text-sage-200">Configurá Supabase para el login</h2>
          <p className="mb-4 text-sm text-sage-600 dark:text-sage-400">
            En este despliegue no están definidas las variables de Supabase, por eso ves la app sin pantalla de login.
          </p>
          <p className="mb-4 text-sm text-sage-600 dark:text-sage-400">
            En tu proyecto de Vercel (o donde despliegues), agregá las variables de entorno:
          </p>
          <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-sage-700 dark:text-sage-300">
            <li><code className="rounded bg-sage-100 px-1 dark:bg-sage-800">VITE_SUPABASE_URL</code></li>
            <li><code className="rounded bg-sage-100 px-1 dark:bg-sage-800">VITE_SUPABASE_ANON_KEY</code></li>
          </ul>
          <p className="text-xs text-sage-500 dark:text-sage-400">
            Valores en tu proyecto Supabase → Settings → API. Después volvé a desplegar.
          </p>
        </div>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sage-100 dark:bg-sage-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sage-600 border-t-transparent dark:border-sage-400" />
        <p className="text-sm text-sage-600 dark:text-sage-400">Cargando...</p>
      </div>
    )
  }

  if (!authUser) {
    const card = (
      <div className="w-full max-w-sm rounded-3xl border border-sage-200 bg-white p-6 shadow-soft dark:border-sage-700 dark:bg-sage-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-500 text-white">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path d="M5 13c5-8 12-9 14-8-1 6-5 12-13 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-sage-900 dark:text-sage-100">Nutr.io</h1>
            <p className="text-xs text-sage-500 dark:text-sage-400">
              {inviteToken && inviteValid && inviteEmail ? 'Completá tu registro' : requestInviteView ? 'Pedir invitación' : 'Accedé a tu cuenta'}
            </p>
          </div>
        </div>

        {requestInviteSent ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-xl bg-sage-100 px-3 py-3 text-sm text-sage-700 dark:bg-sage-800 dark:text-sage-200">
              Te avisaremos cuando tu invitación esté lista.
            </p>
            <button
              type="button"
              onClick={() => { setRequestInviteSent(false); setRequestInviteView(false) }}
              className="text-sm text-sage-600 underline dark:text-sage-400"
            >
              Volver a iniciar sesión
            </button>
          </div>
        ) : inviteToken && inviteValid && inviteEmail ? (
          <form onSubmit={handleCompleteRegistration} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-sage-600 dark:text-sage-400">Email</label>
              <input
                type="email"
                value={inviteEmail}
                readOnly
                className="w-full rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-600 dark:border-sage-700 dark:bg-sage-800 dark:text-sage-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-sage-600 dark:text-sage-400">Contraseña</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm outline-none focus:border-sage-500 dark:border-sage-700 dark:bg-sage-800 dark:text-sage-100"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            {authError && (
              <p className="rounded-xl bg-coral-50 px-3 py-2 text-xs text-coral-700 dark:bg-coral-900/50 dark:text-coral-300">
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={authSubmitting}
              className="min-h-[48px] w-full rounded-2xl bg-sage-500 py-3 text-sm font-semibold text-white shadow-soft hover:bg-sage-600 disabled:opacity-60"
            >
              {authSubmitting ? 'Esperá...' : 'Completar registro'}
            </button>
            <button
              type="button"
              onClick={() => { setInviteToken(null); setInviteEmail(null); setInviteValid(null); window.history.replaceState({}, '', window.location.pathname) }}
              className="text-xs text-sage-500 underline hover:text-sage-700 dark:text-sage-400"
            >
              Tengo cuenta, iniciar sesión
            </button>
          </form>
        ) : requestInviteView ? (
          <form onSubmit={handleRequestInvite} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-sage-600 dark:text-sage-400">Email</label>
              <input
                type="email"
                value={requestInviteEmail}
                onChange={(e) => setRequestInviteEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm outline-none focus:border-sage-500 dark:border-sage-700 dark:bg-sage-800 dark:text-sage-100"
                required
                autoComplete="email"
              />
            </div>
            {authError && (
              <p className="rounded-xl bg-coral-50 px-3 py-2 text-xs text-coral-700 dark:bg-coral-900/50 dark:text-coral-300">
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={authSubmitting}
              className="min-h-[48px] w-full rounded-2xl bg-sage-500 py-3 text-sm font-semibold text-white shadow-soft hover:bg-sage-600 disabled:opacity-60"
            >
              {authSubmitting ? 'Esperá...' : 'Pedir invitación'}
            </button>
            <button
              type="button"
              onClick={() => { setRequestInviteView(false); setAuthError(null) }}
              className="text-xs text-sage-500 underline hover:text-sage-700 dark:text-sage-400"
            >
              Volver a iniciar sesión
            </button>
          </form>
        ) : inviteToken && inviteValid === false ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-xl bg-coral-50 px-3 py-3 text-sm text-coral-700 dark:bg-coral-900/50 dark:text-coral-300">
              El link de invitación no es válido o ya fue usado.
            </p>
            <button
              type="button"
              onClick={() => { setInviteToken(null); setInviteValid(null); window.history.replaceState({}, '', window.location.pathname) }}
              className="text-sm text-sage-600 underline dark:text-sage-400"
            >
              Volver
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-sage-600 dark:text-sage-400">Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm outline-none focus:border-sage-500 dark:border-sage-700 dark:bg-sage-800 dark:text-sage-100"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-sage-600 dark:text-sage-400">Contraseña</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm outline-none focus:border-sage-500 dark:border-sage-700 dark:bg-sage-800 dark:text-sage-100"
                required
                autoComplete="current-password"
              />
            </div>
            {authError && (
              <p className="rounded-xl bg-coral-50 px-3 py-2 text-xs text-coral-700 dark:bg-coral-900/50 dark:text-coral-300">
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={authSubmitting}
              className="min-h-[48px] w-full rounded-2xl bg-sage-500 py-3 text-sm font-semibold text-white shadow-soft hover:bg-sage-600 disabled:opacity-60"
            >
              {authSubmitting ? 'Esperá...' : 'Iniciar sesión'}
            </button>
            <button
              type="button"
              onClick={() => { setRequestInviteView(true); setAuthError(null) }}
              className="text-xs text-sage-500 underline hover:text-sage-700 dark:text-sage-400"
            >
              ¿No tenés cuenta? Pedir invitación
            </button>
          </form>
        )}
      </div>
    )
    return (
      <div className="flex min-h-screen items-center justify-center bg-sage-50 px-4 dark:bg-sage-950">
        {card}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sage-50 text-sage-900 dark:bg-sage-950 dark:text-sage-50">
      {(pullDistance > 0 || isRefreshing) && authUser && (
        <div className="fixed top-0 left-0 right-0 z-30 flex justify-center pt-2 safe-area-inset-top">
          <div className="rounded-full bg-sage-500/95 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
            {isRefreshing ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Actualizando...
              </span>
            ) : (
              'Soltá para actualizar'
            )}
          </div>
        </div>
      )}
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 sm:gap-6 px-3 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-4 sm:pb-12 sm:pt-6 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-500 text-white shadow-soft sm:h-12 sm:w-12 sm:rounded-2xl">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13c5-8 12-9 14-8-1 6-5 12-13 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold truncate sm:text-2xl">Nutr.io</h1>
              <p className="text-xs text-sage-600 dark:text-sage-300 sm:text-sm">
                Seguimiento diario con calma y frescura.
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-shrink flex-wrap items-center justify-end gap-2 sm:gap-3">
            {authUser && (
              <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs text-sage-600 shadow-soft dark:bg-sage-900/80 dark:text-sage-300 sm:text-sm" title={authUser.email ?? ''}>
                {authUser.email?.split('@')[0] ?? 'Usuario'}
              </span>
            )}
            <div className="rounded-full bg-white/80 px-3 py-1.5 text-xs text-sage-700 shadow-soft dark:bg-sage-900/80 dark:text-sage-200 sm:px-4 sm:py-2 sm:text-sm flex items-center gap-1.5">
              <motion.span
                className="inline-block origin-center"
                animate={{
                  scale: 1 + Math.min(state?.streak ?? 0, 12) * 0.04,
                  transition: { type: 'spring', stiffness: 300, damping: 20 }
                }}
              >
                🔥
              </motion.span>
              Racha: <span className="font-semibold">{state.streak}</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  theme: prev.theme === 'light' ? 'dark' : 'light'
                }))
              }
              title=""
              aria-label={state.theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
              className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full border border-sage-200 bg-white/80 text-sage-700 transition hover:-translate-y-0.5 hover:shadow-soft dark:border-sage-700 dark:bg-sage-900/80 dark:text-sage-200 sm:h-11 sm:w-11"
            >
              {state.theme === 'light' ? (
                <svg className="h-5 w-5 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              )}
            </button>
            {authUser && (
              <button
                type="button"
                onClick={handleSignOut}
                title=""
                aria-label="Cerrar sesión"
                className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full border border-sage-200 bg-white/80 text-sage-600 transition hover:bg-sage-100 dark:border-sage-700 dark:bg-sage-900/80 dark:text-sage-300 dark:hover:bg-sage-800 md:h-11 md:w-auto md:min-w-0 md:shrink-0 md:px-3 md:pr-4 md:gap-1.5 md:rounded-full"
              >
                <svg className="h-5 w-5 md:h-4 md:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hidden md:inline text-xs font-medium">Salir</span>
              </button>
            )}
          </div>
        </header>

        <nav className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0" aria-label="Pestañas">
          {tabLabels.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                const nextIndex = tabLabels.findIndex((t) => t.id === tab.id)
                const currentIndex = tabLabels.findIndex((t) => t.id === activeTab)
                setTabDirection(nextIndex >= currentIndex ? 1 : -1)
                setActiveTab(tab.id)
              }}
              className={`min-h-[44px] min-w-[44px] shrink-0 touch-manipulation rounded-full px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-sage-500 text-white shadow-soft'
                  : 'bg-white/70 text-sage-600 hover:bg-sage-100 dark:bg-sage-900/70 dark:text-sage-300 dark:hover:bg-sage-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {(activeTab === 'inicio' || summaryExpanded) ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`${cardBase} grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 md:gap-5 md:p-5`}
        >
          {activeTab !== 'inicio' && summaryExpanded && (
            <div className="col-span-full flex justify-end">
              <button
                type="button"
                onClick={() => setSummaryExpanded(false)}
                className="rounded-full border border-sage-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-sage-600 shadow-soft hover:bg-sage-100 dark:border-sage-700 dark:bg-sage-900/80 dark:text-sage-300"
              >
                Ocultar resumen
              </button>
            </div>
          )}
          <div className="flex flex-col justify-center gap-3 sm:gap-4">
            {weddingMilestone && (
              <div className="flex flex-wrap items-center gap-2">
                <motion.span
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sage-100/80 px-3 py-1 text-xs font-medium text-sage-700 dark:bg-sage-800/80 dark:text-sage-200"
                >
                  <span>{weddingMilestone.emoji}</span>
                  {weddingMilestone.text}
                </motion.span>
              </div>
            )}
            <p className="text-sm font-medium text-sage-600 dark:text-sage-400">
              {getGreeting()},
            </p>
            {aiMotivationalLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-full max-w-sm" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl font-semibold leading-tight sm:text-2xl -mt-1">
                  {aiMotivational?.date === todayKey ? aiMotivational.daily : motivationalMessages.daily}
                </h2>
                <p className="text-xs text-sage-600 dark:text-sage-300 sm:text-sm">
                  {aiMotivational?.date === todayKey ? aiMotivational.context : motivationalMessages.context}
                </p>
              </>
            )}
            <div className="flex flex-wrap justify-around gap-3 rounded-2xl bg-white/80 px-3 py-3 shadow-soft dark:bg-sage-900/80 sm:justify-between sm:px-4 sm:py-4">
              <ProgressRing
                value={dailyTotals.calories}
                max={state.goals.caloriesTarget}
                label="Calorías"
                unit=" kcal"
                color="coral"
              />
              <ProgressRing
                value={dailyTotals.protein}
                max={state.goals.proteinTarget}
                label="Proteínas"
                unit=" g"
                color="sage"
              />
              <ProgressRing
                value={state.waterGlasses}
                max={8}
                label="Vasos"
                unit=""
                color="sage"
              />
            </div>
            {/* Vasos de agua hoy - columna izquierda */}
            <div className={`${cardBase} p-3 sm:p-4`}>
              <h3 className="text-sm font-semibold text-sage-700 dark:text-sage-200 mb-1.5">Vasos de agua hoy</h3>
              <p className="text-xs text-sage-500 dark:text-sage-400 mb-1.5">{state.waterGlasses}/8 vasos</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, index) => {
                  const filled = index < (waterHover || state.waterGlasses)
                  const justFilled = index + 1 === lastFilledGlass
                  return (
                    <motion.button
                      key={`water-hero-${index}`}
                      type="button"
                      onMouseEnter={() => setWaterHover(index + 1)}
                      onMouseLeave={() => setWaterHover(0)}
                      onClick={() => {
                        setState((prev) => ({ ...prev, waterGlasses: index + 1 }))
                        setLastFilledGlass(index + 1)
                      }}
                      animate={justFilled ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className={`flex h-10 w-10 min-w-[40px] min-h-[40px] items-center justify-center rounded-xl border transition touch-manipulation ${
                        filled
                          ? 'border-coral-300 bg-coral-100 text-coral-600 dark:bg-coral-900/50 dark:border-coral-700'
                          : 'border-sage-200 bg-white/70 text-sage-500 dark:border-sage-700 dark:bg-sage-900/70'
                      }`}
                      aria-label={`${index + 1} vaso de agua`}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 3s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Wedding Progress Bar - primero */}
            {weddingCountdown.daysLeft > 0 && (
              <div className="rounded-2xl border border-coral-200/60 bg-gradient-to-r from-white/70 to-coral-50/50 p-2.5 shadow-soft dark:border-coral-800/40 dark:from-sage-900/60 dark:to-coral-950/30 sm:p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">💍</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-sage-700 dark:text-sage-200">Camino al altar</p>
                    <p className="text-xs text-sage-500">{weddingCountdown.daysLeft} días restantes · 7 nov 2026</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-coral-200/60 dark:bg-coral-900/40">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-coral-400 to-coral-500 transition-all duration-700"
                    style={{ width: `${weddingCountdown.progress * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 text-center text-xs text-coral-600 font-medium dark:text-coral-400">
                  {Math.round(weddingCountdown.progress * 100)}% del camino recorrido
                </p>
              </div>
            )}
            {/* Mentor Checklist */}
            <div className="rounded-2xl border border-sage-200/60 bg-white/70 p-3 shadow-soft dark:border-sage-700/60 dark:bg-sage-900/60 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-sage-700 dark:text-sage-200">Tu día hoy</h3>
                <span className="text-xs font-semibold text-coral-600">{mentorChecklist.completedCount}/{mentorChecklist.total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-sage-200/60 mb-2 dark:bg-sage-800">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-sage-400 to-coral-400 transition-all duration-500"
                  style={{ width: `${(mentorChecklist.completedCount / mentorChecklist.total) * 100}%` }}
                />
              </div>
              <div className="grid gap-1.5">
                {mentorChecklist.items.map((item, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition ${
                    item.done
                      ? 'bg-sage-100/80 text-sage-600 dark:bg-sage-800/60 dark:text-sage-300'
                      : 'text-sage-500 dark:text-sage-400'
                  }`}>
                    <span>{item.done ? '✅' : item.icon}</span>
                    <span className={item.done ? 'line-through opacity-70' : 'font-medium'}>{item.label}</span>
                  </div>
                ))}
              </div>
              {mentorChecklist.completedCount === mentorChecklist.total && (
                <div className="mt-3 rounded-xl bg-gradient-to-r from-sage-100 to-coral-100 p-2 text-center text-xs font-semibold text-sage-700 dark:from-sage-800 dark:to-coral-900 dark:text-sage-200">
                  Dia perfecto. Cada dia asi te acerca al 7 de noviembre.
                </div>
              )}
            </div>
            {/* IF Tracker - al final */}
            {state.fastingProtocol.enabled && (
              <div className="rounded-2xl border border-sage-200/60 bg-white/60 p-3 shadow-soft dark:border-sage-700/60 dark:bg-sage-900/60">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${
                    fastingTime.isFasting
                      ? 'bg-coral-100 text-coral-600 dark:bg-coral-900/60'
                      : 'bg-sage-100 text-sage-600 dark:bg-sage-800'
                  }`}>
                    {fastingTime.isFasting ? '🔒' : '🍽️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className={`text-xs font-semibold shrink-0 ${
                        fastingTime.isFasting ? 'text-coral-600' : 'text-sage-600 dark:text-sage-300'
                      }`}>
                        IF 16:8 · {fastingTime.label}
                      </span>
                      <span className="text-xs text-sage-400 whitespace-nowrap">
                        ({state.fastingProtocol.eatingWindowStart}-{state.fastingProtocol.eatingWindowEnd})
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-sage-200/60 dark:bg-sage-800">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          fastingTime.isFasting ? 'bg-coral-400' : 'bg-sage-400'
                        }`}
                        style={{ width: `${fastingTime.progress * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-sage-500">
                      <span>{fastingTime.timeLeft}</span>
                      {fastingTime.nextMeal && (
                        <span>Próximo: {fastingTime.nextMeal.meal} {fastingTime.nextMeal.time}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
        </motion.section>
        ) : (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`${cardBase} flex flex-wrap items-center justify-between gap-2 py-2 px-4 sm:py-2.5 sm:px-5`}
        >
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="text-xs font-medium text-sage-600 dark:text-sage-300">
              Hoy: <strong>{dailyTotals.calories}</strong> / {state.goals.caloriesTarget} kcal
            </span>
            <span className="text-xs font-medium text-sage-600 dark:text-sage-300">
              P: <strong>{dailyTotals.protein}</strong> g
            </span>
            <span className="text-xs font-medium text-sage-600 dark:text-sage-300">
              💧 {state.waterGlasses}/8
            </span>
            <span className="text-xs font-medium text-sage-600 dark:text-sage-300 flex items-center gap-1">
              <motion.span
                className="inline-block origin-center"
                animate={{ scale: 1 + Math.min(state?.streak ?? 0, 12) * 0.03 }}
              >
                🔥
              </motion.span>
              Racha: <strong>{state.streak}</strong>
            </span>
            {state.fastingProtocol.enabled && (
              <span className="text-xs text-sage-600 dark:text-sage-300">
                IF: {fastingTime.label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSummaryExpanded(true)}
            className="rounded-full border border-sage-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-sage-600 shadow-soft hover:bg-sage-100 dark:border-sage-700 dark:bg-sage-900/80 dark:text-sage-300"
          >
            Ver resumen completo
          </button>
        </motion.section>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'inicio' && (
            <motion.section
              key="inicio"
              initial={{ opacity: 0, x: 24 * tabDirection }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 * tabDirection }}
              transition={{ duration: 0.3 }}
              className="grid gap-4 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]"
            >
              <div className="flex flex-col gap-6">
              <div className={`${cardBase} p-6 relative overflow-hidden scroll-mt-[max(1.25rem,env(safe-area-inset-top))]`}>
                <img
                  src={cornerSpark}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 opacity-80"
                />
                <h2 className="font-display text-xl font-semibold">
                  <SectionTitle icon={<IconSpark />} text="Registro rápido" />
                </h2>

                {/* Selector de modo */}
                <div className="mt-4 flex gap-2 min-h-[44px] items-center">
                  <button
                    onClick={() => setInputMode('ia')}
                    className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      inputMode === 'ia'
                        ? 'bg-coral-500 text-white'
                        : 'bg-coral-100 text-coral-700 dark:bg-coral-900 dark:text-coral-200'
                    }`}
                  >
                    🤖 Describir con IA
                  </button>
                  <button
                    onClick={() => setInputMode('lista')}
                    className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      inputMode === 'lista'
                        ? 'bg-sage-500 text-white'
                        : 'bg-sage-100 text-sage-600 dark:bg-sage-800 dark:text-sage-300'
                    }`}
                  >
                    📋 Buscar en lista
                  </button>
                </div>

                {/* Aviso fuera de ventana IF */}
                {state.fastingProtocol.enabled && fastingTime.isFasting && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-coral-50 border border-coral-200 px-4 py-2 text-xs text-coral-700 dark:bg-coral-950/40 dark:border-coral-800 dark:text-coral-300">
                    <span>🔒</span>
                    <span>Estás fuera de tu ventana alimentaria ({state.fastingProtocol.eatingWindowStart}-{state.fastingProtocol.eatingWindowEnd}). Podés registrar igual, pero tu protocolo IF indica ayuno.</span>
                  </div>
                )}

                {inputMode === 'lista' ? (
                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-xs text-sage-500">Alimento</label>
                      <input
                        value={mealName}
                        onChange={(event) => setMealName(event.target.value)}
                        list="food-list"
                        placeholder="Ej: Ensalada de quinoa"
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-sage-500 w-full">Tipo de comida</span>
                      {activeMealTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedMealType(type)}
                          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                            selectedMealType === type
                              ? 'bg-sage-500 text-white'
                              : 'bg-sage-100 text-sage-600 dark:bg-sage-800 dark:text-sage-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Tamaño del plato</label>
                      <div className="mt-1 flex gap-2">
                        {[
                          { value: 1, label: 'Chico' },
                          { value: 2, label: 'Mediano' },
                          { value: 3, label: 'Grande' }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setPortion(opt.value)}
                            className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                              portion === opt.value
                                ? 'bg-coral-500 text-white'
                                : 'bg-coral-100 text-coral-700 dark:bg-coral-900 dark:text-coral-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-2 sm:items-end">
                      <div className="min-w-0">
                        <label className="text-xs text-sage-500">Fecha (día mes año)</label>
                        <input
                          type="date"
                          value={mealDate}
                          onChange={(e) => setMealDate(e.target.value)}
                          className="mt-1 h-[42px] w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2.5 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="text-xs text-sage-500">Horario (24 h)</label>
                        <input
                          type="time"
                          value={mealTime}
                          onChange={(e) => setMealTime(e.target.value)}
                          className="mt-1 h-[42px] w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2.5 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Nota (opcional)</label>
                      <input
                        value={mealNote}
                        onChange={(e) => setMealNote(e.target.value)}
                        placeholder="Ej: Comí en casa, me sentí bien"
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <button
                      onClick={handleAddMeal}
                      className="rounded-2xl bg-coral-500 px-6 py-3 text-sm font-semibold text-white shadow-soft hover:bg-coral-600"
                    >
                      Registrar comida
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4">
                    {/* Configuración de API Key */}
                    <div className="flex items-center justify-between rounded-2xl bg-sage-100/70 p-3 dark:bg-sage-900/70">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {state.openaiApiKey ? '✅ OpenAI conectado' : '⚠️ Sin API Key'}
                        </span>
                        {!state.openaiApiKey && (
                          <span className="text-xs text-sage-500">(usando estimación básica)</span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setTempApiKey(state.openaiApiKey)
                          setShowApiKeyModal(true)
                        }}
                        className="rounded-full bg-sage-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sage-600"
                      >
                        {state.openaiApiKey ? 'Cambiar' : 'Configurar'}
                      </button>
                    </div>
                    {authUser && (
                      <p className="text-xs text-sage-500 dark:text-sage-400">
                        Tus datos (API key, registros, metas) se guardan en tu cuenta y se sincronizan en todos tus dispositivos.
                      </p>
                    )}

                    <div>
                      <label className="text-xs text-sage-500">Describe lo que comiste</label>
                      <textarea
                        value={aiDescription}
                        onChange={(e) => handleAiEstimate(e.target.value)}
                        placeholder="Ej: Tostada con mermelada de durazno y jugo de naranja"
                        rows={3}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                      <p className="mt-1 text-xs text-sage-400">
                        Tip: Incluye ingredientes, preparación y tamaño de porción
                      </p>
                    </div>

                    {isLoadingAi && (
                      <div className="flex items-center justify-center gap-2 rounded-2xl border border-sage-200 bg-sage-50/80 p-6 dark:border-sage-700 dark:bg-sage-900/80">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
                        <span className="text-sm text-sage-600 dark:text-sage-300">Analizando con IA...</span>
                      </div>
                    )}

                    {aiEstimate && !isLoadingAi && (() => {
                      const scale = portionScale[portion - 1] ?? 1
                      return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-sage-200 bg-sage-50/80 p-4 dark:border-sage-700 dark:bg-sage-900/80"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-sage-700 dark:text-sage-200">
                            {state.openaiApiKey ? '🤖 Estimación OpenAI' : '📊 Estimación básica'}
                            {portion !== 2 && <span className="ml-1 text-xs font-normal text-sage-500">(×{scale})</span>}
                          </span>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            aiEstimate.confidence === 'alta'
                              ? 'bg-green-100 text-green-700'
                              : aiEstimate.confidence === 'media'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            Confianza {aiEstimate.confidence}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                          <div className="rounded-xl bg-white/80 p-2 dark:bg-sage-800/80">
                            <p className="text-lg font-bold text-coral-600">{Math.round(aiEstimate.calories * scale)}</p>
                            <p className="text-xs text-sage-500">kcal</p>
                          </div>
                          <div className="rounded-xl bg-white/80 p-2 dark:bg-sage-800/80">
                            <p className="text-lg font-bold text-sage-600">{Math.round(aiEstimate.protein * scale)}g</p>
                            <p className="text-xs text-sage-500">Prot</p>
                          </div>
                          <div className="rounded-xl bg-white/80 p-2 dark:bg-sage-800/80">
                            <p className="text-lg font-bold text-soil-600">{Math.round(aiEstimate.carbs * scale)}g</p>
                            <p className="text-xs text-sage-500">Carbs</p>
                          </div>
                          <div className="rounded-xl bg-white/80 p-2 dark:bg-sage-800/80">
                            <p className="text-lg font-bold text-coral-500">{Math.round(aiEstimate.fat * scale)}g</p>
                            <p className="text-xs text-sage-500">Grasas</p>
                          </div>
                          <div className="rounded-xl bg-white/80 p-2 dark:bg-sage-800/80">
                            <p className="text-lg font-bold text-green-600">{Math.round(aiEstimate.fiber * scale)}g</p>
                            <p className="text-xs text-sage-500">Fibra</p>
                          </div>
                        </div>
                        {aiEstimate.detectedIngredients.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            <span className="text-xs text-sage-500">Detectado:</span>
                            {aiEstimate.detectedIngredients.map((ing, i) => (
                              <span key={i} className="rounded-full bg-sage-200/70 px-2 py-0.5 text-xs text-sage-700 dark:bg-sage-700/70 dark:text-sage-200">
                                {ing}
                              </span>
                            ))}
                          </div>
                        )}
                        {aiEstimate.reasoning && (
                          <p className="mt-3 text-xs text-sage-500 italic">
                            💡 {aiEstimate.reasoning}
                          </p>
                        )}
                      </motion.div>
                    ); })()}

                    <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-2 sm:items-end">
                      <div className="min-w-0">
                        <label className="text-xs text-sage-500">Fecha (día mes año)</label>
                        <input
                          type="date"
                          value={mealDate}
                          onChange={(e) => setMealDate(e.target.value)}
                          className="mt-1 h-[42px] w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2.5 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="text-xs text-sage-500">Horario (24 h)</label>
                        <input
                          type="time"
                          value={mealTime}
                          onChange={(e) => setMealTime(e.target.value)}
                          className="mt-1 h-[42px] w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2.5 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-sage-500 w-full">Tipo de comida</span>
                      {activeMealTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedMealType(type)}
                          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                            selectedMealType === type
                              ? 'bg-sage-500 text-white'
                              : 'bg-sage-100 text-sage-600 dark:bg-sage-800 dark:text-sage-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Tamaño del plato</label>
                      <div className="mt-1 flex gap-2">
                        {[
                          { value: 1, label: 'Chico' },
                          { value: 2, label: 'Mediano' },
                          { value: 3, label: 'Grande' }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setPortion(opt.value)}
                            className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                              portion === opt.value
                                ? 'bg-coral-500 text-white'
                                : 'bg-coral-100 text-coral-700 dark:bg-coral-900 dark:text-coral-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleAddMealFromAi}
                      disabled={!aiEstimate}
                      className={`rounded-2xl px-6 py-3 text-sm font-semibold shadow-soft transition ${
                        aiEstimate
                          ? 'bg-coral-500 text-white hover:bg-coral-600'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Registrar con estimación IA
                    </button>
                  </div>
                )}

                <datalist id="food-list">
                  {[...baseFoods, ...state.customFoods].map((food) => (
                    <option key={food.id} value={food.name} />
                  ))}
                </datalist>
              </div>

                {/* Registrar actividad física + Pasos - debajo de Registro rápido */}
                <div className={`${cardBase} p-6`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-sage-700 dark:text-sage-200">
                      <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-sage-100 text-sage-600 dark:bg-sage-800 dark:text-sage-200">
                        💪
                      </span>
                      Registrar actividad física
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activityCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setActivityForm((prev) => ({ ...prev, category: category.id }))}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          activityForm.category === category.id
                            ? 'bg-sage-500 text-white'
                            : 'bg-sage-100 text-sage-600 hover:bg-sage-200 dark:bg-sage-800 dark:text-sage-300'
                        }`}
                      >
                        <span className="mr-1">{category.emoji}</span>
                        {category.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-sage-500">Detalle</label>
                      <input
                        value={activityForm.name}
                        onChange={(event) => setActivityForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Ej: 5K suave"
                        className="w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-xs shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-950/70"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-sage-500">Minutos</label>
                      <input
                        type="number"
                        min={10}
                        max={240}
                        step={5}
                        value={activityForm.minutes}
                        onChange={(event) =>
                          setActivityForm((prev) => ({ ...prev, minutes: Number(event.target.value) }))
                        }
                        placeholder="30"
                        className="w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-xs shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-950/70"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-sage-500">Horario</label>
                      <input
                        type="time"
                        value={activityForm.time}
                        onChange={(event) => setActivityForm((prev) => ({ ...prev, time: event.target.value }))}
                        className="w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-xs shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-950/70"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(['Suave', 'Moderada', 'Alta'] as ActivityEntry['intensity'][]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setActivityForm((prev) => ({ ...prev, intensity: level }))}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          activityForm.intensity === level
                            ? 'bg-coral-500 text-white'
                            : 'bg-coral-100 text-coral-700 dark:bg-coral-200 dark:bg-coral-900 dark:text-coral-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                    <button
                      onClick={handleAddActivity}
                      className="ml-auto rounded-full bg-sage-600 px-4 py-1.5 text-xs font-semibold text-white shadow-soft hover:bg-sage-700"
                    >
                      Guardar actividad
                    </button>
                  </div>
                  {state.activities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-sage-500">
                      <span>Últimas:</span>
                      {state.activities.slice(0, 3).map((activity) => (
                        <button
                          key={activity.id}
                          onClick={() => setEditingActivity(activity)}
                          className="rounded-full bg-sage-100 px-2 py-1 text-sage-700 hover:bg-sage-200 dark:bg-sage-800 dark:text-sage-300"
                          title="Click para editar"
                        >
                          {activity.category} · {activity.minutes} min ✏️
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-sage-200/60 dark:border-sage-700/60">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">👟</span>
                      <span className="text-sm font-semibold text-sage-700 dark:text-sage-200">Pasos del día</span>
                      {todaySteps > 0 && (
                        <span className="ml-auto text-xs font-semibold text-sage-500">{todaySteps.toLocaleString()} pasos</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={stepsInput}
                        onChange={(e) => setStepsInput(e.target.value)}
                        placeholder="Pasos (ej: 8500)"
                        className="flex-1 rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-xs shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-950/70"
                      />
                      <button
                        onClick={handleAddSteps}
                        className="rounded-full bg-sage-600 px-4 py-1.5 text-xs font-semibold text-white shadow-soft hover:bg-sage-700"
                      >
                        Guardar
                      </button>
                    </div>
                    {todaySteps > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-sage-200/60 dark:bg-sage-800">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${todaySteps >= 8000 ? 'bg-sage-500' : 'bg-sage-300'}`}
                            style={{ width: `${Math.min(100, (todaySteps / 10000) * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-sage-400">{Math.min(100, Math.round((todaySteps / 10000) * 100))}% de meta (10.000 pasos)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {/* Hidratación en página de registro */}
                <div className={`${cardBase} p-6`}>
                  <h3 className="font-display text-lg font-semibold text-sage-700 dark:text-sage-200">Hidratación 💧</h3>
                  <p className="mt-1 text-xs text-sage-500 dark:text-sage-400">{state.waterGlasses}/8 vasos hoy</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Array.from({ length: 8 }).map((_, index) => {
                      const filled = index < (waterHover || state.waterGlasses)
                      const justFilled = index + 1 === lastFilledGlass
                      return (
                        <motion.button
                          key={`water-registro-${index}`}
                          type="button"
                          onMouseEnter={() => setWaterHover(index + 1)}
                          onMouseLeave={() => setWaterHover(0)}
                          onClick={() => {
                            setState((prev) => ({ ...prev, waterGlasses: index + 1 }))
                            setLastFilledGlass(index + 1)
                          }}
                          animate={justFilled ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                          transition={{ duration: 0.4 }}
                          className={`flex h-11 w-11 min-w-[44px] min-h-[44px] items-center justify-center rounded-2xl border transition touch-manipulation ${
                            filled
                              ? 'border-coral-300 bg-coral-100 text-coral-600 dark:bg-coral-900/50 dark:border-coral-700'
                              : 'border-sage-200 bg-white/70 text-sage-500 dark:border-sage-700 dark:bg-sage-900/70'
                          }`}
                          aria-label={`${index + 1} vaso`}
                        >
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 3s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11Z"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
                <div className={`${cardBase} p-6 relative overflow-hidden`}>
                  <img
                    src={cornerLeaf}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-8 -bottom-6 h-28 w-28 opacity-70"
                  />
                  <h3 className="font-display text-lg font-semibold">Últimos registros</h3>
                  {recentMeals.length === 0 ? (
                    <EmptyState
                      emoji="🍽️"
                      title="Aún no registraste comidas hoy"
                      description="Sumá tu primera comida con el botón + o el formulario de arriba. Cada registro te acerca a tu meta."
                    />
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {recentMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className="flex items-center justify-between rounded-2xl border border-sage-100 bg-white/80 px-4 py-3 text-sm shadow-soft dark:border-sage-800 dark:bg-sage-900/80"
                        >
                          <div>
                            <p className="font-medium">{meal.name}</p>
                            <p className="text-xs text-sage-500">
                              {meal.mealType} · {meal.time} · {meal.calories} kcal
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingMeal(meal)}
                              className="rounded-full border border-sage-200 px-2 py-1 text-xs text-sage-500 hover:bg-sage-100 dark:border-sage-700"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleReAdd(meal)}
                              className="rounded-full border border-sage-200 px-3 py-1 text-xs font-semibold text-sage-600 hover:bg-sage-100 dark:border-sage-700"
                            >
                              Re-registrar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Weekly Activity Summary */}
                <div className={`${cardBase} p-6`}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-coral-100 text-coral-600 dark:bg-coral-900 dark:text-coral-200">
                      📊
                    </span>
                    <h3 className="text-sm font-semibold text-sage-700 dark:text-sage-200">Resumen semanal de actividad</h3>
                  </div>
                  {weeklyActivity.count === 0 ? (
                    <p className="text-xs text-sage-500 dark:text-sage-400">Esta semana todavía no sumaste actividad. Registrá tu primer entrenamiento o caminata y acá vas a ver el resumen.</p>
                  ) : (
                    <div className="grid gap-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-sage-100/80 p-3 text-center dark:bg-sage-800/60">
                          <p className="text-lg font-bold text-sage-700 dark:text-sage-200">{weeklyActivity.daysActive}</p>
                          <p className="text-xs text-sage-500">días activo</p>
                        </div>
                        <div className="rounded-2xl bg-coral-100/80 p-3 text-center dark:bg-coral-900/40">
                          <p className="text-lg font-bold text-coral-700 dark:text-coral-200">{weeklyActivity.totalMinutes}</p>
                          <p className="text-xs text-sage-500">minutos</p>
                        </div>
                        <div className="rounded-2xl bg-soil-100/80 p-3 text-center dark:bg-soil-900/40">
                          <p className="text-lg font-bold text-soil-700 dark:text-soil-200">{weeklyActivity.strengthSessions}</p>
                          <p className="text-xs text-sage-500">fuerza</p>
                        </div>
                      </div>
                      {weeklyActivity.topCategories.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {weeklyActivity.topCategories.map(([cat, mins]) => (
                            <div key={cat} className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs shadow-soft dark:bg-sage-900/80">
                              <span className="font-medium text-sage-700 dark:text-sage-200">{cat}</span>
                              <span className="text-sage-400">{mins} min</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Weekly goals status */}
                      <div className="rounded-xl bg-white/60 p-2.5 dark:bg-sage-900/40">
                        <div className="grid gap-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-sage-500">Cardio/actividad moderada</span>
                            <span className={`font-semibold ${weeklyActivity.totalMinutes >= 150 ? 'text-sage-600' : 'text-coral-500'}`}>
                              {weeklyActivity.totalMinutes}/150 min
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-sage-200/60 dark:bg-sage-800">
                            <div className="h-1 rounded-full bg-sage-400 transition-all" style={{ width: `${Math.min(100, (weeklyActivity.totalMinutes / 150) * 100)}%` }} />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sage-500">Sesiones de fuerza</span>
                            <span className={`font-semibold ${weeklyActivity.strengthSessions >= 3 ? 'text-sage-600' : 'text-coral-500'}`}>
                              {weeklyActivity.strengthSessions}/3 sesiones
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-sage-200/60 dark:bg-sage-800">
                            <div className="h-1 rounded-full bg-coral-400 transition-all" style={{ width: `${Math.min(100, (weeklyActivity.strengthSessions / 3) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'asistente' && (
            <motion.section
              key="asistente"
              initial={{ opacity: 0, x: 24 * tabDirection }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 * tabDirection }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
            >
              <div className={`${cardBase} p-6`}>
                <h2 className="font-display text-xl font-semibold">
                  <SectionTitle icon={<IconSpark />} text="Asistente de comidas" />
                </h2>
                <p className="mt-1 text-xs text-sage-500">Te ayudo a decidir qué comer según tu plan, tus ingredientes o tus macros.</p>

                {/* Mode selector */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {([
                    { id: 'chat' as const, label: '💬 Preguntas', color: 'coral' },
                    { id: 'plan' as const, label: '📋 Mi plan', color: 'sage' },
                    { id: 'ingredients' as const, label: '🥕 Ingredientes', color: 'coral' },
                    { id: 'macros' as const, label: '📊 Macros', color: 'soil' }
                  ]).map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setAssistantMode(mode.id)}
                      className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                        assistantMode === mode.id
                          ? mode.color === 'sage' ? 'bg-sage-500 text-white'
                            : mode.color === 'coral' ? 'bg-coral-500 text-white'
                            : 'bg-soil-500 text-white'
                          : 'bg-sage-100 text-sage-600 dark:bg-sage-800 dark:text-sage-300'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                {/* Mode A: Plan suggestions */}
                {/* Mode: Chat / Preguntas */}
                {assistantMode === 'chat' && (
                  <div className="mt-4 flex flex-col gap-3">
                    <p className="text-xs text-sage-500">
                      Preguntá lo que quieras sobre comidas, nutrición, lista de super, recetas o tu plan.
                    </p>
                    <div className="flex flex-col gap-3 rounded-2xl border border-sage-200/60 bg-sage-50/50 p-3 dark:border-sage-700/60 dark:bg-sage-900/50 min-h-[200px] max-h-[320px] overflow-y-auto">
                      {chatMessages.length === 0 && (
                        <p className="text-center text-sm text-sage-500 py-4">
                          Escribí una pregunta y tocá Enviar. Ej: &quot;¿Qué comprar para la semana?&quot;, &quot;Ideas para cenar liviano&quot;
                        </p>
                      )}
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                              msg.role === 'user'
                                ? 'bg-coral-500 text-white'
                                : 'bg-white/90 text-sage-800 shadow-soft dark:bg-sage-800/90 dark:text-sage-100'
                            }`}
                          >
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                          </div>
                        </div>
                      ))}
                      {isLoadingChat && (
                        <div className="flex justify-start">
                          <div className="rounded-2xl bg-white/90 px-4 py-2.5 text-sm text-sage-600 dark:bg-sage-800/90 dark:text-sage-300">
                            <span className="flex items-center gap-2">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
                              Pensando...
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                        placeholder="Ej: Lista de super para la semana"
                        className="flex-1 min-w-0 rounded-2xl border border-sage-200 bg-white/80 px-4 py-2.5 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                      <button
                        type="button"
                        onClick={handleChatSend}
                        disabled={!chatInput.trim() || isLoadingChat}
                        className="shrink-0 rounded-2xl bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-coral-600 disabled:bg-sage-300 disabled:cursor-not-allowed dark:disabled:bg-sage-700"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}

                {assistantMode === 'plan' && (() => {
                  const todayPlan = getTodayMealPlan()
                  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
                  const todayName = dayNames[new Date().getDay()]
                  return (
                    <div className="mt-4 grid gap-4">
                      <div className="flex items-center gap-2 rounded-2xl bg-sage-100/70 px-4 py-3 dark:bg-sage-900/70">
                        <span className="text-sm font-semibold text-sage-700 dark:text-sage-200">
                          Menú sugerido para {todayName}
                        </span>
                      </div>
                      {todayPlan.meals.map((meal, idx) => {
                        const schedule = state.fastingProtocol.mealSchedule.find(s => s.meal === meal.type)
                        return (
                          <div key={idx} className="rounded-2xl border border-sage-200/60 bg-white/60 p-4 dark:border-sage-700/60 dark:bg-sage-900/60">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${mealTypeStyles[meal.type]}`}>
                                {meal.type}
                              </span>
                              {schedule && <span className="text-xs text-sage-500">{schedule.time}</span>}
                            </div>
                            <div className="mt-2 grid gap-2">
                              {meal.options.map((option, oidx) => {
                                const food = baseFoods.find(f => f.name.toLowerCase() === option.toLowerCase())
                                return (
                                  <div
                                    key={oidx}
                                    className="flex items-center justify-between rounded-xl bg-sage-50/80 px-3 py-2 dark:bg-sage-800/60"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-sage-800 dark:text-sage-100">{option}</p>
                                      {food && (
                                        <p className="text-xs text-sage-500">
                                          {food.calories} kcal · P: {food.protein}g · C: {food.carbs}g · G: {food.fat}g
                                        </p>
                                      )}
                                    </div>
                                    {food && (
                                      <button
                                        onClick={() => {
                                          const entry = buildMealEntry(food.name, meal.type, 2, state.customFoods)
                                          setState(prev => ({ ...prev, meals: [entry, ...prev.meals] }))
                                          setToast({ id: randomId(), message: `¡${food.name} registrado!` })
                                        }}
                                        className="rounded-full bg-sage-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sage-600"
                                      >
                                        Registrar
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Mode B: Ingredient-based */}
                {assistantMode === 'ingredients' && (
                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-xs text-sage-500">¿Qué tenés en la heladera?</label>
                      <textarea
                        value={ingredientsInput}
                        onChange={(e) => setIngredientsInput(e.target.value)}
                        placeholder="Ej: pollo, tomate, arroz, brócoli, queso"
                        rows={3}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <button
                      onClick={handleAssistantQuery}
                      disabled={isLoadingAssistant || !ingredientsInput.trim()}
                      className={`rounded-2xl px-6 py-3 text-sm font-semibold shadow-soft transition ${
                        ingredientsInput.trim() && !isLoadingAssistant
                          ? 'bg-coral-500 text-white hover:bg-coral-600'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isLoadingAssistant ? 'Pensando...' : '¿Qué puedo cocinar?'}
                    </button>
                    {!state.openaiApiKey && (
                      <p className="text-xs text-sage-400">
                        Sin API Key se buscan coincidencias locales. Configurá OpenAI en Registro {'>'} IA para sugerencias inteligentes.
                      </p>
                    )}
                    {isLoadingAssistant && (
                      <div className="flex items-center justify-center gap-2 rounded-2xl border border-sage-200 bg-sage-50/80 p-6 dark:border-sage-700 dark:bg-sage-900/80">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-coral-500 border-t-transparent"></div>
                        <span className="text-sm text-sage-600 dark:text-sage-300">Buscando recetas...</span>
                      </div>
                    )}
                    {assistantResult && !isLoadingAssistant && (
                      <div className="rounded-2xl border border-sage-200 bg-sage-50/80 p-4 dark:border-sage-700 dark:bg-sage-900/80">
                        <p className="text-sm font-semibold text-sage-700 dark:text-sage-200 mb-2">Sugerencias</p>
                        <div className="whitespace-pre-wrap text-sm text-sage-700 dark:text-sage-300">
                          {assistantResult}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode C: Complete macros */}
                {assistantMode === 'macros' && (
                  <div className="mt-4 grid gap-4">
                    <div className="rounded-2xl bg-sage-100/70 p-4 dark:bg-sage-900/70">
                      <p className="text-sm font-semibold text-sage-700 dark:text-sage-200 mb-3">Te falta para hoy</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-xl bg-white/80 p-2 dark:bg-sage-800/80">
                          <p className="text-lg font-bold text-coral-600">{macroDeficit.calories}</p>
                          <p className="text-xs text-sage-500">kcal</p>
                        </div>
                        <div className="rounded-xl bg-white/80 p-2 dark:bg-sage-800/80">
                          <p className="text-lg font-bold text-sage-600">{macroDeficit.protein}g</p>
                          <p className="text-xs text-sage-500">Proteína</p>
                        </div>
                        <div className="rounded-xl bg-white/80 p-2 dark:bg-sage-800/80">
                          <p className="text-lg font-bold text-soil-600">{macroDeficit.carbs}g</p>
                          <p className="text-xs text-sage-500">Carbos</p>
                        </div>
                        <div className="rounded-xl bg-white/80 p-2 dark:bg-sage-800/80">
                          <p className="text-lg font-bold text-coral-500">{macroDeficit.fat}g</p>
                          <p className="text-xs text-sage-500">Grasas</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-sage-500">
                      Sugerencias para completar tus macros restantes:
                    </p>
                    <div className="grid gap-3">
                      {getMacroSuggestions().map((food) => (
                        <div
                          key={food.id}
                          className="flex items-center justify-between rounded-2xl border border-sage-100 bg-white/80 px-4 py-3 text-sm shadow-soft dark:border-sage-800 dark:bg-sage-900/80"
                        >
                          <div>
                            <p className="font-medium text-sage-800 dark:text-sage-100">{food.name}</p>
                            <p className="text-xs text-sage-500">
                              {food.calories} kcal · P: {food.protein}g · C: {food.carbs}g · G: {food.fat}g
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {food.tags.map((tag, i) => (
                                <span key={i} className="rounded-full bg-sage-100 px-2 py-0.5 text-xs text-sage-600 dark:bg-sage-800 dark:text-sage-300">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const entry = buildMealEntry(food.name, food.mealType, 2, state.customFoods)
                              setState(prev => ({ ...prev, meals: [entry, ...prev.meals] }))
                              setToast({ id: randomId(), message: `¡${food.name} registrado!` })
                            }}
                            className="rounded-full bg-coral-500 px-3 py-1 text-xs font-semibold text-white hover:bg-coral-600"
                          >
                            Registrar
                          </button>
                        </div>
                      ))}
                      {getMacroSuggestions().length === 0 && (
                        <div className="text-center text-sm text-sage-500 py-4">
                          ¡Ya cumpliste tus objetivos del día! 🎉
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: fasting info + quick tips */}
              <div className="flex flex-col gap-6">
                <div className={`${cardBase} p-6`}>
                  <h3 className="font-display text-lg font-semibold">
                    <SectionTitle icon={<IconClock />} text="Protocolo IF 16:8" />
                  </h3>
                  <div className="mt-4 grid gap-3">
                    <div className="flex items-center gap-3 rounded-2xl bg-sage-100/70 px-4 py-3 dark:bg-sage-900/70">
                      <span className="text-lg">{fastingTime.isFasting ? '🔒' : '🍽️'}</span>
                      <div>
                        <p className="text-sm font-semibold text-sage-700 dark:text-sage-200">{fastingTime.label}</p>
                        <p className="text-xs text-sage-500">{fastingTime.timeLeft}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {state.fastingProtocol.mealSchedule.map((m, idx) => (
                        <div key={idx} className="rounded-xl bg-white/70 px-2 py-2 shadow-soft dark:bg-sage-800/70">
                          <p className="font-semibold text-sage-700 dark:text-sage-200">{m.meal}</p>
                          <p className="text-sage-500">{m.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-sage-600 dark:text-sage-300 mb-2">Permitido en ayuno:</p>
                    <div className="flex flex-wrap gap-1">
                      {state.fastingProtocol.fastingAllowedFoods.map((food, idx) => (
                        <span key={idx} className="rounded-full bg-sage-100 px-2 py-1 text-xs text-sage-600 dark:bg-sage-800 dark:text-sage-300">
                          {food}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`${cardBase} p-6`}>
                  <h3 className="font-display text-lg font-semibold">
                    <SectionTitle icon={<IconTarget />} text="Progreso del día" />
                  </h3>
                  <div className="mt-3 grid gap-2">
                    {[
                      { label: 'Calorías', current: dailyTotals.calories, target: state.goals.caloriesTarget, unit: 'kcal' },
                      { label: 'Proteínas', current: dailyTotals.protein, target: state.goals.proteinTarget, unit: 'g' },
                      { label: 'Carbos', current: dailyTotals.carbs, target: state.goals.carbsTarget, unit: 'g' },
                      { label: 'Grasas', current: dailyTotals.fat, target: state.goals.fatTarget, unit: 'g' }
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs text-sage-600 dark:text-sage-300">
                          <span>{item.label}</span>
                          <span>{item.current}/{item.target} {item.unit}</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-sage-200/60 dark:bg-sage-800">
                          <div
                            className={`h-2 rounded-full transition-all ${getCompletionColor(item.current / item.target)}`}
                            style={{ width: `${Math.min(100, (item.current / item.target) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'progreso' && (
            <div className="-mx-3 flex gap-2 overflow-x-auto border-b border-sage-200/60 px-3 py-2 dark:border-sage-700/60 sm:mx-0 sm:px-0">
              {progresoSubTabs.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveProgresoSubTab(sub.id as 'peso' | 'composicion' | 'analisis')}
                  className={`min-h-[40px] shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeProgresoSubTab === sub.id
                      ? 'bg-sage-500 text-white'
                      : 'bg-sage-100 text-sage-600 dark:bg-sage-800 dark:text-sage-300'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'progreso' && activeProgresoSubTab === 'peso' && (
            <motion.section
              key="peso"
              initial={{ opacity: 0, x: 24 * tabDirection }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 * tabDirection }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]"
            >
              <div className={`${cardBase} p-6`}>
                <h2 className="font-display text-xl font-semibold">
                  <SectionTitle icon={<IconScale />} text="Evolución de peso" />
                </h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e8e3" />
                      <XAxis dataKey="date" stroke="#6c8a75" fontSize={12} />
                      <YAxis stroke="#6c8a75" domain={['dataMin - 2', 'dataMax + 2']} fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="peso" stroke="#5c8a6b" strokeWidth={2} dot={{ fill: '#5c8a6b' }} name="Peso (kg)" />
                      <Line type="monotone" dataKey="objetivo" stroke="#ff6a3a" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Objetivo" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {weightProgress && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-sage-100/70 p-3 text-center dark:bg-sage-900/70">
                      <p className="text-xs text-sage-500">Inicio</p>
                      <p className="font-semibold">{weightProgress.start.toFixed(1)} kg</p>
                    </div>
                    <div className="rounded-2xl bg-sage-100/70 p-3 text-center dark:bg-sage-900/70">
                      <p className="text-xs text-sage-500">Actual</p>
                      <p className="font-semibold">{weightProgress.current.toFixed(1)} kg</p>
                    </div>
                    <div className="rounded-2xl bg-sage-100/70 p-3 text-center dark:bg-sage-900/70">
                      <p className="text-xs text-sage-500">Cambio total</p>
                      <p className={`font-semibold ${weightProgress.change < 0 ? 'text-sage-600' : 'text-coral-600'}`}>
                        {weightProgress.change > 0 ? '+' : ''}{weightProgress.change.toFixed(1)} kg
                      </p>
                    </div>
                    <div className="rounded-2xl bg-sage-100/70 p-3 text-center dark:bg-sage-900/70">
                      <p className="text-xs text-sage-500">Ritmo semanal</p>
                      <p className="font-semibold">{weightProgress.weeklyRate.toFixed(2)} kg/sem</p>
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-sage-700 dark:text-sage-200">Historial de registros</h3>
                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                    {state.weightHistory
                      .slice()
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 10)
                      .map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-2 text-sm shadow-soft dark:bg-sage-900/80">
                          <div>
                            <span className="font-medium">{entry.weight.toFixed(1)} kg</span>
                            <span className="ml-2 text-xs text-sage-500 capitalize">{formatDateDisplay(entry.date)}</span>
                            {entry.note && <span className="ml-2 text-xs text-sage-400">· {entry.note}</span>}
                          </div>
                          <button
                            onClick={() => handleDeleteWeight(entry.id)}
                            className="text-xs text-coral-500 hover:text-coral-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              <div className={`${cardBase} p-6`}>
                <h3 className="font-display text-lg font-semibold">
                  <SectionTitle icon={<IconScale />} text="Registrar peso" />
                </h3>
                <div className="mt-4 grid gap-4">
                  <div>
                    <label className="text-xs text-sage-500">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="30"
                      max="300"
                      value={weightForm.weight || ''}
                      onChange={(e) => setWeightForm((prev) => ({ ...prev, weight: Number(e.target.value) }))}
                      placeholder="Ej: 75.5"
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Nota (opcional)</label>
                    <input
                      value={weightForm.note}
                      onChange={(e) => setWeightForm((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder="Ej: Después de entrenar"
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                    />
                  </div>
                  <button
                    onClick={handleAddWeight}
                    className="rounded-2xl bg-sage-500 px-6 py-3 text-sm font-semibold text-white shadow-soft hover:bg-sage-600"
                  >
                    Registrar peso
                  </button>
                </div>
                <div className="mt-6 rounded-2xl bg-sage-100/70 p-4 dark:bg-sage-900/70">
                  <h4 className="text-sm font-semibold text-sage-700 dark:text-sage-200">Objetivo</h4>
                  <p className="mt-1 text-2xl font-bold text-sage-600 dark:text-sage-300">{state.profile.goalWeight} kg</p>
                  <p className="mt-1 text-xs text-sage-500">
                    {state.profile.weight > state.profile.goalWeight
                      ? `Te faltan ${(state.profile.weight - state.profile.goalWeight).toFixed(1)} kg para tu objetivo`
                      : state.profile.weight < state.profile.goalWeight
                        ? `Te faltan ${(state.profile.goalWeight - state.profile.weight).toFixed(1)} kg para tu objetivo`
                        : '¡Has alcanzado tu objetivo!'}
                  </p>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'progreso' && activeProgresoSubTab === 'composicion' && (
            <motion.section
              key="composicion"
              initial={{ opacity: 0, x: 24 * tabDirection }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 * tabDirection }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
            >
              <div className={`${cardBase} p-6`}>
                <h2 className="font-display text-xl font-semibold">
                  <SectionTitle icon={<IconBody />} text="Composición corporal" />
                </h2>
                {bodyCompChartData.length > 1 && (
                  <div className="mt-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bodyCompChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e8e3" />
                        <XAxis dataKey="date" stroke="#6c8a75" fontSize={12} />
                        <YAxis stroke="#6c8a75" fontSize={12} />
                        <Tooltip />
                        <Line type="monotone" dataKey="grasa" stroke="#ff6a3a" strokeWidth={2} dot={{ fill: '#ff6a3a' }} name="Grasa %" />
                        <Line type="monotone" dataKey="musculo" stroke="#5c8a6b" strokeWidth={2} dot={{ fill: '#5c8a6b' }} name="Músculo kg" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-sage-700 dark:text-sage-200">Historial de mediciones</h3>
                  <div className="mt-2 max-h-64 space-y-3 overflow-y-auto">
                    {state.bodyComposition.length === 0 ? (
                      <EmptyState emoji="📏" title="Sin mediciones de composición" description="Cuando registres tu primera medición, vas a poder ver evolución de grasa, músculo y más." />
                    ) : (
                      state.bodyComposition
                        .slice()
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((entry) => (
                          <div key={entry.id} className="rounded-2xl bg-white/80 p-4 shadow-soft dark:bg-sage-900/80">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-sage-700 dark:text-sage-200 capitalize">{formatDateDisplay(entry.date)}</span>
                              <button
                                onClick={() => handleDeleteBodyComp(entry.id)}
                                className="text-xs text-coral-500 hover:text-coral-700"
                              >
                                Eliminar
                              </button>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                              {entry.fatPercentage !== null && (
                                <div className="rounded-xl bg-coral-100/70 px-2 py-1 text-coral-700">
                                  Grasa: {entry.fatPercentage}%
                                </div>
                              )}
                              {entry.muscleMass !== null && (
                                <div className="rounded-xl bg-sage-100/70 px-2 py-1 text-sage-700">
                                  Músculo: {entry.muscleMass} kg
                                </div>
                              )}
                              {entry.waterPercentage !== null && (
                                <div className="rounded-xl bg-blue-100/70 px-2 py-1 text-blue-700">
                                  Agua: {entry.waterPercentage}%
                                </div>
                              )}
                              {entry.visceralFat !== null && (
                                <div className="rounded-xl bg-soil-100/70 px-2 py-1 text-soil-700">
                                  Visc.: {entry.visceralFat}
                                </div>
                              )}
                              {entry.boneMass !== null && (
                                <div className="rounded-xl bg-gray-100/70 px-2 py-1 text-gray-700">
                                  Hueso: {entry.boneMass} kg
                                </div>
                              )}
                              {entry.metabolicAge !== null && (
                                <div className="rounded-xl bg-purple-100/70 px-2 py-1 text-purple-700">
                                  Edad met.: {entry.metabolicAge}
                                </div>
                              )}
                            </div>
                            {entry.note && <p className="mt-2 text-xs text-sage-500">{entry.note}</p>}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
              <div className={`${cardBase} p-6`}>
                <h3 className="font-display text-lg font-semibold">
                  <SectionTitle icon={<IconBody />} text="Nueva medición" />
                </h3>
                <div className="mt-4 grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-sage-500">% Grasa corporal</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bodyCompForm.fatPercentage}
                        onChange={(e) => setBodyCompForm((prev) => ({ ...prev, fatPercentage: e.target.value }))}
                        placeholder="Ej: 18.5"
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Masa muscular (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bodyCompForm.muscleMass}
                        onChange={(e) => setBodyCompForm((prev) => ({ ...prev, muscleMass: e.target.value }))}
                        placeholder="Ej: 35.2"
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-sage-500">% Agua corporal</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bodyCompForm.waterPercentage}
                        onChange={(e) => setBodyCompForm((prev) => ({ ...prev, waterPercentage: e.target.value }))}
                        placeholder="Ej: 55"
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Grasa visceral</label>
                      <input
                        type="number"
                        step="1"
                        value={bodyCompForm.visceralFat}
                        onChange={(e) => setBodyCompForm((prev) => ({ ...prev, visceralFat: e.target.value }))}
                        placeholder="Ej: 8"
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-sage-500">Masa ósea (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bodyCompForm.boneMass}
                        onChange={(e) => setBodyCompForm((prev) => ({ ...prev, boneMass: e.target.value }))}
                        placeholder="Ej: 3.2"
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Edad metabólica</label>
                      <input
                        type="number"
                        step="1"
                        value={bodyCompForm.metabolicAge}
                        onChange={(e) => setBodyCompForm((prev) => ({ ...prev, metabolicAge: e.target.value }))}
                        placeholder="Ej: 28"
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Nota (opcional)</label>
                    <input
                      value={bodyCompForm.note}
                      onChange={(e) => setBodyCompForm((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder="Ej: Medición en gimnasio"
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                    />
                  </div>
                  <button
                    onClick={handleAddBodyComp}
                    className="mt-2 rounded-2xl bg-coral-500 px-6 py-3 text-sm font-semibold text-white shadow-soft hover:bg-coral-600"
                  >
                    Guardar medición
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'progreso' && activeProgresoSubTab === 'analisis' && (
            <motion.section
              key="analisis"
              initial={{ opacity: 0, x: 24 * tabDirection }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 * tabDirection }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
            >
              <div className={`${cardBase} p-6`}>
                <h2 className="font-display text-xl font-semibold">
                  <SectionTitle icon={<IconSpark />} text="Composición nutricional" />
                </h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={macrosChart} innerRadius={50} outerRadius={80} dataKey="value">
                        {macrosChart.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={`${cardBase} p-6`}>
                <h3 className="font-display text-lg font-semibold">
                  <SectionTitle icon={<IconChart />} text="Comparativa semanal" />
                </h3>
                <div className="mt-4 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e8e3" />
                      <XAxis dataKey="date" stroke="#6c8a75" />
                      <YAxis stroke="#6c8a75" />
                      <Tooltip />
                      <Bar dataKey="protein" fill="#5c8a6b" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="carbs" fill="#b07f4c" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'biblioteca' && (
            <motion.section
              key="biblioteca"
              initial={{ opacity: 0, x: 24 * tabDirection }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 * tabDirection }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
            >
              <div className={`${cardBase} p-6`}>
                <h2 className="font-display text-xl font-semibold">
                  <SectionTitle icon={<IconBook />} text="Biblioteca de alimentos" />
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Buscar alimento..."
                    className="flex-1 rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                  />
                  <select
                    value={libraryCategory}
                    onChange={(e) => setLibraryCategory(e.target.value as FoodCategory | 'Todas')}
                    className="rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                  >
                    <option value="Todas">Todas las categorías</option>
                    <option value="Frutas">Frutas</option>
                    <option value="Verduras">Verduras</option>
                    <option value="Proteínas">Proteínas</option>
                    <option value="Granos">Granos</option>
                    <option value="Lácteos">Lácteos</option>
                    <option value="Grasas saludables">Grasas saludables</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(libraryExpanded ? libraryFoods : libraryFoods.slice(0, 15)).map((food) => (
                    <div
                      key={food.id}
                      className="rounded-2xl border border-sage-100 bg-white/80 p-4 shadow-soft dark:border-sage-800 dark:bg-sage-900/80"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sage-800 dark:text-sage-100">{food.name}</p>
                          <p className="text-xs text-sage-500">{food.category}</p>
                        </div>
                        <span className="rounded-full bg-coral-100 px-2 py-1 text-xs font-semibold text-coral-700">
                          {food.calories} kcal
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                        <div className="rounded-lg bg-sage-100/70 px-2 py-1 text-center dark:bg-sage-800/70">
                          <span className="text-sage-500">P</span>
                          <span className="ml-1 font-medium">{food.protein}g</span>
                        </div>
                        <div className="rounded-lg bg-soil-100/70 px-2 py-1 text-center dark:bg-soil-800/70">
                          <span className="text-soil-500">C</span>
                          <span className="ml-1 font-medium">{food.carbs}g</span>
                        </div>
                        <div className="rounded-lg bg-coral-100/70 px-2 py-1 text-center dark:bg-coral-800/70">
                          <span className="text-coral-500">G</span>
                          <span className="ml-1 font-medium">{food.fat}g</span>
                        </div>
                        <div className="rounded-lg bg-green-100/70 px-2 py-1 text-center dark:bg-green-800/70">
                          <span className="text-green-500">F</span>
                          <span className="ml-1 font-medium">{food.fiber}g</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {libraryFoods.length > 15 && (
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setLibraryExpanded((e) => !e)}
                      className="rounded-full border border-sage-200 bg-white/80 px-4 py-2 text-sm font-medium text-sage-600 shadow-soft hover:bg-sage-100 dark:border-sage-700 dark:bg-sage-900/80 dark:text-sage-300 dark:hover:bg-sage-800"
                    >
                      {libraryExpanded ? 'Ver menos' : `Ver más (${libraryFoods.length - 15} más)`}
                    </button>
                  </div>
                )}
                {libraryFoods.length === 0 && (
                  <EmptyState emoji="🔍" title="Ningún alimento coincide" description="Probá con otras palabras o agregá uno nuevo desde Biblioteca. Tu base crece con vos." />
                )}
              </div>
              <div className={`${cardBase} p-6`}>
                <h3 className="font-display text-lg font-semibold">
                  <SectionTitle icon={<IconSpark />} text="Crear alimento" />
                </h3>
                <div className="mt-4 grid gap-3">
                  <div>
                    <label className="text-xs text-sage-500">Nombre del alimento</label>
                    <input
                      value={customFood.name}
                      onChange={(e) => setCustomFood((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Pollo a la plancha"
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Categoría</label>
                    <select
                      value={customFood.category}
                      onChange={(e) => setCustomFood((prev) => ({ ...prev, category: e.target.value as FoodCategory }))}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                    >
                      <option value="Frutas">Frutas</option>
                      <option value="Verduras">Verduras</option>
                      <option value="Proteínas">Proteínas</option>
                      <option value="Granos">Granos</option>
                      <option value="Lácteos">Lácteos</option>
                      <option value="Grasas saludables">Grasas saludables</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-sage-500">Calorías (kcal)</label>
                      <input
                        type="number"
                        value={customFood.calories}
                        onChange={(e) => setCustomFood((prev) => ({ ...prev, calories: Number(e.target.value) }))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Proteínas (g)</label>
                      <input
                        type="number"
                        value={customFood.protein}
                        onChange={(e) => setCustomFood((prev) => ({ ...prev, protein: Number(e.target.value) }))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-sage-500">Carbohidratos (g)</label>
                      <input
                        type="number"
                        value={customFood.carbs}
                        onChange={(e) => setCustomFood((prev) => ({ ...prev, carbs: Number(e.target.value) }))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Grasas (g)</label>
                      <input
                        type="number"
                        value={customFood.fat}
                        onChange={(e) => setCustomFood((prev) => ({ ...prev, fat: Number(e.target.value) }))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Fibra (g)</label>
                    <input
                      type="number"
                      value={customFood.fiber}
                      onChange={(e) => setCustomFood((prev) => ({ ...prev, fiber: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                    />
                  </div>
                  <button
                    onClick={handleAddCustomFood}
                    className="mt-2 rounded-2xl bg-sage-500 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-sage-600"
                  >
                    Guardar alimento
                  </button>
                </div>
                {state.customFoods.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-sage-700 dark:text-sage-200">Mis alimentos ({state.customFoods.length})</h4>
                    <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                      {state.customFoods.map((food) => (
                        <div key={food.id} className="flex items-center justify-between rounded-xl bg-sage-100/70 px-3 py-2 text-xs dark:bg-sage-800/70">
                          <span>{food.name}</span>
                          <span className="text-sage-500">{food.calories} kcal</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guías de la nutricionista */}
                <div className="mt-6 rounded-2xl border border-sage-200/60 bg-sage-50/80 p-4 dark:border-sage-700/60 dark:bg-sage-900/60">
                  <h4 className="text-sm font-semibold text-sage-700 dark:text-sage-200 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage-100 text-xs dark:bg-sage-800">📋</span>
                    Guías de mi nutricionista
                  </h4>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-sage-600 dark:text-sage-300">Alimentos recomendados</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {nutritionistGuidelines.recommended.map((item, idx) => (
                        <span key={idx} className="rounded-full bg-sage-100 px-2 py-0.5 text-xs text-sage-600 dark:bg-sage-800 dark:text-sage-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-coral-600 dark:text-coral-400">Evitar</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {nutritionistGuidelines.avoid.map((item, idx) => (
                        <span key={idx} className="rounded-full bg-coral-100/70 px-2 py-0.5 text-xs text-coral-600 dark:bg-coral-900/40 dark:text-coral-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white/70 px-3 py-2 dark:bg-sage-800/60">
                      <p className="font-semibold text-sage-600 dark:text-sage-300">💧 Hidratación</p>
                      <p className="text-sage-500">{nutritionistGuidelines.hydration}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 px-3 py-2 dark:bg-sage-800/60">
                      <p className="font-semibold text-sage-600 dark:text-sage-300">🏃 Ejercicio</p>
                      <p className="text-sage-500">{nutritionistGuidelines.exercise}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-sage-600 dark:text-sage-300">Permitido en ayuno IF</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {defaultFastingProtocol.fastingAllowedFoods.map((item, idx) => (
                        <span key={idx} className="rounded-full bg-sage-200/70 px-2 py-0.5 text-xs text-sage-700 dark:bg-sage-700/70 dark:text-sage-200">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'metas' && (
            <motion.section
              key="metas"
              initial={{ opacity: 0, x: 24 * tabDirection }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 * tabDirection }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 lg:grid-cols-2"
            >
              <div className={`${cardBase} p-6`}>
                <h2 className="font-display text-xl font-semibold">
                  <SectionTitle icon={<IconUser />} text="Mi perfil" />
                </h2>
                <div className="mt-4 grid gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-sage-500">Nombre</label>
                      <input
                        value={state.profile.name}
                        onChange={(e) => handleUpdateProfile('name', e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Sexo</label>
                      <select
                        value={state.profile.sex}
                        onChange={(e) => handleUpdateProfile('sex', e.target.value as Profile['sex'])}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-sage-500">Edad</label>
                      <input
                        type="number"
                        value={state.profile.age}
                        onChange={(e) => handleUpdateProfile('age', Number(e.target.value))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Altura (cm)</label>
                      <input
                        type="number"
                        value={state.profile.height}
                        onChange={(e) => handleUpdateProfile('height', Number(e.target.value))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Peso actual (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={state.profile.weight}
                        onChange={(e) => handleUpdateProfile('weight', Number(e.target.value))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-sage-500">Peso objetivo (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={state.profile.goalWeight}
                        onChange={(e) => handleUpdateProfile('goalWeight', Number(e.target.value))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Nivel de actividad</label>
                      <select
                        value={state.profile.activity}
                        onChange={(e) => handleUpdateProfile('activity', e.target.value as Profile['activity'])}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      >
                        <option value="Baja">Baja (sedentario)</option>
                        <option value="Moderada">Moderada (ejercicio 3-4x/sem)</option>
                        <option value="Alta">Alta (ejercicio 5-6x/sem)</option>
                        <option value="Muy alta">Muy alta (atleta)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl bg-sage-100/70 p-4 dark:bg-sage-900/70">
                  <p className="text-sm font-semibold text-sage-700 dark:text-sage-200">TDEE estimado</p>
                  <p className="text-3xl font-bold text-sage-600 dark:text-sage-300">{tdeeValue} kcal/día</p>
                  <p className="mt-1 text-xs text-sage-500">Gasto energético total diario basado en tu perfil</p>
                </div>
              </div>
              <div className={`${cardBase} p-6`}>
                <h2 className="font-display text-xl font-semibold">
                  <SectionTitle icon={<IconTarget />} text="Objetivos nutricionales" />
                </h2>
                <div className="mt-4 grid gap-4">
                  <div>
                    <label className="text-xs text-sage-500">Modo de objetivo</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(['Mantenimiento', 'Pérdida', 'Ganancia'] as Goals['mode'][]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => handleUpdateGoals('mode', mode)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            state.goals.mode === mode
                              ? 'bg-sage-500 text-white'
                              : 'bg-sage-100 text-sage-600 hover:bg-sage-200 dark:bg-sage-800 dark:text-sage-300'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAutoGoals}
                    className="rounded-2xl bg-coral-500 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-coral-600"
                  >
                    Calcular objetivos automáticamente
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-sage-500">Calorías diarias</label>
                      <input
                        type="number"
                        value={state.goals.caloriesTarget}
                        onChange={(e) => handleUpdateGoals('caloriesTarget', Number(e.target.value))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Proteínas (g)</label>
                      <input
                        type="number"
                        value={state.goals.proteinTarget}
                        onChange={(e) => handleUpdateGoals('proteinTarget', Number(e.target.value))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-sage-500">Carbohidratos (g)</label>
                      <input
                        type="number"
                        value={state.goals.carbsTarget}
                        onChange={(e) => handleUpdateGoals('carbsTarget', Number(e.target.value))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sage-500">Grasas (g)</label>
                      <input
                        type="number"
                        value={state.goals.fatTarget}
                        onChange={(e) => handleUpdateGoals('fatTarget', Number(e.target.value))}
                        className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-sage-700 dark:text-sage-200">Resumen semanal</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-sage-100/70 p-3 text-center dark:bg-sage-900/70">
                      <p className="text-xs text-sage-500">Promedio calorías</p>
                      <p className="text-lg font-bold text-sage-700 dark:text-sage-200">{weeklyStats.avgCalories}</p>
                    </div>
                    <div className="rounded-2xl bg-sage-100/70 p-3 text-center dark:bg-sage-900/70">
                      <p className="text-xs text-sage-500">Días en objetivo</p>
                      <p className="text-lg font-bold text-sage-700 dark:text-sage-200">{weeklyStats.daysOnTarget}/7</p>
                    </div>
                    <div className="rounded-2xl bg-sage-100/70 p-3 text-center dark:bg-sage-900/70">
                      <p className="text-xs text-sage-500">Prom. proteínas</p>
                      <p className="text-lg font-bold text-sage-700 dark:text-sage-200">{weeklyStats.avgProtein}g</p>
                    </div>
                    <div className="rounded-2xl bg-sage-100/70 p-3 text-center dark:bg-sage-900/70">
                      <p className="text-xs text-sage-500">Prom. carbos</p>
                      <p className="text-lg font-bold text-sage-700 dark:text-sage-200">{weeklyStats.avgCarbs}g</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'historial' && (
            <motion.section
              key="historial"
              initial={{ opacity: 0, x: 24 * tabDirection }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 * tabDirection }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 lg:grid-cols-[1fr_1fr]"
            >
              <div className={`${cardBase} p-6`}>
                <h2 className="font-display text-xl font-semibold">
                  <SectionTitle icon={<IconCalendar />} text="Calendario" />
                </h2>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="rounded-full bg-sage-100 px-3 py-1 text-sm font-semibold text-sage-600 hover:bg-sage-200 dark:bg-sage-800 dark:text-sage-300"
                  >
                    ←
                  </button>
                  <span className="font-semibold text-sage-700 dark:text-sage-200">
                    {calendarMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="rounded-full bg-sage-100 px-3 py-1 text-sm font-semibold text-sage-600 hover:bg-sage-200 dark:bg-sage-800 dark:text-sage-300"
                  >
                    →
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                    <div key={day} className="py-2 font-semibold text-sage-500">{day}</div>
                  ))}
                  {calendarDays.map((day, index) => {
                    const dateKey = day.date ? formatDateKey(day.date) : ''
                    const hasMeals = dateKey && mealsByDate[dateKey]?.length > 0
                    const isToday = dateKey === todayKey
                    const isSelected = day.date && formatDateKey(day.date) === formatDateKey(selectedDate)
                    return (
                      <button
                        key={index}
                        onClick={() => day.date && setSelectedDate(day.date)}
                        disabled={!day.date}
                        className={`relative rounded-xl py-2 text-sm transition ${
                          !day.date
                            ? 'text-sage-300 dark:text-sage-700'
                            : isSelected
                              ? 'bg-sage-500 text-white'
                              : isToday
                                ? 'bg-coral-100 text-coral-700 dark:bg-coral-900 dark:text-coral-200'
                                : 'hover:bg-sage-100 dark:hover:bg-sage-800'
                        }`}
                      >
                        {day.label}
                        {hasMeals && !isSelected && (
                          <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sage-400"></span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 rounded-2xl bg-sage-100/70 p-4 dark:bg-sage-900/70">
                  <p className="text-sm font-semibold text-sage-700 dark:text-sage-200">
                    {selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(['Todas', ...mealTypes] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setHistoryMealFilter(type === 'Todas' ? 'Todas' : type)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          (type === 'Todas' && historyMealFilter === 'Todas') || historyMealFilter === type
                            ? 'bg-sage-500 text-white'
                            : 'bg-white/80 text-sage-600 hover:bg-sage-200 dark:bg-sage-800 dark:text-sage-300'
                        }`}
                      >
                        {type === 'Todas' ? 'Todos' : type}
                      </button>
                    ))}
                  </div>
                  {filteredSelectedDateMeals.length === 0 ? (
                    <p className="mt-2 text-xs text-sage-500 dark:text-sage-400">
                      {selectedDateMeals.length === 0
                        ? 'Nada registrado este día. Los días que registres comidas van a aparecer acá.'
                        : `No hay comidas de tipo "${historyMealFilter}" este día.`}
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {filteredSelectedDateMeals.map((meal) => (
                        <div key={meal.id} className="flex items-center justify-between text-xs">
                          <span>{meal.time} - {meal.name}</span>
                          <span className="text-sage-500">{meal.calories} kcal</span>
                        </div>
                      ))}
                      <div className="mt-2 border-t border-sage-200 pt-2 dark:border-sage-700">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{historyMealFilter === 'Todas' ? 'Total del día' : `Total (${historyMealFilter})`}</span>
                          <span>{filteredSelectedDateTotals.calories} kcal</span>
                        </div>
                        <div className="mt-1 flex gap-2 text-xs text-sage-500">
                          <span>P: {filteredSelectedDateTotals.protein}g</span>
                          <span>C: {filteredSelectedDateTotals.carbs}g</span>
                          <span>G: {filteredSelectedDateTotals.fat}g</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-6">
                <div className={`${cardBase} p-6`}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-semibold">
                      <SectionTitle icon={<IconChart />} text="Evolución calorías" />
                    </h2>
                  </div>
                  <div className="mt-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e8e3" />
                        <XAxis dataKey="date" stroke="#6c8a75" fontSize={10} />
                        <YAxis stroke="#6c8a75" fontSize={10} />
                        <Tooltip />
                        <Line type="monotone" dataKey="calories" stroke="#ff6a3a" strokeWidth={2} dot={{ fill: '#ff6a3a' }} name="Calorías" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className={`${cardBase} p-6`}>
                  <h3 className="font-display text-lg font-semibold">
                    <SectionTitle icon={<IconNote />} text="Últimos registros" />
                  </h3>
                  <div className="mt-2">
                    <input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Buscar comida..."
                      className="w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                    />
                  </div>
                  <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                    {historyMeals.slice(0, 15).map((meal) => (
                      <div
                        key={meal.id}
                        className="flex items-center justify-between rounded-2xl border border-sage-100 bg-white/80 px-4 py-2 text-sm shadow-soft dark:border-sage-800 dark:bg-sage-900/80"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sage-800 dark:text-sage-100">{meal.name}</p>
                          <p className="text-xs text-sage-500 capitalize">
                            {formatDateDisplay(meal.date)} · {meal.mealType} · {meal.time}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-xs font-semibold text-coral-600">{meal.calories} kcal</span>
                            <p className="text-xs text-sage-400">P:{meal.protein} C:{meal.carbs} G:{meal.fat}</p>
                          </div>
                          <button
                            onClick={() => setEditingMeal(meal)}
                            className="rounded-full p-1 text-sage-400 hover:bg-sage-100 hover:text-sage-600 dark:hover:bg-sage-800"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleRemoveMeal(meal.id)}
                            className="rounded-full p-1 text-sage-400 hover:bg-red-100 hover:text-red-600"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'invitaciones' && isAdmin && (
            <motion.section
              key="invitaciones"
              initial={{ opacity: 0, x: 24 * tabDirection }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 * tabDirection }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 lg:grid-cols-[1fr_1fr]"
            >
              <div className={`${cardBase} p-6`}>
                <h2 className="font-display text-xl font-semibold text-sage-800 dark:text-sage-100">
                  Solicitudes de invitación
                </h2>
                <p className="mt-1 text-xs text-sage-500 dark:text-sage-400">
                  Aceptá para generar un link y enviárselo; rechazá para descartar.
                </p>
                {invitationsLoading ? (
                  <div className="mt-4 flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-500 border-t-transparent" />
                  </div>
                ) : invitationRequests.filter(r => r.status === 'pending').length === 0 ? (
                  <p className="mt-4 text-sm text-sage-500 dark:text-sage-400">No hay solicitudes pendientes.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {invitationRequests.filter(r => r.status === 'pending').map((req) => (
                      <li
                        key={req.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sage-200 bg-white/80 px-4 py-3 dark:border-sage-700 dark:bg-sage-900/80"
                      >
                        <span className="text-sm font-medium text-sage-800 dark:text-sage-100">{req.email}</span>
                        <span className="text-xs text-sage-500">{new Date(req.requested_at).toLocaleDateString('es-AR')}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptRequest(req.id, req.email)}
                            className="rounded-full bg-sage-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sage-600"
                          >
                            Aceptar y copiar link
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req.id)}
                            className="rounded-full border border-sage-200 px-3 py-1.5 text-xs font-semibold text-sage-600 hover:bg-sage-100 dark:border-sage-700 dark:text-sage-300"
                          >
                            Rechazar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-6">
                <div className={`${cardBase} p-6`}>
                  <h2 className="font-display text-xl font-semibold text-sage-800 dark:text-sage-100">
                    Enviar invitación
                  </h2>
                  <form onSubmit={handleSendInvite} className="mt-4 flex flex-col gap-3">
                    <input
                      type="email"
                      value={newInviteEmail}
                      onChange={(e) => setNewInviteEmail(e.target.value)}
                      placeholder="email@ejemplo.com"
                      className="w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2.5 text-sm outline-none focus:border-sage-500 dark:border-sage-700 dark:bg-sage-900/80 dark:text-sage-100"
                      required
                    />
                    <button
                      type="submit"
                      className="rounded-2xl bg-sage-500 py-2.5 text-sm font-semibold text-white hover:bg-sage-600"
                    >
                      Generar link y copiar
                    </button>
                  </form>
                  <p className="mt-2 text-xs text-sage-500 dark:text-sage-400">
                    El link se copia al portapapeles; enviálo por email o mensaje.
                  </p>
                </div>
                <div className={`${cardBase} p-6`}>
                  <h3 className="font-display text-lg font-semibold text-sage-800 dark:text-sage-100">
                    Invitaciones enviadas
                  </h3>
                  {invitationsList.length === 0 ? (
                    <p className="mt-2 text-sm text-sage-500 dark:text-sage-400">Aún no enviaste ninguna.</p>
                  ) : (
                    <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                      {invitationsList.map((inv) => (
                        <li
                          key={inv.id || inv.token}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm dark:border-sage-700 dark:bg-sage-900/80"
                        >
                          <span className="font-medium text-sage-800 dark:text-sage-100">{inv.email}</span>
                          <span className="text-xs text-sage-500">
                            {inv.used_at ? 'Usada' : 'Pendiente'} · {new Date(inv.created_at).toLocaleDateString('es-AR')}
                          </span>
                          {!inv.used_at && (
                            <button
                              type="button"
                              onClick={() => {
                                const link = `${window.location.origin}${window.location.pathname}?invite=${inv.token}`
                                window.navigator.clipboard.writeText(link)
                                setToast({ id: randomId(), message: 'Link copiado' })
                              }}
                              className="rounded-full bg-sage-100 px-2 py-1 text-xs font-semibold text-sage-700 hover:bg-sage-200 dark:bg-sage-800 dark:text-sage-200"
                            >
                              Copiar link
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {authUser && (
        <motion.button
          type="button"
          onClick={() => {
            setMealTime(formatTimeInput(new Date()))
            setShowQuickAddModal(true)
          }}
          aria-label="Registrar comida"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-coral-500 text-white shadow-lg hover:bg-coral-600 active:scale-95 transition-transform sm:bottom-8 sm:right-6 sm:h-16 sm:w-16"
        >
          <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </motion.button>
      )}

      {/* Modal rápido Registrar comida */}
      <AnimatePresence>
        {showQuickAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
            onClick={() => setShowQuickAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-sage-900 border border-sage-200 dark:border-sage-700 shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold text-sage-800 dark:text-sage-100">Registrar comida</h3>
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="rounded-full p-2 text-sage-500 hover:bg-sage-100 dark:hover:bg-sage-800"
                  aria-label="Cerrar"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode('ia')}
                  className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                    inputMode === 'ia'
                      ? 'bg-coral-500 text-white'
                      : 'bg-coral-100 text-coral-700 dark:bg-coral-900 dark:text-coral-200'
                  }`}
                >
                  🤖 Describir con IA
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('lista')}
                  className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                    inputMode === 'lista'
                      ? 'bg-sage-500 text-white'
                      : 'bg-sage-100 text-sage-600 dark:bg-sage-800 dark:text-sage-300'
                  }`}
                >
                  📋 Buscar en lista
                </button>
              </div>

              {inputMode === 'lista' ? (
                <div className="grid gap-4">
                  <div>
                    <label className="text-xs text-sage-500">Alimento</label>
                    <input
                      value={mealName}
                      onChange={(e) => setMealName(e.target.value)}
                      list="food-list-quick"
                      placeholder="Ej: Ensalada de quinoa"
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      autoFocus
                    />
                    <datalist id="food-list-quick">
                      {[...baseFoods, ...state.customFoods].map((food) => (
                        <option key={food.id} value={food.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-sage-500 w-full">Tipo de comida</span>
                    {activeMealTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedMealType(type)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                          selectedMealType === type
                            ? 'bg-sage-500 text-white'
                            : 'bg-sage-100 text-sage-600 dark:bg-sage-800 dark:text-sage-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Tamaño del plato</label>
                    <div className="mt-1 flex gap-2">
                      {[
                        { value: 1, label: 'Chico' },
                        { value: 2, label: 'Mediano' },
                        { value: 3, label: 'Grande' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPortion(opt.value)}
                          className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                            portion === opt.value
                              ? 'bg-coral-500 text-white'
                              : 'bg-coral-100 text-coral-700 dark:bg-coral-900 dark:text-coral-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-2 sm:items-end">
                    <div className="min-w-0">
                      <label className="text-xs text-sage-500">Fecha (día mes año)</label>
                      <input
                        type="date"
                        value={mealDate}
                        onChange={(e) => setMealDate(e.target.value)}
                        className="mt-1 h-[42px] w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2.5 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="text-xs text-sage-500">Horario (24 h)</label>
                      <input
                        type="time"
                        value={mealTime}
                        onChange={(e) => setMealTime(e.target.value)}
                        className="mt-1 h-[42px] w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2.5 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Nota (opcional)</label>
                    <input
                      value={mealNote}
                      onChange={(e) => setMealNote(e.target.value)}
                      placeholder="Ej: Comí en casa"
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!mealName.trim()) return
                      handleAddMeal()
                      setShowQuickAddModal(false)
                    }}
                    disabled={!mealName.trim()}
                    className="rounded-2xl bg-coral-500 px-6 py-3 text-sm font-semibold text-white shadow-soft hover:bg-coral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Registrar comida
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 max-h-[60vh] overflow-y-auto">
                  {!state.openaiApiKey && (
                    <div className="flex items-center justify-between rounded-2xl bg-sage-100/70 p-2.5 dark:bg-sage-900/70">
                      <span className="text-xs text-sage-600 dark:text-sage-300">⚠️ Sin API Key (estimación básica)</span>
                      <button
                        type="button"
                        onClick={() => { setTempApiKey(state.openaiApiKey); setShowApiKeyModal(true) }}
                        className="rounded-full bg-sage-500 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Configurar
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-sage-500">Describe lo que comiste</label>
                    <textarea
                      value={aiDescription}
                      onChange={(e) => handleAiEstimate(e.target.value)}
                      placeholder="Ej: Tostada con mermelada y jugo de naranja"
                      rows={2}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                    />
                  </div>
                  {isLoadingAi && (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-sage-200 bg-sage-50/80 p-4 dark:border-sage-700 dark:bg-sage-900/80">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
                      <span className="text-xs text-sage-600 dark:text-sage-300">Analizando con IA...</span>
                    </div>
                  )}
                  {aiEstimate && !isLoadingAi && (() => {
                    const scale = portionScale[portion - 1] ?? 1
                    return (
                    <div className="rounded-2xl border border-sage-200 bg-sage-50/80 p-3 dark:border-sage-700 dark:bg-sage-900/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-sage-700 dark:text-sage-200">
                          {state.openaiApiKey ? '🤖 OpenAI' : '📊 Estimación'}
                          {portion !== 2 && <span className="ml-1 font-normal text-sage-500">(×{scale})</span>}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          aiEstimate.confidence === 'alta' ? 'bg-green-100 text-green-700' : aiEstimate.confidence === 'media' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {aiEstimate.confidence}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-center">
                        <div className="rounded-lg bg-white/80 p-1.5 dark:bg-sage-800/80">
                          <p className="text-sm font-bold text-coral-600">{Math.round(aiEstimate.calories * scale)}</p>
                          <p className="text-[10px] text-sage-500">kcal</p>
                        </div>
                        <div className="rounded-lg bg-white/80 p-1.5 dark:bg-sage-800/80">
                          <p className="text-sm font-bold text-sage-600">{Math.round(aiEstimate.protein * scale)}g</p>
                          <p className="text-[10px] text-sage-500">P</p>
                        </div>
                        <div className="rounded-lg bg-white/80 p-1.5 dark:bg-sage-800/80">
                          <p className="text-sm font-bold text-soil-600">{Math.round(aiEstimate.carbs * scale)}g</p>
                          <p className="text-[10px] text-sage-500">C</p>
                        </div>
                        <div className="rounded-lg bg-white/80 p-1.5 dark:bg-sage-800/80">
                          <p className="text-sm font-bold text-coral-500">{Math.round(aiEstimate.fat * scale)}g</p>
                          <p className="text-[10px] text-sage-500">G</p>
                        </div>
                        <div className="rounded-lg bg-white/80 p-1.5 dark:bg-sage-800/80">
                          <p className="text-sm font-bold text-green-600">{Math.round(aiEstimate.fiber * scale)}g</p>
                          <p className="text-[10px] text-sage-500">Fib</p>
                        </div>
                      </div>
                    </div>
                  ); })()}
                  <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-2 sm:items-end">
                    <div className="min-w-0">
                      <label className="text-xs text-sage-500">Fecha (día mes año)</label>
                      <input
                        type="date"
                        value={mealDate}
                        onChange={(e) => setMealDate(e.target.value)}
                        className="mt-1 h-[42px] w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2.5 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="text-xs text-sage-500">Horario (24 h)</label>
                      <input
                        type="time"
                        value={mealTime}
                        onChange={(e) => setMealTime(e.target.value)}
                        className="mt-1 h-[42px] w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2.5 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-900/80"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-sage-500 w-full">Tipo de comida</span>
                    {activeMealTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedMealType(type)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                          selectedMealType === type ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600 dark:bg-sage-800 dark:text-sage-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Tamaño del plato</label>
                    <div className="mt-1 flex gap-2">
                      {[
                        { value: 1, label: 'Chico' },
                        { value: 2, label: 'Mediano' },
                        { value: 3, label: 'Grande' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPortion(opt.value)}
                          className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                            portion === opt.value ? 'bg-coral-500 text-white' : 'bg-coral-100 text-coral-700 dark:bg-coral-900 dark:text-coral-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!aiDescription.trim() || !aiEstimate) return
                      handleAddMealFromAi()
                      setShowQuickAddModal(false)
                    }}
                    disabled={!aiEstimate}
                    className={`rounded-2xl px-6 py-3 text-sm font-semibold shadow-soft transition ${
                      aiEstimate ? 'bg-coral-500 text-white hover:bg-coral-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Registrar con estimación IA
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback check al registrar comida */}
      <AnimatePresence>
        {showRegisterCheck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 200 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-500 text-white shadow-lg"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebración día perfecto */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-3xl bg-white dark:bg-sage-900 p-8 shadow-2xl border border-sage-200 dark:border-sage-700 text-center max-w-sm"
            >
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="font-display text-xl font-bold text-sage-800 dark:text-sage-100">¡Día perfecto!</h3>
              <p className="mt-2 text-sm text-sage-600 dark:text-sage-300">Completaste todas las metas del día. Cada día así te acerca al gran momento.</p>
              <button
                type="button"
                onClick={() => setShowCelebration(false)}
                className="mt-6 rounded-2xl bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-coral-600"
              >
                ¡Gracias!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de edición de comida */}
      <AnimatePresence>
        {editingMeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setEditingMeal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl dark:bg-sage-900"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-sage-800 dark:text-sage-100">
                ✏️ Editar comida
              </h3>
              <div className="mt-4 grid gap-4">
                <div>
                  <label className="text-xs text-sage-500">Nombre</label>
                  <input
                    value={editingMeal.name}
                    onChange={(e) => setEditingMeal({ ...editingMeal, name: e.target.value })}
                    className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                  />
                </div>
                <div>
                  <label className="text-xs text-sage-500">Tipo de comida</label>
                  <select
                    value={editingMeal.mealType}
                    onChange={(e) => setEditingMeal({ ...editingMeal, mealType: e.target.value as MealType })}
                    className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                  >
                    {mealTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-sage-500">Fecha</label>
                    <input
                      type="date"
                      value={editingMeal.date}
                      onChange={(e) => setEditingMeal({ ...editingMeal, date: e.target.value })}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Hora</label>
                    <input
                      type="time"
                      value={editingMeal.time}
                      onChange={(e) => setEditingMeal({ ...editingMeal, time: e.target.value })}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-sage-500">Tamaño del plato</label>
                  <div className="mt-1 flex gap-2">
                    {[
                      { value: 1, label: 'Chico' },
                      { value: 2, label: 'Mediano' },
                      { value: 3, label: 'Grande' }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditingMeal({ ...editingMeal, portion: opt.value })}
                        className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                          editingMeal.portion === opt.value
                            ? 'bg-coral-500 text-white'
                            : 'bg-coral-100 text-coral-700 dark:bg-coral-900 dark:text-coral-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="text-xs text-sage-500">Calorías</label>
                    <input
                      type="number"
                      value={editingMeal.calories}
                      onChange={(e) => setEditingMeal({ ...editingMeal, calories: Number(e.target.value) })}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Prot (g)</label>
                    <input
                      type="number"
                      value={editingMeal.protein}
                      onChange={(e) => setEditingMeal({ ...editingMeal, protein: Number(e.target.value) })}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Carbs (g)</label>
                    <input
                      type="number"
                      value={editingMeal.carbs}
                      onChange={(e) => setEditingMeal({ ...editingMeal, carbs: Number(e.target.value) })}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Grasas (g)</label>
                    <input
                      type="number"
                      value={editingMeal.fat}
                      onChange={(e) => setEditingMeal({ ...editingMeal, fat: Number(e.target.value) })}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Fibra (g)</label>
                    <input
                      type="number"
                      value={editingMeal.fiber}
                      onChange={(e) => setEditingMeal({ ...editingMeal, fiber: Number(e.target.value) })}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-3 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-sage-500">Nota</label>
                  <input
                    value={editingMeal.note}
                    onChange={(e) => setEditingMeal({ ...editingMeal, note: e.target.value })}
                    className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => {
                    handleRemoveMeal(editingMeal.id)
                    setEditingMeal(null)
                  }}
                  className="rounded-2xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  🗑️ Eliminar
                </button>
                <button
                  onClick={() => setEditingMeal(null)}
                  className="flex-1 rounded-2xl border border-sage-200 px-4 py-2 text-sm font-semibold text-sage-600 hover:bg-sage-50 dark:border-sage-700 dark:text-sage-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleUpdateMeal(editingMeal)}
                  className="flex-1 rounded-2xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de edición de actividad */}
      <AnimatePresence>
        {editingActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setEditingActivity(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-sage-900"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-sage-800 dark:text-sage-100">
                ✏️ Editar actividad
              </h3>
              <div className="mt-4 grid gap-4">
                <div>
                  <label className="text-xs text-sage-500">Nombre/Detalle</label>
                  <input
                    value={editingActivity.name}
                    onChange={(e) => setEditingActivity({ ...editingActivity, name: e.target.value })}
                    className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                  />
                </div>
                <div>
                  <label className="text-xs text-sage-500">Categoría</label>
                  <select
                    value={editingActivity.category}
                    onChange={(e) => setEditingActivity({ ...editingActivity, category: e.target.value as ActivityCategory })}
                    className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                  >
                    {activityCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-sage-500">Minutos</label>
                    <input
                      type="number"
                      value={editingActivity.minutes}
                      onChange={(e) => setEditingActivity({ ...editingActivity, minutes: Number(e.target.value) })}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Intensidad</label>
                    <select
                      value={editingActivity.intensity}
                      onChange={(e) => setEditingActivity({ ...editingActivity, intensity: e.target.value as ActivityEntry['intensity'] })}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                    >
                      <option value="Suave">Suave</option>
                      <option value="Moderada">Moderada</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-sage-500">Hora</label>
                    <input
                      type="time"
                      value={editingActivity.time}
                      onChange={(e) => setEditingActivity({ ...editingActivity, time: e.target.value })}
                      className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-2 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => {
                    handleRemoveActivity(editingActivity.id)
                    setEditingActivity(null)
                  }}
                  className="rounded-2xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  🗑️ Eliminar
                </button>
                <button
                  onClick={() => setEditingActivity(null)}
                  className="flex-1 rounded-2xl border border-sage-200 px-4 py-2 text-sm font-semibold text-sage-600 hover:bg-sage-50 dark:border-sage-700 dark:text-sage-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleUpdateActivity(editingActivity)}
                  className="flex-1 rounded-2xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de configuración de API Key */}
      <AnimatePresence>
        {showApiKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowApiKeyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-sage-900"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-sage-800 dark:text-sage-100">
                🔑 Configurar API Key de OpenAI
              </h3>
              <p className="mt-2 text-sm text-sage-600 dark:text-sage-400">
                Ingresa tu API Key para obtener estimaciones precisas de calorías usando GPT-4.
              </p>
              <div className="mt-4">
                <label className="text-xs text-sage-500">API Key</label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="mt-1 w-full rounded-2xl border border-sage-200 bg-white/80 px-4 py-3 text-sm shadow-soft outline-none focus:border-sage-400 dark:border-sage-700 dark:bg-sage-800"
                />
                <p className="mt-2 text-xs text-sage-400">
                  Obtén tu API Key en{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-coral-500 underline">
                    platform.openai.com/api-keys
                  </a>
                </p>
              </div>
              <div className="mt-6 flex gap-2">
                {state.openaiApiKey && (
                  <button
                    onClick={() => {
                      handleRemoveApiKey()
                      setShowApiKeyModal(false)
                    }}
                    className="rounded-2xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                )}
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="flex-1 rounded-2xl border border-sage-200 px-4 py-2 text-sm font-semibold text-sage-600 hover:bg-sage-50 dark:border-sage-700 dark:text-sage-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveApiKey}
                  className="flex-1 rounded-2xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 right-6 rounded-2xl bg-sage-500 px-4 py-3 text-sm font-semibold text-white shadow-lift"
            onAnimationComplete={() => setTimeout(() => setToast(null), 2000)}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App

