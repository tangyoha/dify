import { del, get, post } from './base'

// 反馈统计数据类型定义
export type FeedbackStats = {
  like: number
  dislike: number
  total: number
  satisfaction_rate: number
}

export type AppFeedbackStats = {
  [appId: string]: FeedbackStats
}

export type ProblemBreakdown = {
  inaccurate: number
  slow: number
  irrelevant: number
  incomplete: number
  other: number
}

export type RecentFeedback = {
  id: string
  rating: 'like' | 'dislike'
  content: string | null
  created_at: string | null
}

export type DetailedFeedbackStats = {
  app_id: string
  app_name: string
  basic_stats: FeedbackStats
  problem_breakdown: ProblemBreakdown
  recent_feedback: RecentFeedback[]
}

// API 接口
export const fetchAppsFeedbackStats = (appIds?: string[]): Promise<{
  result: string
  data: AppFeedbackStats
}> => {
  const params = appIds && appIds.length > 0 ? { app_ids: appIds.join(',') } : {}
  return get('/apps/feedback-stats', { params })
}

export const fetchAppDetailedFeedbackStats = (appId: string): Promise<{
  result: string
  data: DetailedFeedbackStats
}> => {
  return get(`/apps/${appId}/feedback-stats`)
}

// 提交反馈（已有的接口，这里重新导出方便使用）
export const submitFeedback = (messageId: string, rating: 'like' | 'dislike', content?: string) => {
  return post(`/messages/${messageId}/feedbacks`, {
    body: {
      rating,
      content,
    },
  })
}
