import React from 'react'
import KnowledgeBlockContent from '../knowledge-sidebar/knowledge-block'

export const KnowledgeBlock = ({ children, ...props }: any) => {
  // If no data-knowledge attribute, render as normal section
  if (!props['data-knowledge'])
    return <section {...props}>{children}</section>

  try {
    const encodedData = props['data-knowledge']
    const decodedData = Buffer.from(encodedData, 'base64').toString()
    const items = JSON.parse(decodedData)

    if (!Array.isArray(items)) {
      console.error('Knowledge content must be an array')
      return null
    }

    return <KnowledgeBlockContent items={items} />
  }
  catch (error) {
    console.error('Failed to parse knowledge items:', error)
    return null
  }
}

export default KnowledgeBlock 