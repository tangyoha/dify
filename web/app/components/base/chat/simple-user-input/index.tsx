import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '@/app/components/base/input'
import Button from '@/app/components/base/button'
import { User01 } from '@/app/components/base/icons/src/vender/line/users'

type Props = {
  onUserIdChange?: (userId: string) => void
  className?: string
  placeholder?: string
  showLabel?: boolean
}

const SimpleUserInput = ({ 
  onUserIdChange, 
  className = '', 
  placeholder,
  showLabel = true 
}: Props) => {
  const { t } = useTranslation()
  const [userId, setUserId] = useState('')
  const [isSet, setIsSet] = useState(false)

  // 从localStorage获取保存的用户ID
  useEffect(() => {
    const saved = localStorage.getItem('chat_user_id') || ''
    if (saved) {
      setUserId(saved)
      setIsSet(true)
      if (onUserIdChange) {
        onUserIdChange(saved)
      }
    }
  }, [onUserIdChange])

  // 保存用户ID
  const handleSaveUserId = useCallback(() => {
    if (userId.trim()) {
      localStorage.setItem('chat_user_id', userId.trim())
      setIsSet(true)
      
      // 更新URL参数
      const urlParams = new URLSearchParams(window.location.search)
      const encodedUserId = btoa(userId.trim())
      urlParams.set('sys.user_id', encodedUserId)
      
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`
      window.history.replaceState({}, '', newUrl)
      
      if (onUserIdChange) {
        onUserIdChange(userId.trim())
      }
    }
  }, [userId, onUserIdChange])

  const handleClearUserId = useCallback(() => {
    setUserId('')
    setIsSet(false)
    localStorage.removeItem('chat_user_id')
    
    // 从URL中移除用户ID参数
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.delete('sys.user_id')
    
    const newUrl = urlParams.toString() 
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.replaceState({}, '', newUrl)
    
    if (onUserIdChange) {
      onUserIdChange('')
    }
  }, [onUserIdChange])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveUserId()
    }
  }

  if (isSet) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm ${className}`}>
        <User01 className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">{t('share.chat.currentUser')}: </span>
        <span className="font-medium text-gray-900">{userId}</span>
        <Button
          size="small"
          variant="ghost"
          onClick={() => setIsSet(false)}
          className="ml-auto text-xs"
        >
          {t('common.operation.edit')}
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-2">
          <User01 className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {t('share.chat.userIdentifier')}
          </span>
          <span className="text-xs text-gray-500">
            ({t('appDebug.variableTable.optional')})
          </span>
        </div>
      )}
      
      <div className="flex gap-2">
        <Input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder || t('share.chat.userIdPlaceholder')}
          className="flex-1"
        />
        
        <Button
          size="small"
          variant="primary"
          onClick={handleSaveUserId}
          disabled={!userId.trim()}
        >
          {t('common.operation.save')}
        </Button>
      </div>
      
      <div className="text-xs text-gray-500">
        {t('share.chat.userIdTip')}
      </div>
    </div>
  )
}

export default SimpleUserInput
