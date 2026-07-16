import type { ApiErrorCode } from '../types/api'

export class ApiError extends Error {
  code: ApiErrorCode
  status: number
  fields?: Record<string, string[] | undefined>

  constructor(code: ApiErrorCode, status: number, fields?: Record<string, string[] | undefined>) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fields = fields
  }
}

export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: 'Please check the highlighted fields.',
  INVALID_MENU_ITEMS: 'One or more items in your cart no longer exist. Please review your cart.',
  ITEM_NOT_AVAILABLE: 'One or more items in your cart are no longer available.',
  INVALID_ID_FORMAT: "That order ID doesn't look valid.",
  ORDER_NOT_FOUND: 'No order found with that ID.',
  INTERNAL_SERVER_ERROR: 'Something went wrong on our end. Please try again.',
  RATE_LIMITED: 'Too many requests — please wait a moment and try again.',
  NETWORK_ERROR: 'Could not reach the server. Check your connection and try again.',
}
