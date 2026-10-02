export type Product = {
  id: string
  name: string
  description: string
  size: string
  price: number
  image_url: string
  stock_status: boolean
  created_at?: string
}

export type CartItem = {
  product: Product
  quantity: number
}

export type AuthUser = {
  name: string | null
  email: string | null
  avatarUrl: string | null
}
