import React, { useEffect, useState } from 'react'
import { Code, Copy, Download, ExternalLink, Maximize2, Minimize2, Play } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import Flowchart from '@/app/components/base/mermaid'
import useTheme from '@/hooks/use-theme'
import { Theme } from '@/types/app'
import cn from '@/utils/classnames'
import SidebarWebpageDisplay from './sidebar-webpage-display'

export type ArtifactType = 'code' | 'markdown' | 'html' | 'svg' | 'mermaid' | 'react' | 'webpage'
export interface Artifact {
  id: string
  title: string
  type: ArtifactType
  content: string
  language?: string
  source?: string
  score?: number
  createdAt: Date
  updatedAt: Date
  version: number
  webpageHeight?: string | number
}

interface ArtifactDisplayProps {
  artifact: Artifact
  compact?: boolean
}

// Helper function to check if a string is a URL
const isValidUrl = (str: string): boolean => {
  try {
    const url = new URL(str.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    return false
  }
}

// Helper function to convert height prop to CSS class or style
const getHeightStyle = (height?: string | number) => {
  if (!height)
    return { className: 'h-[600px]' }

  if (typeof height === 'number')
    return { style: { height: `${height}px` } }

  if (height === 'full')
    return { className: 'h-full w-full' }

  if (height.includes('vh') || height.includes('%'))
    return { style: { height } }

  if (height.startsWith('h-'))
    return { className: height }

  return { style: { height } }
}

// Helper function to create error fallback UI
const createErrorFallback = (url: string, containerId: string) => {
  return `
    <div class="flex items-center justify-center h-full bg-components-panel-bg-blur text-text-tertiary text-sm">
      <div class="text-center p-4">
        <div class="mb-2">网页加载失败</div>
        <div class="text-xs mb-4">可能是由于网站的安全策略限制（X-Frame-Options）</div>
        <button
          onclick="window.open('${url}', '_blank')"
          class="px-3 py-1 bg-state-accent-active text-text-accent rounded text-xs hover:opacity-80 transition-opacity"
        >
          在新标签页打开
        </button>
      </div>
    </div>
  `
}

const createMarkdownComponents = (currentTheme: string, webpageHeight?: string | number) => ({
  // Add syntax highlighting for code blocks
  code: ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : ''
    const content = String(children).trim()

    // Handle mermaid diagrams specially
    if (!inline && language === 'mermaid') {
      return (
        <div className="my-4">
          <Flowchart PrimitiveCode={content} theme={currentTheme === Theme.dark ? 'dark' : 'light'} />
        </div>
      )
    }

    // Handle HTML code blocks that contain URLs
    if (!inline && language === 'html' && isValidUrl(content)) {
      const heightProps = getHeightStyle(webpageHeight)
        const containerId = `iframe-container-${Math.random().toString(36).substr(2, 9)}`

      return (
        <div className="my-4 border border-components-panel-border rounded-md overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-components-panel-bg-blur border-b border-components-panel-border">
            <span className="text-sm text-text-secondary truncate flex-1 mr-4">{content}</span>
            <button
              onClick={() => window.open(content, '_blank')}
              className="p-1 hover:bg-state-base-hover rounded transition-colors duration-200 flex-shrink-0"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>
          <div className="relative" id={containerId}>
            <iframe
              src={content}
              title='Embedded Webpage'
              className={cn('w-full bg-white border-0', heightProps.className)}
              style={heightProps.style}
              sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation allow-modals allow-downloads'
              loading='lazy'
              referrerPolicy='no-referrer-when-downgrade'
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'
              onLoad={(e) => {
                console.log('Embedded webpage loaded successfully:', content)
              }}
              onError={(e) => {
                console.warn('Failed to load embedded webpage in iframe:', content)
                  try {
                const iframe = e.target as HTMLIFrameElement
                    const container = document.getElementById(containerId)

                    if (container && iframe.parentNode) {
                      // Hide the iframe
                      iframe.style.display = 'none'

                      // Create error fallback
                const errorDiv = document.createElement('div')
                      errorDiv.className = 'absolute inset-0'
                      errorDiv.innerHTML = createErrorFallback(content, containerId)

                      container.appendChild(errorDiv)
                    }
                  }
                  catch (error) {
                    console.error('Error handling iframe failure:', error)
                }
              }}
            />
            <div className="absolute inset-0 pointer-events-none bg-transparent opacity-0 hover:opacity-5 transition-opacity duration-200 bg-black"></div>
          </div>
        </div>
      )
    }

    return !inline ? (
      <div className="my-4 relative">
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <button
            onClick={() => navigator.clipboard.writeText(content)}
            className="p-1 hover:bg-state-base-hover rounded transition-colors"
            title="Copy code"
          >
            <Copy className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>
        <SyntaxHighlighter
          style={vs2015}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: '6px',
          }}
          wrapLongLines={true}
          {...props}
        >
          {content.replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className="px-1.5 py-0.5 rounded-md bg-components-panel-bg-blur text-text-secondary text-sm font-mono break-all" {...props}>
        {children}
      </code>
    )
  },
  // Enhance links with better wrapping
  a: ({ node, children, href, ...props }: any) => (
    <a
      className="text-text-accent hover:underline break-all"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  // Style headings with better text wrapping
  h1: ({ node, children, ...props }: any) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-components-panel-border text-text-primary break-words" {...props}>
      {children}
    </h1>
  ),
  h2: ({ node, children, ...props }: any) => (
    <h2 className="text-xl font-bold mt-5 mb-3 text-text-primary break-words" {...props}>
      {children}
    </h2>
  ),
  h3: ({ node, children, ...props }: any) => (
    <h3 className="text-lg font-semibold mt-4 mb-2 text-text-primary break-words" {...props}>
      {children}
    </h3>
  ),
  // Style paragraphs with better text wrapping
  p: ({ node, children, ...props }: any) => (
    <p className="my-3 leading-relaxed text-text-secondary break-words whitespace-pre-wrap" {...props}>
      {children}
    </p>
  ),
  // Add horizontal scrolling for tables
  table: ({ node, children, ...props }: any) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-components-panel-border" {...props}>
        {children}
      </table>
    </div>
  ),
  // Style pre blocks
  pre: ({ node, children, ...props }: any) => (
    <pre className="overflow-x-auto" {...props}>
      {children}
    </pre>
  ),
  // Style lists
  ul: ({ node, children, ...props }: any) => (
    <ul className="list-disc list-inside my-4 space-y-2 text-text-secondary" {...props}>
      {children}
    </ul>
  ),
  ol: ({ node, children, ...props }: any) => (
    <ol className="list-decimal list-inside my-4 space-y-2 text-text-secondary" {...props}>
      {children}
    </ol>
  ),
  // Style blockquotes
  blockquote: ({ node, children, ...props }: any) => (
    <blockquote className="border-l-4 border-components-panel-border pl-4 my-4 italic text-text-tertiary" {...props}>
      {children}
    </blockquote>
  ),
})

const ArtifactDisplay: React.FC<ArtifactDisplayProps> = ({
  artifact,
  compact = false,
}) => {
  // 直接从 artifact 对象中获取 webpageHeight
  const webpageHeight = artifact.webpageHeight
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const { theme } = useTheme()

  const copyToClipboard = () => {
    navigator.clipboard.writeText(artifact.content)
  }

  const downloadArtifact = () => {
    // Skip download for webpage type
    if (artifact.type === 'webpage') {
      window.open(artifact.content, '_blank')
      return
    }

    const element = document.createElement('a')
    let filename = `${artifact.title.replace(/\s+/g, '-').toLowerCase()}`
    let mimeType = 'text/plain'

    switch (artifact.type) {
      case 'code':
        filename += artifact.language ? `.${artifact.language}` : '.txt'
        break
      case 'markdown':
        filename += '.md'
        break
      case 'html':
        filename += '.html'
        mimeType = 'text/html'
        break
      case 'svg':
        filename += '.svg'
        mimeType = 'image/svg+xml'
        break
      case 'mermaid':
        filename += '.mmd'
        break
      case 'react':
        filename += '.jsx'
        break
    }

    const blob = new Blob([artifact.content], { type: mimeType })
    element.href = URL.createObjectURL(blob)
    element.download = filename
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const renderContent = () => {
    if (isCollapsed) return null

    if (showSource && ['html', 'svg', 'mermaid', 'react'].includes(artifact.type)) {
      return (
        <SyntaxHighlighter
          language={artifact.type === 'html' ? 'html' : artifact.type === 'svg' ? 'xml' : artifact.type === 'react' ? 'jsx' : 'text'}
          style={vs2015}
          showLineNumbers
          customStyle={{ borderRadius: '0.375rem', marginTop: '0.5rem' }}
        >
          {artifact.content}
        </SyntaxHighlighter>
      )
    }

    switch (artifact.type) {
      case 'code':
        return (
          <SyntaxHighlighter
            language={artifact.language || 'javascript'}
            style={vs2015}
            showLineNumbers
            customStyle={{ borderRadius: '0.375rem', marginTop: '0.5rem' }}
          >
            {artifact.content}
          </SyntaxHighlighter>
        )

      case 'markdown':
        return (
          <div className="p-6 bg-components-panel-bg overflow-x-auto">
            <div className="max-w-full">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={createMarkdownComponents(theme, webpageHeight)}
                className="markdown-content"
              >
                {artifact.content}
              </ReactMarkdown>
            </div>
          </div>
        )

      case 'html':
        return (
          <div className="mt-2 border border-components-panel-border rounded-md overflow-hidden">
            <iframe
              srcDoc={artifact.content}
              title={artifact.title}
              className="w-full h-64 bg-components-panel-bg"
              sandbox="allow-scripts"
            />
          </div>
        )

      case 'svg':
        return (
          <div className="mt-2 p-4 bg-components-panel-bg rounded-md border border-components-panel-border flex justify-center">
            <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
          </div>
        )

      case 'mermaid':
        return (
          <div className="mt-2 bg-components-panel-bg rounded-md border border-components-panel-border">
            <Flowchart PrimitiveCode={artifact.content} theme={theme === Theme.dark ? 'dark' : 'light'} />
          </div>
        )

      case 'react':
        return (
          <div className="mt-2 p-4 bg-components-panel-bg rounded-md border border-components-panel-border">
            <div className="text-center text-text-tertiary">
              [React component would render here]
            </div>
          </div>
        )

      case 'webpage': {
        const heightProps = getHeightStyle(webpageHeight)
        const isFullHeight = webpageHeight === 'full'

        if (compact) {
          return (
          <SidebarWebpageDisplay
            url={artifact.content}
            title={artifact.title}
            height={typeof webpageHeight === 'string' && webpageHeight.startsWith('h-') ? webpageHeight : 'h-96'}
          />
          )
        }

        if (iframeError) {
          return (
            <div className={cn(
              'mt-2 border border-components-panel-border rounded-md overflow-hidden',
              isFullHeight && 'flex flex-col h-full',
            )}>
              <div className='flex items-center justify-between p-3 bg-components-panel-bg-blur border-b border-components-panel-border flex-shrink-0'>
                <span className='text-sm text-text-secondary truncate flex-1 mr-4'>{artifact.content}</span>
                <button
                  onClick={() => window.open(artifact.content, '_blank')}
                  className='p-1 hover:bg-state-base-hover rounded transition-colors duration-200 flex-shrink-0'
                  title='Open in new tab'
                >
                  <ExternalLink className='w-4 h-4 text-text-tertiary' />
                </button>
              </div>
              <div className={cn('relative flex items-center justify-center', isFullHeight ? 'flex-1' : 'h-[600px]')}>
                <div className="text-center p-8">
                  <div className="mb-4 text-text-tertiary text-lg">🚫</div>
                  <div className="mb-2 text-text-secondary">网页无法在框架中显示</div>
                  <div className="text-xs text-text-tertiary mb-4">该网站设置了安全策略限制（X-Frame-Options）</div>
                  <button
                    onClick={() => window.open(artifact.content, '_blank')}
                    className="px-4 py-2 bg-state-accent-active text-text-accent rounded hover:opacity-80 transition-opacity"
                  >
                    在新标签页打开
                  </button>
                </div>
              </div>
            </div>
          )
        }

        return (
          <div className={cn(
            'mt-2 border border-components-panel-border rounded-md overflow-hidden',
            isFullHeight && 'flex flex-col h-full',
          )}>
            <div className='flex items-center justify-between p-3 bg-components-panel-bg-blur border-b border-components-panel-border flex-shrink-0'>
              <span className='text-sm text-text-secondary truncate flex-1 mr-4'>{artifact.content}</span>
              <button
                onClick={() => window.open(artifact.content, '_blank')}
                className='p-1 hover:bg-state-base-hover rounded transition-colors duration-200 flex-shrink-0'
                title='Open in new tab'
              >
                <ExternalLink className='w-4 h-4 text-text-tertiary' />
              </button>
            </div>
            <div className={cn('relative', isFullHeight && 'flex-1')}>
              <iframe
                src={artifact.content}
                title={artifact.title}
                className={cn('w-full bg-white border-0', heightProps.className)}
                style={heightProps.style}
                sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation allow-modals allow-downloads'
                loading='lazy'
                referrerPolicy='no-referrer-when-downgrade'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'
                onLoad={(e) => {
                  console.log('Webpage loaded successfully:', artifact.content)
                  setIframeError(false)
                }}
                onError={(e) => {
                  console.warn('Failed to load webpage in iframe:', artifact.content)
                  setIframeError(true)
                }}
              />
              <div className='absolute inset-0 pointer-events-none bg-transparent opacity-0 hover:opacity-5 transition-opacity duration-200 bg-black'></div>
            </div>
          </div>
        )
      }

      default:
        return <div className="mt-2 p-4 bg-components-panel-bg-blur rounded-md">{artifact.content}</div>
    }
  }

  const renderActionButtons = () => {
    const buttons = []

    if (['html', 'svg', 'mermaid', 'react'].includes(artifact.type)) {
      buttons.push(
          <button
            key="source"
            onClick={() => setShowSource(!showSource)}
            className="p-1 hover:bg-state-base-hover rounded transition-colors duration-200"
            title={showSource ? 'View rendered' : 'View source'}
          >
            <Code className="w-4 h-4 text-text-tertiary" />
          </button>,
        )
    }

    if (artifact.type === 'code') {
      buttons.push(
        <button
          key="execute"
          onClick={() => console.log('Code execution would happen here')}
          className="p-1 hover:bg-state-base-hover rounded transition-colors duration-200"
          title="Execute code"
        >
          <Play className="w-4 h-4 text-text-tertiary" />
        </button>,
      )
    }

    buttons.push(
      <button
        key="copy"
        onClick={copyToClipboard}
        className="p-1 hover:bg-state-base-hover rounded transition-colors duration-200"
        title="Copy to clipboard"
      >
        <Copy className="w-4 h-4 text-text-tertiary" />
      </button>,
    )

    // For webpage type, the download button opens the URL in a new tab
    buttons.push(
      <button
        key="download"
        onClick={downloadArtifact}
        className="p-1 hover:bg-state-base-hover rounded transition-colors duration-200"
        title={artifact.type === 'webpage' ? 'Open in new tab' : 'Download'}
      >
        {artifact.type === 'webpage' ? (
          <ExternalLink className="w-4 h-4 text-text-tertiary" />
        ) : (
          <Download className="w-4 h-4 text-text-tertiary" />
        )}
      </button>,
    )

    buttons.push(
      <button
        key="collapse"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="rounded p-1 transition-colors duration-200 hover:bg-state-base-hover"
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? (
          <Maximize2 className="h-4 w-4 text-text-tertiary" />
        ) : (
          <Minimize2 className="h-4 w-4 text-text-tertiary" />
        )}
      </button>,
    )

    return buttons
  }

  const getTypeLabel = () => {
    switch (artifact.type) {
      case 'code':
        return artifact.language ? artifact.language.toUpperCase() : 'CODE'
      case 'markdown':
        return 'MD'
      case 'html':
        return 'HTML'
      case 'svg':
        return 'SVG'
      case 'mermaid':
        return 'DIAGRAM'
      case 'react':
        return 'REACT'
      case 'webpage':
        return 'WEBPAGE'
      default:
        return String(artifact.type).toUpperCase()
    }
  }

  useEffect(() => {
    // Reset iframe error state when artifact content changes
    setIframeError(false)
  }, [artifact.content])

  const isFullHeightWebpage = artifact.type === 'webpage' && webpageHeight === 'full'

  return (
    <div className={cn(
      'overflow-hidden rounded-lg border border-components-panel-border bg-components-panel-bg',
      'transition-colors duration-200 hover:border-components-panel-border-subtle',
      isFullHeightWebpage && 'h-full flex flex-col',
    )}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-components-panel-border bg-components-panel-bg-blur p-2">
        <div className="flex min-w-0 flex-shrink flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-text-primary truncate max-w-[300px]">{artifact.title}</h3>
            {artifact.score !== undefined && (
              <div className="flex-shrink-0">
                <span className="px-2 py-0.5 text-xs font-medium bg-state-accent-active text-text-accent rounded">
                  Score: {(artifact.score * 100).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-1 flex-shrink-0">
          {renderActionButtons()}
        </div>
      </div>
      <div className={cn(isFullHeightWebpage && 'flex-1 overflow-hidden')}>
        {renderContent()}
      </div>
    </div>
  )
}

export default ArtifactDisplay
