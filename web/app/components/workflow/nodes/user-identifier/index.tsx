import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { NodeProps } from 'reactflow'
import { NodeSourceHandle, NodeTargetHandle } from '../_base/components/node-handle'
import { BaseNode } from '../_base/components/base-node'
import { User01 } from '@/app/components/base/icons/src/vender/line/users'
import type { UserIdentifierNodeType } from './types'

const UserIdentifierNode = ({ data, selected }: NodeProps<UserIdentifierNodeType>) => {
  const { t } = useTranslation()

  const handleUserIdChange = useCallback((userId: string) => {
    // 更新节点数据
    data.user_id = userId
    
    // 触发工作流变量更新
    if (data.onUserIdChange) {
      data.onUserIdChange(userId)
    }
  }, [data])

  return (
    <BaseNode className={`relative ${selected ? 'border-primary-600' : ''}`}>
      <div className="flex items-center gap-2 p-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary-50">
          <User01 className="w-4 h-4 text-primary-600" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">
            {t('workflow.nodes.userIdentifier.title')}
          </div>
          <div className="text-xs text-gray-500">
            {data.user_id || t('workflow.nodes.userIdentifier.noUser')}
          </div>
        </div>
      </div>
      
      <NodeTargetHandle
        id="target"
        type="target"
        position="left"
        className="!left-0 !top-1/2 !-translate-y-1/2"
      />
      
      <NodeSourceHandle
        id="source"
        type="source"
        position="right"
        className="!right-0 !top-1/2 !-translate-y-1/2"
      />
    </BaseNode>
  )
}

export default UserIdentifierNode
