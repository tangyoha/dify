import React, { useEffect, useState } from 'react'
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine, RiGridFill, RiListUnordered } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import cn from '@/utils/classnames'
import ArtifactDisplay from './artifact-display'
import type { Artifact } from './artifact-display'

type ArtifactsPanelProps = {
  artifacts: Artifact[]
  isOpen: boolean
  onClose: () => void
  isMobile?: boolean
}

const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({
  artifacts,
  isOpen,
  onClose,
  isMobile = false,
}) => {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(isMobile ? 'grid' : 'list')
  const [isListCollapsed, setIsListCollapsed] = useState(false)
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)

  // Update selected artifact when artifacts change
  useEffect(() => {
    if (artifacts.length > 0 && (!selectedArtifactId || !artifacts.find(a => a.id === selectedArtifactId)))
      setSelectedArtifactId(artifacts[0].id)
  }, [artifacts, selectedArtifactId])

  // Reset view mode when switching between mobile and desktop
  useEffect(() => {
    setViewMode(isMobile ? 'grid' : 'list')
  }, [isMobile])

  if (!isOpen) return null

  const selectedArtifact = artifacts.find(a => a.id === selectedArtifactId)

  const handleArtifactClick = (artifactId: string) => {
    setSelectedArtifactId(artifactId)
    if (isMobile) setViewMode('list')
  }

  if (!selectedArtifact) return null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between border-b border-components-panel-border',
        isMobile ? 'p-1' : 'p-2',
      )}>
        <div className="flex items-center space-x-2">
          {!isMobile && (
            <>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded p-1 text-text-secondary transition-colors',
                  viewMode === 'list'
                    ? 'bg-state-accent-active text-text-accent'
                    : 'hover:bg-state-base-hover hover:text-text-primary',
                )}
                title={t('artifact.panel.listView')}
              >
                <RiListUnordered className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded p-1 text-text-secondary transition-colors',
                  viewMode === 'grid'
                    ? 'bg-state-accent-active text-text-accent'
                    : 'hover:bg-state-base-hover hover:text-text-primary',
                )}
                title={t('artifact.panel.gridView')}
              >
                <RiGridFill className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary transition-colors hover:bg-state-base-hover hover:text-text-primary"
            aria-label={t('artifact.panel.close')}
            title={t('artifact.panel.close')}
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Artifacts list/grid sidebar */}
        <div
          className={cn(
            'overflow-y-auto transition-all duration-200',
            {
              'border-r border-components-panel-border': !isMobile && viewMode === 'list',
              'w-12': !isMobile && viewMode === 'list' && isListCollapsed,
              'w-60': !isMobile && viewMode === 'list' && !isListCollapsed,
              'w-full px-4 py-2': viewMode === 'grid' || isMobile,
              'hidden': isMobile && viewMode === 'list',
            },
          )}
        >
          {/* Only show collapse button in desktop list view */}
          {!isMobile && viewMode === 'list' && (
            <button
              onClick={() => setIsListCollapsed(!isListCollapsed)}
              className="flex w-full justify-center border-b border-components-panel-border p-1 text-text-secondary transition-colors hover:bg-state-base-hover hover:text-text-primary"
              title={isListCollapsed ? t('artifact.panel.expand') : t('artifact.panel.collapse')}
            >
              {isListCollapsed ? (
                <RiArrowRightSLine className="h-4 w-4" />
              ) : (
                <RiArrowLeftSLine className="h-4 w-4" />
              )}
            </button>
          )}
          <div className={cn(
            viewMode === 'grid' ? 'grid gap-2' : 'p-2',
            {
              'grid-cols-2 px-2 py-1': isMobile && viewMode === 'grid',
              'grid-cols-3 lg:grid-cols-4 gap-4 px-4 py-2': !isMobile && viewMode === 'grid',
              'px-0': viewMode === 'list',
            },
          )}>
            {artifacts.map(artifact => (
              <div
                key={artifact.id}
                onClick={() => handleArtifactClick(artifact.id)}
                className={cn(
                  viewMode === 'list'
                    ? 'mb-1 p-2'
                    : cn(
                      'flex h-full flex-col items-center text-center',
                      isMobile ? 'p-2' : 'p-4',
                    ),
                  selectedArtifactId === artifact.id ? 'border-text-accent bg-state-accent-active' : 'hover:bg-state-base-hover',
                  'cursor-pointer rounded-md border border-components-panel-border transition-colors',
                )}
              >
                {/* Show full content in grid view or when list is not collapsed */}
                {(viewMode === 'grid' || !isListCollapsed) && (
                  <div className={cn(
                    'flex w-full flex-col gap-1',
                    viewMode === 'grid' ? 'items-center' : '',
                  )}>
                    <div className={cn(
                      'max-w-full truncate font-medium text-text-primary',
                      isMobile && viewMode === 'grid' ? 'text-xs' : 'text-sm',
                    )}>
                      {artifact.title}
                    </div>
                    {artifact.score !== undefined && (
                      <div className="inline-flex">
                        <span className={cn(
                          'rounded bg-state-accent-active px-2 py-0.5 font-medium text-text-accent',
                          isMobile ? 'text-[10px]' : 'text-xs',
                        )}>
                          {(artifact.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {/* Only show mini view in list mode when collapsed */}
                {viewMode === 'list' && isListCollapsed && (
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-components-panel-bg-blur text-xs font-medium text-text-secondary" title={artifact.title}>
                    {artifact.title.charAt(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selected artifact detail view */}
        {((viewMode === 'list' && selectedArtifact) || (isMobile && viewMode === 'list')) && (
          <div className={cn(
            'flex-1 overflow-y-auto',
            {
              'fixed inset-0 z-50 bg-components-panel-bg': isMobile && viewMode === 'list',
            },
          )}>
            {isMobile && viewMode === 'list' && (
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-components-panel-border bg-components-panel-bg p-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-state-base-hover hover:text-text-primary"
                >
                  <RiArrowLeftSLine className="h-5 w-5" />
                </button>
                <h2 className="max-w-[200px] truncate text-sm font-medium text-text-primary">{selectedArtifact.title}</h2>
                <div className="w-8" /> {/* Spacer for alignment */}
              </div>
            )}
            <ArtifactDisplay artifact={selectedArtifact} />
          </div>
        )}
      </div>
    </div>
  )
}

export default ArtifactsPanel
