import React, { useState } from 'react'
import { Code, Copy, Download, Maximize2, Minimize2, Play } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import cn from '@/utils/classnames'

export type ArtifactType = 'code' | 'markdown' | 'html' | 'svg' | 'mermaid' | 'react'

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
}

interface ArtifactDisplayProps {
  artifact: Artifact
}

const MarkdownComponents = {
  // Add syntax highlighting for code blocks
  code: ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : ''
    
    return !inline ? (
      <div className="my-4 relative">
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <button
            onClick={() => navigator.clipboard.writeText(String(children))}
            className="p-1 hover:bg-gray-700/50 rounded transition-colors"
            title="Copy code"
          >
            <Copy className="w-4 h-4 text-gray-400" />
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
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-800 text-sm font-mono break-all" {...props}>
        {children}
      </code>
    )
  },
  // Enhance links with better wrapping
  a: ({ node, children, href, ...props }: any) => (
    <a 
      className="text-primary-600 hover:underline break-all" 
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
    <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-gray-200 break-words" {...props}>
      {children}
    </h1>
  ),
  h2: ({ node, children, ...props }: any) => (
    <h2 className="text-xl font-bold mt-5 mb-3 break-words" {...props}>
      {children}
    </h2>
  ),
  h3: ({ node, children, ...props }: any) => (
    <h3 className="text-lg font-semibold mt-4 mb-2 break-words" {...props}>
      {children}
    </h3>
  ),
  // Style paragraphs with better text wrapping
  p: ({ node, children, ...props }: any) => (
    <p className="my-3 leading-relaxed text-gray-700 break-words whitespace-pre-wrap" {...props}>
      {children}
    </p>
  ),
  // Add horizontal scrolling for tables
  table: ({ node, children, ...props }: any) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200" {...props}>
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
    <ul className="list-disc list-inside my-4 space-y-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ node, children, ...props }: any) => (
    <ol className="list-decimal list-inside my-4 space-y-2" {...props}>
      {children}
    </ol>
  ),
  // Style blockquotes
  blockquote: ({ node, children, ...props }: any) => (
    <blockquote className="border-l-4 border-gray-200 pl-4 my-4 italic text-gray-700" {...props}>
      {children}
    </blockquote>
  ),
}

const ArtifactDisplay: React.FC<ArtifactDisplayProps> = ({ artifact }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showSource, setShowSource] = useState(false)
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(artifact.content)
  }
  
  const downloadArtifact = () => {
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
          <div className="p-6 bg-white overflow-x-auto">
            <div className="max-w-full">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={MarkdownComponents}
                className="markdown-content"
              >
                {artifact.content}
              </ReactMarkdown>
            </div>
          </div>
        )
      
      case 'html':
        return (
          <div className="mt-2 border border-gray-100 rounded-md overflow-hidden">
            <iframe
              srcDoc={artifact.content}
              title={artifact.title}
              className="w-full h-64 bg-white"
              sandbox="allow-scripts"
            />
          </div>
        )
      
      case 'svg':
        return (
          <div className="mt-2 p-4 bg-white rounded-md border border-gray-100 flex justify-center">
            <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
          </div>
        )
      
      case 'mermaid':
        return (
          <div className="mt-2 p-4 bg-white rounded-md border border-gray-100">
            <div className="text-center text-gray-500">
              [Mermaid diagram would render here]
            </div>
            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
              {artifact.content}
            </pre>
          </div>
        )
      
      case 'react':
        return (
          <div className="mt-2 p-4 bg-white rounded-md border border-gray-100">
            <div className="text-center text-gray-500">
              [React component would render here]
            </div>
          </div>
        )
      
      default:
        return <div className="mt-2 p-4 bg-gray-50 rounded-md">{artifact.content}</div>
    }
  }
  
  const renderActionButtons = () => {
    const buttons = []
    
    if (['html', 'svg', 'mermaid', 'react'].includes(artifact.type)) {
      buttons.push(
        <button
          key="source"
          onClick={() => setShowSource(!showSource)}
          className="p-1 hover:bg-gray-50 rounded transition-colors duration-200"
          title={showSource ? "View rendered" : "View source"}
        >
          <Code className="w-4 h-4 text-gray-500" />
        </button>
      )
    }
    
    if (artifact.type === 'code') {
      buttons.push(
        <button
          key="execute"
          onClick={() => alert('Code execution would happen here')}
          className="p-1 hover:bg-gray-50 rounded transition-colors duration-200"
          title="Execute code"
        >
          <Play className="w-4 h-4 text-gray-500" />
        </button>
      )
    }
    
    buttons.push(
      <button
        key="copy"
        onClick={copyToClipboard}
        className="p-1 hover:bg-gray-50 rounded transition-colors duration-200"
        title="Copy to clipboard"
      >
        <Copy className="w-4 h-4 text-gray-500" />
      </button>
    )
    
    buttons.push(
      <button
        key="download"
        onClick={downloadArtifact}
        className="p-1 hover:bg-gray-50 rounded transition-colors duration-200"
        title="Download"
      >
        <Download className="w-4 h-4 text-gray-500" />
      </button>
    )
    
    buttons.push(
      <button
        key="collapse"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-1 hover:bg-gray-50 rounded transition-colors duration-200"
        title={isCollapsed ? "Expand" : "Collapse"}
      >
        {isCollapsed ? (
          <Maximize2 className="w-4 h-4 text-gray-500" />
        ) : (
          <Minimize2 className="w-4 h-4 text-gray-500" />
        )}
      </button>
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
      default:
        return String(artifact.type).toUpperCase()
    }
  }
  
  return (
    <div className={cn(
      'border border-gray-100 rounded-lg overflow-hidden bg-white',
      'hover:border-primary-100 transition-colors duration-200'
    )}>
      <div className="sticky top-0 z-10 flex items-center justify-between p-2 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-col gap-1 min-w-0 flex-shrink">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-700 truncate max-w-[300px]">{artifact.title}</h3>
            {artifact.score !== undefined && (
              <div className="flex-shrink-0">
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
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
      {renderContent()}
    </div>
  )
}

export default ArtifactDisplay 