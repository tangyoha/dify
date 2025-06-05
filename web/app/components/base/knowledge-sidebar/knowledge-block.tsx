import React from 'react'
import { useTranslation } from 'react-i18next'
import { RiArrowRightSLine, RiBookOpenLine } from '@remixicon/react'
import { useKnowledge } from './context'

interface KnowledgeBlockProps {
  items: Array<{
    type: 'text' | 'image' | 'link' | 'file' | 'code' | 'faq' | 'webpage' | 'markdown'
    content: string
    title?: string
    source?: string
    caption?: string
    score?: number
    // 内容显示高度配置，适用于所有类型的内容
    webpageHeight?: string | number
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
        className="px-4 py-3 bg-components-panel-bg-blur border border-components-panel-border rounded-lg cursor-pointer hover:bg-state-base-hover transition-colors"
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RiBookOpenLine className="w-4 h-4 text-text-tertiary" />
            <span className="text-sm font-medium text-text-secondary">
              {t('knowledge.relatedKnowledge')}
            </span>
            <span className="text-xs text-text-tertiary">
              ({items.length} {t('knowledge.items')})
            </span>
          </div>
          <RiArrowRightSLine className="w-4 h-4 text-text-quaternary" />
        </div>

        <div className="mt-2 text-sm text-text-tertiary line-clamp-2">
          {items.slice(0, 2).map((item, index) => (
            <div key={index} className="flex items-start space-x-1">
              <span className="text-text-quaternary">•</span>
              <span className="flex-1 truncate">
                {item.type === 'text' ? item.content : t(`knowledge.type.${item.type}`)}
              </span>
            </div>
          ))}
          {items.length > 2 && (
            <div className="text-xs text-text-quaternary">
              {t('knowledge.moreItems', { count: items.length - 2 })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default KnowledgeBlock
