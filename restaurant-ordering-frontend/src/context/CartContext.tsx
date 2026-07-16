import { useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { CartContext, type CartContextValue, type CartLine } from './cart-context'
import type { CreatedOrder, MenuItem } from '../types/api'

const CART_KEY = 'rof.cart.v1'
const LAST_ORDER_KEY = 'rof.lastOrder.v1'
const MIN_QTY = 1
const MAX_QTY = 20

function clampQuantity(quantity: number): number {
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round(quantity)))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useLocalStorage<CartLine[]>(CART_KEY, [])
  const [lastOrder, setLastOrder] = useLocalStorage<CreatedOrder | null>(LAST_ORDER_KEY, null)

  const addItem = (item: MenuItem, quantity: number) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.menuItemId === item.id)
      if (existing) {
        return prev.map((line) =>
          line.menuItemId === item.id
            ? { ...line, quantity: clampQuantity(line.quantity + quantity) }
            : line,
        )
      }
      return [
        ...prev,
        { menuItemId: item.id, name: item.name, unitPrice: item.price, quantity: clampQuantity(quantity) },
      ]
    })
  }

  const updateQuantity = (menuItemId: string, quantity: number) => {
    setLines((prev) =>
      prev.map((line) =>
        line.menuItemId === menuItemId ? { ...line, quantity: clampQuantity(quantity) } : line,
      ),
    )
  }

  const removeItem = (menuItemId: string) => {
    setLines((prev) => prev.filter((line) => line.menuItemId !== menuItemId))
  }

  const clearCart = () => setLines([])

  const previewSubtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [lines],
  )

  const value: CartContextValue = {
    lines,
    lastOrder,
    previewSubtotal,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    setLastOrder,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
