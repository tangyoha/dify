import type { FC } from 'react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import type { ChatItem } from '../../types'
import cn from '@/utils/classnames'

type FeedbackHistoryProps = {
  item: ChatItem
}

const FeedbackHistory: FC<FeedbackHistoryProps> = ({ item }) => {
  const { t } = useTranslation()

  // Get feedbacks from the item - combine user and admin feedback
  const feedbacks = []
  if (item.feedback) {
    feedbacks.push({
      ...item.feedback,
      from_source: 'user',
      id: `user-${item.id}`,
    })
  }
  if (item.adminFeedback) {
    feedbacks.push({
      ...item.adminFeedback,
      from_source: 'admin',
      id: `admin-${item.id}`,
    })
  }

  if (!feedbacks.length) {
    return null
  }

  const parseFeedbackContent = (content: string | null | undefined) => {
    if (!content) return null

    // Try to parse structured feedback content like "inaccurate: 答案不够准确"
    const match = content.match(/^([^:]+):\s*(.+)$/)
    if (match) {
      return {
        problem_type: match[1].trim(),
        description: match[2].trim(),
      }
    }
    return null
  }

  const renderProblemType = (problemType: string) => {
    const typeMap: Record<string, string> = {
      inaccurate: t('common.chat.feedback.dislikeModal.reasons.inaccurate'),
      slow: t('common.chat.feedback.dislikeModal.reasons.slow'),
      irrelevant: t('common.chat.feedback.dislikeModal.reasons.irrelevant'),
      incomplete: t('common.chat.feedback.dislikeModal.reasons.incomplete'),
      other: t('common.chat.feedback.dislikeModal.reasons.other'),
    }
    return typeMap[problemType] || problemType
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center space-x-2">
        <div className="system-xs-semibold text-text-tertiary">
          {t('appLog.feedbackDetails.title')}
        </div>
        <div className="system-2xs-regular text-text-quaternary">
          ({feedbacks.length} 条反馈)
        </div>
      </div>
      {feedbacks.map((feedback) => {
        const parsedContent = parseFeedbackContent(feedback.content)
        return (
          <div
            key={feedback.id}
            className="p-3 bg-background-section-burn rounded-lg border border-divider-subtle"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full system-xs-medium',
                  feedback.rating === 'like'
                    ? 'bg-util-colors-green-green-50 text-util-colors-green-green-700 border border-util-colors-green-green-200'
                    : 'bg-util-colors-red-red-50 text-util-colors-red-red-700 border border-util-colors-red-red-200'
                )}>
                  {feedback.rating === 'like' ? '👍' : '👎'}
                  {feedback.rating === 'like' ? '满意' : '不满意'}
                </span>
                <span className="system-xs-regular text-text-tertiary bg-background-default px-2 py-0.5 rounded">
                  {feedback.from_source === 'user' ? '用户反馈' : '管理员反馈'}
                </span>
              </div>
            </div>

            {feedback.content && (
              <div className="space-y-2">
                {parsedContent?.problem_type && (
                  <div className="flex items-start space-x-2">
                    <span className="system-xs-medium text-text-secondary min-w-0 shrink-0">
                      {t('appLog.feedbackDetails.problemType')}:
                    </span>
                    <span className="system-xs-regular text-text-primary bg-util-colors-orange-orange-50 text-util-colors-orange-orange-700 px-2 py-0.5 rounded border border-util-colors-orange-orange-200">
                      {renderProblemType(parsedContent.problem_type)}
                    </span>
                  </div>
                )}
                {parsedContent?.description && (
                  <div className="space-y-1">
                    <div className="system-xs-medium text-text-secondary">
                      {t('appLog.feedbackDetails.description')}:
                    </div>
                    <div className="system-xs-regular text-text-primary bg-background-default p-2 rounded border border-divider-subtle">
                      {parsedContent.description}
                    </div>
                  </div>
                )}
                {!parsedContent?.problem_type && (
                  <div className="space-y-1">
                    <div className="system-xs-medium text-text-secondary">
                      反馈内容:
                    </div>
                    <div className="system-xs-regular text-text-primary bg-background-default p-2 rounded border border-divider-subtle break-words">
                      {feedback.content}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default memo(FeedbackHistory)
