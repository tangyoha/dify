import React, { useEffect, useState } from 'react'
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine, RiGridFill, RiListUnordered } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import cn from '@/utils/classnames'
import ArtifactDisplay from './artifact-display'
import type { Artifact } from './artifact-display'

interface ArtifactsPanelProps {
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
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between border-b border-gray-200',
        isMobile ? 'p-1' : 'p-2',
      )}>
        <div className="flex items-center space-x-2">
          {!isMobile && (
            <>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1 rounded transition-colors',
                  viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100',
                )}
                title={t('artifact.panel.listView')}
              >
                <RiListUnordered className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1 rounded transition-colors',
                  viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100',
                )}
                title={t('artifact.panel.gridView')}
              >
                <RiGridFill className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Artifacts list/grid sidebar */}
        <div
          className={cn(
            'overflow-y-auto transition-all duration-200',
            {
              'border-r border-gray-200': !isMobile && viewMode === 'list',
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
              className="w-full p-1 hover:bg-gray-100 flex justify-center border-b border-gray-200"
            >
              {isListCollapsed ? (
                <RiArrowRightSLine className="w-4 h-4" />
              ) : (
                <RiArrowLeftSLine className="w-4 h-4" />
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
                    ? 'p-2 mb-1'
                    : cn(
                      'flex flex-col items-center text-center h-full',
                      isMobile ? 'p-2' : 'p-4',
                    ),
                  selectedArtifactId === artifact.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50',
                  'border rounded-md cursor-pointer transition-colors',
                )}
              >
                {/* Show full content in grid view or when list is not collapsed */}
                {(viewMode === 'grid' || !isListCollapsed) && (
                  <div className={cn(
                    'flex flex-col gap-1 w-full',
                    viewMode === 'grid' ? 'items-center' : '',
                  )}>
                    <div className={cn(
                      'font-medium text-gray-800 truncate max-w-full',
                      isMobile && viewMode === 'grid' ? 'text-xs' : 'text-sm',
                    )}>
                      {artifact.title}
                    </div>
                    {artifact.score !== undefined && (
                      <div className="inline-flex">
                        <span className={cn(
                          'px-2 py-0.5 font-medium bg-blue-100 text-blue-800 rounded',
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
                  <div className="w-6 h-6 flex items-center justify-center text-xs font-medium bg-gray-100 rounded" title={artifact.title}>
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
              'fixed inset-0 z-50 bg-white': isMobile && viewMode === 'list',
            },
          )}>
            {isMobile && viewMode === 'list' && (
              <div className="sticky top-0 z-10 flex items-center justify-between p-2 bg-white border-b border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className="p-1.5 hover:bg-gray-100 rounded-full"
                >
                  <RiArrowLeftSLine className="w-5 h-5" />
                </button>
                <h2 className="font-medium text-sm truncate max-w-[200px]">{selectedArtifact.title}</h2>
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