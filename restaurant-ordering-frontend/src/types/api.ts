export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  is_available: boolean
}

export interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface MenuListResponse {
  items: MenuItem[]
  pagination: Pagination
}

export interface CreateOrderItemInput {
  menu_item_id: string
  quantity: number
}

export interface CreateOrderInput {
  customer_name: string
  customer_email: string
  items: CreateOrderItemInput[]
}

export interface CreatedOrderItem {
  menu_item_id: string
  quantity: number
  unit_price: number
  subtotal: number
}

export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled'

export interface CreatedOrder {
  id: string
  customer_name: string
  total_amount: number
  status: OrderStatus
  created_at: string
  items: CreatedOrderItem[]
}

export interface StatusUpdateResult {
  id: string
  status: OrderStatus
  total_amount: number
  updated_at: string
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_MENU_ITEMS'
  | 'ITEM_NOT_AVAILABLE'
  | 'INVALID_ID_FORMAT'
  | 'ORDER_NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'

export interface ApiErrorBody {
  error: ApiErrorCode
  fields?: Record<string, string[] | undefined>
}
