'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { CartItem, Product } from '@/types/shop'

const STORAGE_KEY = 'viezobo-cart-v1'

type CartContextValue = {
  cart: CartItem[]
  hydrated: boolean
  itemCount: number
  subtotal: number
  addToCart: (product: Product) => void
  updateQuantity: (productId: string, change: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function isStoredCart(value: unknown): value is CartItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.quantity === 'number' &&
        item.quantity > 0 &&
        typeof item.product === 'object' &&
        item.product !== null &&
        typeof item.product.id === 'string',
    )
  )
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (isStoredCart(parsed)) setCart(parsed)
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  }, [cart, hydrated])

  const addToCart = useCallback((product: Product) => {
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id)
      return found
        ? current.map((item) =>
            item.product.id === product.id
              ? { ...item, product, quantity: item.quantity + 1 }
              : item,
          )
        : [...current, { product, quantity: 1 }]
    })
  }, [])

  const updateQuantity = useCallback((productId: string, change: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart((current) => current.filter((item) => item.product.id !== productId))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart],
  )

  return (
    <CartContext.Provider
      value={{
        cart,
        hydrated,
        itemCount,
        subtotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside CartProvider.')
  return context
}
