import { createContext } from 'react'
import type { CreatedOrder, MenuItem } from '../types/api'

export interface CartLine {
  menuItemId: string
  name: string
  unitPrice: number
  quantity: number
}

export interface CartContextValue {
  lines: CartLine[]
  lastOrder: CreatedOrder | null
  previewSubtotal: number
  addItem: (item: MenuItem, quantity: number) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  removeItem: (menuItemId: string) => void
  clearCart: () => void
  setLastOrder: (order: CreatedOrder | null) => void
}

export const CartContext = createContext<CartContextValue | null>(null)
