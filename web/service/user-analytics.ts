import type { Fetcher } from 'swr'
import { del, get, patch, post } from './base'

export type UserAnalyticsData = {
  total_users: number
  active_users_today: number
  total_conversations: number
  total_messages: number
  user_distribution: Array<{
    user_id: string
    user_name: string
    conversation_count: number
    message_count: number
    last_active: string | null
    created_at: string | null
  }>
  daily_active_users: Array<{
    date: string
    user_count: number
  }>
}

export type UserDetail = {
  user: {
    id: string
    name: string
    external_user_id: string
    is_anonymous: boolean
    created_at: string
    updated_at: string
  }
  conversations: Array<{
    id: string
    name: string
    message_count: number
    created_at: string
    updated_at: string
  }>
  message_stats: Array<{
    date: string
    count: number
  }>
}

export const fetchUserAnalytics: Fetcher<UserAnalyticsData, { url: string; params: Record<string, any> }> = ({ url, params }) => {
  return get<UserAnalyticsData>(url, { params })
}

export const fetchUserDetail: Fetcher<UserDetail, { url: string }> = ({ url }) => {
  return get<UserDetail>(url)
}

export const getUserAnalytics = (appId: string, range: string = '7d') => {
  return get<UserAnalyticsData>(`/console/api/apps/${appId}/user-analytics`, {
    params: { range }
  })
}

export const getUserDetail = (appId: string, userId: string) => {
  return get<UserDetail>(`/console/api/apps/${appId}/users/${userId}`)
}

export type UserAnalyticsDetailResponse = {
  users: Array<{
    user_id: string
    user_name: string
    message_count: number
    conversation_count: number
    last_active: string | null
    created_at: string | null
  }>
  total: number
  page: number
  limit: number
  has_more: boolean
}

export const fetchUserAnalyticsDetail: Fetcher<UserAnalyticsDetailResponse, { url: string; params: Record<string, any> }> = ({ url, params }) => {
  return get<UserAnalyticsDetailResponse>(url, { params })
}

export const getUserAnalyticsDetail = (appId: string, params: { range?: string; start_date?: string; end_date?: string; page?: number; limit?: number }) => {
  return get<UserAnalyticsDetailResponse>(`/console/api/apps/${appId}/user-analytics-detail`, {
    params
  })
}
