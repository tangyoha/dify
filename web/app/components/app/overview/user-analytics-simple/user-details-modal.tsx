'use client'
import type { FC } from 'react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RiCloseLine, RiUser3Line, RiMessage3Line, RiCalendarLine, RiTimeLine } from '@remixicon/react'
import useSWR from 'swr'
import Modal from '@/app/components/base/modal'
import Button from '@/app/components/base/button'
import Pagination from '@/app/components/base/pagination'
import Loading from '@/app/components/base/loading'
import { formatTime } from '@/utils/time'
import { APP_PAGE_LIMIT } from '@/config'
import { fetchUserAnalyticsDetail, type UserAnalyticsDetailResponse } from '@/service/user-analytics'

export type UserAnalyticsData = {
  user_id: string
  user_name: string
  display_name: string
  message_count: number
  conversation_count: number
  last_active: string | null
  created_at: string | null
}

export type UserDetailsModalProps = {
  isOpen: boolean
  onClose: () => void
  appId: string
  timeRange?: string
  startDate?: string
  endDate?: string
  title?: string
}

const UserDetailsModal: FC<UserDetailsModalProps> = ({
  isOpen,
  onClose,
  appId,
  timeRange = '7d',
  startDate,
  endDate,
  title = '用户活跃详情'
}) => {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(0)
  const [limit, setLimit] = useState(APP_PAGE_LIMIT)

  // 构建查询参数
  const queryParams = {
    range: timeRange,
    page: currentPage,
    limit,
    ...(startDate && { start_date: startDate }),
    ...(endDate && { end_date: endDate }),
  }

  // 使用SWR获取分页数据
  const { data: analyticsDetail, isLoading, error } = useSWR<UserAnalyticsDetailResponse>(
    isOpen ? { url: `/apps/${appId}/user-analytics-detail`, params: queryParams } : null,
    fetchUserAnalyticsDetail,
    {
      revalidateOnFocus: false,
      onError: (err) => {
        console.error('Failed to fetch user analytics detail:', err)
      },
    }
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setCurrentPage(0) // 重置到第一页
  }

  const users = analyticsDetail?.users || []
  const total = analyticsDetail?.total || 0

  return (
    <Modal
      isShow={isOpen}
      onClose={onClose}
      className="w-full max-w-4xl"
      wrapperClassName="z-50"
    >
      <div className="bg-white rounded-2xl shadow-xl h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
              <RiUser3Line className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">共 {total} 个用户</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="small"
            onClick={onClose}
            className="!p-2"
          >
            <RiCloseLine className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loading />
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RiUser3Line className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无用户数据</p>
              </div>
            </div>
          ) : (
            <>
              {/* 表格头部 */}
              <div className="bg-gray-50 border-b border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-6 gap-4 px-6 py-3 text-sm font-medium text-gray-700">
                  <div className="flex items-center gap-2">
                    <span>排名</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiUser3Line className="w-4 h-4" />
                    <span>用户名称</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiMessage3Line className="w-4 h-4" />
                    <span>消息数量</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiMessage3Line className="w-4 h-4" />
                    <span>对话数量</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiTimeLine className="w-4 h-4" />
                    <span>最后活跃</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiCalendarLine className="w-4 h-4" />
                    <span>创建时间</span>
                  </div>
                </div>
              </div>

              {/* 表格内容 - 可滚动区域 */}
              <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-gray-100">
                {users.map((user, index) => {
                  const globalIndex = currentPage * limit + index
                  return (
                    <div
                      key={user.user_id}
                      className="grid grid-cols-6 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          globalIndex === 0 ? 'bg-yellow-500' :
                          globalIndex === 1 ? 'bg-gray-400' :
                          globalIndex === 2 ? 'bg-amber-600' :
                          'bg-blue-500'
                        }`}>
                          {globalIndex + 1}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="truncate">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user.user_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            ID: {user.user_id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-semibold text-gray-900">
                          {user.message_count}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">
                          {user.conversation_count || 0}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">
                          {user.last_active ? formatTime({ date: user.last_active, dateFormat: 'MM-DD HH:mm' }) : '-'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">
                          {user.created_at ? formatTime({ date: user.created_at, dateFormat: 'MM-DD HH:mm' }) : '-'}
                        </span>
                      </div>
                    </div>
                  )
                })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 分页 */}
        {total > APP_PAGE_LIMIT && (
          <div className="border-t border-gray-200 flex-shrink-0">
            <Pagination
              current={currentPage}
              onChange={handlePageChange}
              total={total}
              limit={limit}
              onLimitChange={handleLimitChange}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}

export default UserDetailsModal
