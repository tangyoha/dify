import type { FC } from 'react'
import {
  memo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  RiCloseLine,
} from '@remixicon/react'
import Modal from '@/app/components/base/modal'
import Button from '@/app/components/base/button'
import Textarea from '@/app/components/base/textarea'
import Radio from '@/app/components/base/radio'
import cn from '@/utils/classnames'

type FeedbackModalProps = {
  isShow: boolean
  onClose: () => void
  onSubmit: (feedback: { reason: string; content: string }) => void
}

const FeedbackModal: FC<FeedbackModalProps> = ({
  isShow,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const [selectedReason, setSelectedReason] = useState('')
  const [feedbackContent, setFeedbackContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reasons = [
    { value: 'inaccurate', label: t('common.chat.feedback.dislikeModal.reasons.inaccurate') },
    { value: 'slow', label: t('common.chat.feedback.dislikeModal.reasons.slow') },
    { value: 'irrelevant', label: t('common.chat.feedback.dislikeModal.reasons.irrelevant') },
    { value: 'incomplete', label: t('common.chat.feedback.dislikeModal.reasons.incomplete') },
    { value: 'other', label: t('common.chat.feedback.dislikeModal.reasons.other') },
  ]

  const handleSubmit = async () => {
    if (!selectedReason) return
    
    setIsSubmitting(true)
    try {
      await onSubmit({
        reason: selectedReason,
        content: feedbackContent,
      })
      handleClose()
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedReason('')
    setFeedbackContent('')
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Modal
      isShow={isShow}
      onClose={handleClose}
      title={t('common.chat.feedback.dislikeModal.title')}
      className="w-[480px]"
    >
      <div className="space-y-4">
        <div>
          <div className="mb-3 text-sm font-medium text-gray-900">
            {t('common.chat.feedback.dislikeModal.selectReason')}
          </div>
          <Radio.Group value={selectedReason} onChange={setSelectedReason}>
            <div className="grid grid-cols-2 gap-3">
              {reasons.map((reason) => (
                <Radio
                  key={reason.value}
                  value={reason.value}
                  className="whitespace-nowrap"
                >
                  {reason.label}
                </Radio>
              ))}
            </div>
          </Radio.Group>
        </div>

        <div>
          <div className="mb-2 text-sm font-medium text-gray-900">
            {t('common.chat.feedback.dislikeModal.description')}
          </div>
          <Textarea
            value={feedbackContent}
            onChange={(e) => setFeedbackContent(e.target.value)}
            placeholder={t('common.chat.feedback.dislikeModal.placeholder')}
            rows={4}
            className="min-h-20 w-full"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t('common.chat.feedback.dislikeModal.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            loading={isSubmitting}
          >
            {t('common.chat.feedback.dislikeModal.submit')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default memo(FeedbackModal)
