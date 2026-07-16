import { ApiError } from './errors'
import type {
  ApiErrorBody,
  CreateOrderInput,
  CreatedOrder,
  MenuListResponse,
  OrderStatus,
  StatusUpdateResult,
} from '../types/api'

const API_BASE = import.meta.env.VITE_API_BASE_URL

if (!API_BASE) {
  console.warn('VITE_API_BASE_URL is not set — see .env.example. API calls will fail.')
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', 0)
  }

  if (response.status === 429) {
    throw new ApiError('RATE_LIMITED', 429)
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(body?.error ?? 'INTERNAL_SERVER_ERROR', response.status, body?.fields)
  }

  return response.json() as Promise<T>
}

export function getMenu(page: number, limit: number): Promise<MenuListResponse> {
  return request<MenuListResponse>(`/menu?page=${page}&limit=${limit}`)
}

export function createOrder(input: CreateOrderInput): Promise<{ order: CreatedOrder }> {
  return request<{ order: CreatedOrder }>('/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<{ order: StatusUpdateResult }> {
  return request<{ order: StatusUpdateResult }>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
