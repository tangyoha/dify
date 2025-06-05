import type { ReactNode } from 'react'
import cn from '@/utils/classnames'
import { useTranslation } from 'react-i18next'
import { RiCloseLine } from '@remixicon/react'
import { useEffect } from 'react'

interface SplitViewLayoutProps {
  children: ReactNode
  rightContent?: ReactNode
  isRightContentVisible: boolean
  onClose: () => void
  title?: string
  isMobile?: boolean
}

const SplitViewLayout: React.FC<SplitViewLayoutProps> = ({
  children,
  rightContent,
  isRightContentVisible,
  onClose,
  title,
  isMobile = false,
}) => {
  const { t } = useTranslation()
  const displayTitle = title || t('artifact.panel.title')

  // Handle mobile back button
  useEffect(() => {
    if (isMobile && isRightContentVisible) {
      const handlePopState = () => {
        onClose()
      }
      window.addEventListener('popstate', handlePopState)
      // Add history entry when opening panel
      window.history.pushState({ panel: 'artifacts' }, '')

      return () => {
        window.removeEventListener('popstate', handlePopState)
      }
    }
  }, [isMobile, isRightContentVisible, onClose])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className={cn(
          'h-full transition-transform duration-300 ease-in-out',
          {
            'pr-[65%]': isRightContentVisible && !isMobile,
            'w-full': !isRightContentVisible || isMobile,
            'invisible': isMobile && isRightContentVisible,
          },
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          'absolute top-0 right-0 h-full bg-components-panel-bg border-l border-components-panel-border',
          'flex flex-col transition-transform duration-300 ease-in-out',
          {
            'translate-x-0': isRightContentVisible,
            'translate-x-full': !isRightContentVisible,
            'w-full': isMobile,
            'w-[65%]': !isMobile,
          },
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-components-panel-border">
          <h2 className="text-lg font-medium text-text-primary">{displayTitle}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-state-base-hover"
              aria-label={t('artifact.panel.close')}
            >
              <RiCloseLine className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rightContent}
        </div>
      </div>
    </div>
  )
}

export default SplitViewLayout
