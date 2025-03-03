import React from 'react'
import { useTranslation } from 'react-i18next'
import cn from '@/utils/classnames'
import { RiArrowRightSLine, RiBookOpenLine } from '@remixicon/react'
import { useKnowledge } from './context'

interface KnowledgeBlockProps {
  items: Array<{
    type: 'text' | 'image' | 'link' | 'file' | 'code' | 'faq'
    content: string
    title?: string
    source?: string
    caption?: string
  }>
}

const KnowledgeBlock: React.FC<KnowledgeBlockProps> = ({ items }) => {
  const { t } = useTranslation()
  const { openSidebar, setItems } = useKnowledge()

  const handleClick = () => {
    setItems(items)
    openSidebar()
  }

  return (
    <div className="my-2">
      <div
        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RiBookOpenLine className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {t('knowledge.relatedKnowledge')}
            </span>
            <span className="text-xs text-gray-500">
              ({items.length} {t('knowledge.items')})
            </span>
          </div>
          <RiArrowRightSLine className="w-4 h-4 text-gray-400" />
        </div>

        <div className="mt-2 text-sm text-gray-600 line-clamp-2">
          {items.slice(0, 2).map((item, index) => (
            <div key={index} className="flex items-start space-x-1">
              <span className="text-gray-400">•</span>
              <span className="flex-1 truncate">
                {item.type === 'text' ? item.content : t(`knowledge.type.${item.type}`)}
              </span>
            </div>
          ))}
          {items.length > 2 && (
            <div className="text-xs text-gray-400">
              {t('knowledge.moreItems', { count: items.length - 2 })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default KnowledgeBlock 