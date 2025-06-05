/**
 * @fileoverview Utility functions for preprocessing Markdown content.
 * These functions were extracted from the main markdown renderer for better separation of concerns.
 * Includes preprocessing for LaTeX and custom "think" tags.
 */
import { flow } from 'lodash-es'

export const preprocessLaTeX = (content: string) => {
  if (typeof content !== 'string')
    return content

  const codeBlockRegex = /```[\s\S]*?```/g
  const codeBlocks = content.match(codeBlockRegex) || []
  let processedContent = content.replace(codeBlockRegex, 'CODE_BLOCK_PLACEHOLDER')

  processedContent = flow([
    (str: string) => str.replace(/\\\[(.*?)\\\]/g, (_, equation) => `$$${equation}$$`),
    (str: string) => str.replace(/\\\[([\s\S]*?)\\\]/g, (_, equation) => `$$${equation}$$`),
    (str: string) => str.replace(/\\\((.*?)\\\)/g, (_, equation) => `$$${equation}$$`),
    (str: string) => str.replace(/(^|[^\\])\$(.+?)\$/g, (_, prefix, equation) => `${prefix}$${equation}$`),
  ])(processedContent)

  codeBlocks.forEach((block) => {
    processedContent = processedContent.replace('CODE_BLOCK_PLACEHOLDER', block)
  })

  return processedContent
}

export const preprocessThinkTag = (content: string) => {
  const thinkOpenTagRegex = /<think>\n/g
  const thinkCloseTagRegex = /\n<\/think>/g
  return flow([
    (str: string) => str.replace(thinkOpenTagRegex, '<details data-think=true>\n'),
    (str: string) => str.replace(thinkCloseTagRegex, '\n[ENDTHINKFLAG]</details>'),
    (str: string) => str.replace(/(<\/details>)(?![^\S\r\n]*[\r\n])(?![^\S\r\n]*$)/g, '$1\n'),
  ])(content)
}

export const preprocessKnowledgeTag = (content: string) => {
  return flow([
    (str: string) => str.replace(
      /<knowledge>\s*([\s\S]*?)\s*<\/knowledge>/g,
      (_, jsonContent) => {
        try {
          if (!jsonContent || jsonContent.trim() === '') {
            console.error('Empty knowledge content')
            return ''
          }
          // Remove any leading/trailing whitespace and normalize JSON string
          const normalizedJson = jsonContent.trim()
          const items = JSON.parse(normalizedJson)
          if (!Array.isArray(items)) {
            console.error('Knowledge content must be an array')
            return ''
          }
          // Use section tag with base64 encoded data to avoid JSON parsing issues
          const encodedData = Buffer.from(JSON.stringify(items)).toString('base64')
          return `<section data-knowledge="${encodedData}"></section>`
        }
        catch (error) {
          console.error('Failed to parse knowledge items:', error, jsonContent)
          return ''
        }
      },
    ),
  ])(content)
}
