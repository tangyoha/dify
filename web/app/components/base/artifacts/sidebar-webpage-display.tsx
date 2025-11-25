import React, { useEffect, useRef, useState } from 'react'
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import cn from '@/utils/classnames'

type SidebarWebpageDisplayProps = {
  url: string
  title?: string
  height?: string
}

const SidebarWebpageDisplay: React.FC<SidebarWebpageDisplayProps> = ({
  url,
  title = '网页',
  height = 'h-96',
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleIframeLoad = () => {
    setIsLoading(false)
    setHasError(false)
    console.log('Webpage loaded successfully:', url)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setHasError(true)
    setErrorMessage('网页加载失败，可能是由于安全策略限制')
    console.warn('Failed to load webpage in iframe:', url)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setHasError(false)
    if (iframeRef.current)
      iframeRef.current.src = url
  }

  const openInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // 检查URL是否可能被iframe阻止
  const isLikelyBlocked = (url: string) => {
    const blockedDomains = ['baidu.com', 'google.com', 'facebook.com', 'youtube.com', 'github.com']
    return blockedDomains.some(domain => url.includes(domain))
  }

  useEffect(() => {
    // 对于已知会被阻止的域名，直接显示错误状态
    if (isLikelyBlocked(url)) {
      setIsLoading(false)
      setHasError(true)
      setErrorMessage('此网站不允许在框架中显示，请点击"新标签页打开"')
    }
  }, [url])

  return (
    <div className="overflow-hidden rounded-lg border border-components-panel-border bg-components-panel-bg">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-components-panel-border bg-components-panel-bg-blur p-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-text-primary">{title}</div>
          <div className="truncate text-xs text-text-tertiary">{url}</div>
        </div>
        <div className="ml-2 flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="rounded p-1 transition-colors hover:bg-state-base-hover"
            title="刷新"
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-3 w-3 text-text-tertiary', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={openInNewTab}
            className="rounded p-1 transition-colors hover:bg-state-base-hover"
            title="在新标签页打开"
          >
            <ExternalLink className="h-3 w-3 text-text-tertiary" />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className={cn('relative', height)}>
        {!hasError && !isLikelyBlocked(url) && (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-components-panel-bg-blur">
                <div className="flex flex-col items-center gap-2 text-text-tertiary">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <div className="text-sm">加载中...</div>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={url}
              title={title}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </>
        )}

        {(hasError || isLikelyBlocked(url)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-components-panel-bg-blur">
            <div className="p-4 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-text-tertiary" />
              <div className="mb-2 text-sm text-text-secondary">网页无法显示</div>
              <div className="mb-3 max-w-48 text-xs text-text-tertiary">
                {errorMessage || '网站安全策略不允许在框架中显示'}
              </div>
              <button
                onClick={openInNewTab}
                className="rounded bg-state-accent-active px-3 py-1 text-xs text-text-accent transition-opacity hover:opacity-80"
              >
                在新标签页打开
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="bg-components-panel-bg-blur px-2 py-1 text-xs text-text-tertiary">
        💡 某些网站可能无法在框架中显示
      </div>
    </div>
  )
}

export default SidebarWebpageDisplay
