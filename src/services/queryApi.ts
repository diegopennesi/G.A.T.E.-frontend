import { apiRequest, type ApiRequestOptions } from './apiClient'

export function queryRequest<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(path, options)
}

