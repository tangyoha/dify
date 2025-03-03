import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import cn from '@/utils/classnames'
import { RiCloseLine, RiPushpinLine } from '@remixicon/react'

interface KnowledgeItem {
  type: 'text' | 'image' | 'link' | 'file' | 'code' | 'faq'
  content: string
  title?: string
  source?: string
  caption?: string
}

interface KnowledgeSidebarProps {
  isOpen: boolean
  isPinned: boolean
  items: KnowledgeItem[]
  onClose: () => void
  onPin: () => void
}

const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({
  isOpen,
  isPinned,
  items,
  onClose,
  onPin,
}) => {
  const { t } = useTranslation()
  const [selectedType, setSelectedType] = useState<string>('all')

  const renderKnowledgeItem = (item: KnowledgeItem) => {
    switch (item.type) {
      case 'text':
        return (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-700">{item.content}</div>
            {item.source && (
              <div className="mt-2 text-xs text-gray-500">
                {t('knowledge.source')}: {item.source}
              </div>
            )}
          </div>
        )
      case 'image':
        return (
          <div className="p-3 bg-gray-50 rounded-lg">
            <img src={item.content} alt={item.caption || ''} className="w-full rounded-lg" />
            {item.caption && (
              <div className="mt-2 text-xs text-gray-500 text-center">{item.caption}</div>
            )}
          </div>
        )
      case 'link':
        return (
          <a
            href={item.content}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <div className="text-sm text-blue-600">{item.content}</div>
            {item.source && (
              <div className="mt-1 text-xs text-gray-500">{item.source}</div>
            )}
          </a>
        )
      case 'file':
        return (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="flex-1 text-sm text-gray-700 truncate">{item.content}</div>
              <button className="ml-2 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">
                {t('knowledge.download')}
              </button>
            </div>
          </div>
        )
      case 'code':
        return (
          <div className="p-3 bg-gray-50 rounded-lg">
            <pre className="text-sm text-gray-700 overflow-x-auto">
              <code>{item.content}</code>
            </pre>
          </div>
        )
      case 'faq':
        return (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700">{item.content}</div>
            {item.source && (
              <div className="mt-2 text-sm text-gray-600">{item.source}</div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed top-16 bottom-0 right-0 w-80 bg-white border-l border-gray-200 transform transition-transform duration-300 ease-in-out z-50',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">{t('knowledge.title')}</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={onPin}
            className={cn(
              'p-1 rounded hover:bg-gray-100',
              isPinned && 'text-blue-600'
            )}
            title={t('knowledge.pin')}
          >
            <RiPushpinLine className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
            title={t('knowledge.close')}
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex space-x-2 mb-4 overflow-x-auto">
          {['all', 'text', 'image', 'link', 'file', 'code', 'faq'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                'px-3 py-1 text-sm rounded-full whitespace-nowrap',
                selectedType === type
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {t(`knowledge.type.${type}`)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {items
            .filter(item => selectedType === 'all' || item.type === selectedType)
            .map((item, index) => (
              <div key={index}>
                {renderKnowledgeItem(item)}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default KnowledgeSidebar 