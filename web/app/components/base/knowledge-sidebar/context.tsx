import React, { createContext, useCallback, useContext, useState } from 'react'

interface KnowledgeItem {
  type: 'text' | 'image' | 'link' | 'file' | 'code' | 'faq' | 'webpage' | 'markdown'
  content: string
  title?: string
  source?: string
  caption?: string
  score?: number
  // 内容显示高度配置，适用于所有类型的内容
  webpageHeight?: string | number
}

interface KnowledgeContextType {
  isOpen: boolean
  isPinned: boolean
  items: KnowledgeItem[]
  setItems: (items: KnowledgeItem[]) => void
  openSidebar: () => void
  closeSidebar: () => void
  togglePin: () => void
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined)

export const KnowledgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [items, setItems] = useState<KnowledgeItem[]>([])

  const openSidebar = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeSidebar = useCallback(() => {
    if (!isPinned)
      setIsOpen(false)
  }, [isPinned])

  const togglePin = useCallback(() => {
    setIsPinned(prev => !prev)
  }, [])

  return (
    <KnowledgeContext.Provider
      value={{
        isOpen,
        isPinned,
        items,
        setItems,
        openSidebar,
        closeSidebar,
        togglePin,
      }}
    >
      {children}
    </KnowledgeContext.Provider>
  )
}

export const useKnowledge = () => {
  const context = useContext(KnowledgeContext)
  if (context === undefined)
    throw new Error('useKnowledge must be used within a KnowledgeProvider')

  return context
}

export default KnowledgeContext
