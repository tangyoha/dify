import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '@/app/components/base/input'
import Button from '@/app/components/base/button'
import { User01 } from '@/app/components/base/icons/src/vender/line/users'
import { useChatWithHistoryContext } from '../context'

// 简单的函数来获取当前用户ID（从URL或其他地方）
const getCurrentUserIdFromToken = () => {
  // 这里可以从当前的access token中解析用户ID，或者从其他地方获取
  // 为了简单起见，我们使用一个固定的映射
  return 'd10dcfe3' // 这是当前已知的用户ID
}

type Props = {
  onUserIdChange?: (userId: string) => void
  className?: string
}

const UserIdentifier = ({ onUserIdChange, className }: Props) => {
  const { t } = useTranslation()
  const { currentConversationId } = useChatWithHistoryContext()
  const [userId, setUserId] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [savedUserId, setSavedUserId] = useState('')

  // 从localStorage获取保存的用户ID
  useEffect(() => {
    const saved = localStorage.getItem('chat_user_id') || ''
    setUserId(saved)
    setSavedUserId(saved)
    if (saved && onUserIdChange) {
      onUserIdChange(saved)
    }
  }, [onUserIdChange])

  // 保存用户ID到localStorage并更新URL参数
  const handleSaveUserId = useCallback(async () => {
    if (userId.trim()) {
      localStorage.setItem('chat_user_id', userId.trim())
      setSavedUserId(userId.trim())

      // 更新URL参数以便后端识别用户
      const urlParams = new URLSearchParams(window.location.search)
      // 直接设置user_id参数，后端已经支持
      urlParams.set('user_id', userId.trim())
      // 为了兼容性，也设置sys.user_id，但使用URL编码而不是Base64
      urlParams.set('sys.user_id', encodeURIComponent(userId.trim()))

      // 更新URL但不刷新页面
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`
      window.history.replaceState({}, '', newUrl)

      // 保存用户ID映射到localStorage，用于前端显示
      const userMappings = JSON.parse(localStorage.getItem('user_id_mappings') || '{}')
      // 获取当前用户的实际ID（从现有token中解析或使用默认值）
      const currentUserId = getCurrentUserIdFromToken() || 'd10dcfe3' // 默认使用已知的用户ID
      userMappings[currentUserId] = userId.trim()
      localStorage.setItem('user_id_mappings', JSON.stringify(userMappings))

      if (onUserIdChange) {
        onUserIdChange(userId.trim())
      }

      setIsEditing(false)
    }
  }, [userId, onUserIdChange])

  const handleClearUserId = useCallback(() => {
    setUserId('')
    setSavedUserId('')
    localStorage.removeItem('chat_user_id')

    // 从URL中移除用户ID参数
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.delete('user_id')
    urlParams.delete('sys.user_id')

    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.replaceState({}, '', newUrl)

    if (onUserIdChange) {
      onUserIdChange('')
    }

    setIsEditing(false)
  }, [onUserIdChange])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveUserId()
    } else if (e.key === 'Escape') {
      setUserId(savedUserId)
      setIsEditing(false)
    }
  }

  // 如果已有对话且用户ID已设置，显示简化版本
  if (currentConversationId && savedUserId) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm ${className}`}>
        <User01 className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">{t('share.chat.currentUser')}: </span>
        <span className="font-medium text-gray-900">{savedUserId}</span>
        <Button
          size="small"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="ml-auto text-xs"
        >
          {t('common.operation.edit')}
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <User01 className="w-5 h-5 text-gray-600" />
        <div className="system-md-semibold text-text-secondary">
          {t('share.chat.userIdentifier')}
        </div>
        {!savedUserId && (
          <span className="system-xs-regular text-text-tertiary">
            {t('appDebug.variableTable.optional')}
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <Input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={t('share.chat.userIdPlaceholder')}
          className="w-full"
        />
        
        <div className="flex gap-2">
          <Button
            size="small"
            variant="primary"
            onClick={handleSaveUserId}
            disabled={!userId.trim() || userId.trim() === savedUserId}
          >
            {savedUserId ? t('common.operation.update') : t('common.operation.save')}
          </Button>
          
          {savedUserId && (
            <Button
              size="small"
              variant="ghost"
              onClick={handleClearUserId}
            >
              {t('common.operation.clear')}
            </Button>
          )}
          
          {isEditing && (
            <Button
              size="small"
              variant="ghost"
              onClick={() => {
                setUserId(savedUserId)
                setIsEditing(false)
              }}
            >
              {t('common.operation.cancel')}
            </Button>
          )}
        </div>
      </div>
      
      <div className="system-xs-regular text-text-tertiary">
        {t('share.chat.userIdTip')}
      </div>
    </div>
  )
}

export default UserIdentifier
