'use client'
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { User01, Users01 } from '@/app/components/base/icons/src/vender/line/users'
import { MessageDotsCircle } from '@/app/components/base/icons/src/vender/solid/communication'
import Loading from '@/app/components/base/loading'
import Button from '@/app/components/base/button'
import { SimpleSelect } from '@/app/components/base/select'
import DatePicker from '@/app/components/base/date-and-time-picker/date-picker'
import { TIME_PERIOD_MAPPING } from '@/app/components/app/log/filter'
import type { Item } from '@/app/components/base/select'
import { fetchUserAnalytics, type UserAnalyticsData } from '@/service/user-analytics'
import UserDetailsModal from './user-details-modal'

type Props = {
  appId: string
}

const UserAnalyticsSimple = ({ appId }: Props) => {
  const { t } = useTranslation()
  const today = dayjs()
  const queryDateFormat = 'YYYY-MM-DD HH:mm'

  const [timeRange, setTimeRange] = useState('7d')
  const [isCustomRange, setIsCustomRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState<dayjs.Dayjs | undefined>(undefined)
  const [customEndDate, setCustomEndDate] = useState<dayjs.Dayjs | undefined>(undefined)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [period, setPeriod] = useState<{ name: string; query?: { start: string; end: string } }>({
    name: t('appLog.filter.period.last7days'),
    query: {
      start: today.subtract(7, 'day').startOf('day').format(queryDateFormat),
      end: today.endOf('day').format(queryDateFormat)
    }
  })

  const onSelect = (item: Item) => {
    if (item.value === 'custom') {
      setIsCustomRange(true)
      setTimeRange('custom')
      return
    }

    setIsCustomRange(false)
    setTimeRange(item.value as string)

    if (item.value === -1) {
      setPeriod({ name: item.name, query: undefined })
    }
    else if (item.value === 0) {
      const startOfToday = today.startOf('day').format(queryDateFormat)
      const endOfToday = today.endOf('day').format(queryDateFormat)
      setPeriod({ name: item.name, query: { start: startOfToday, end: endOfToday } })
    }
    else {
      setPeriod({ name: item.name, query: { start: today.subtract(item.value as number, 'day').startOf('day').format(queryDateFormat), end: today.endOf('day').format(queryDateFormat) } })
    }
  }

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      const start = customStartDate.startOf('day').format(queryDateFormat)
      const end = customEndDate.endOf('day').format(queryDateFormat)
      setPeriod({
        name: `${customStartDate.format('YYYY-MM-DD')} - ${customEndDate.format('YYYY-MM-DD')}`,
        query: { start, end }
      })
    }
  }

  // Update period when custom dates change
  useEffect(() => {
    if (isCustomRange && customStartDate && customEndDate) {
      handleCustomDateChange()
    }
  }, [customStartDate, customEndDate, isCustomRange])

  // 获取用户ID映射
  const getUserDisplayName = (userId: string, userName?: string) => {
    if (userName) return userName

    // 从localStorage获取用户ID映射
    const userMappings = JSON.parse(localStorage.getItem('user_id_mappings') || '{}')
    if (userMappings[userId]) {
      return userMappings[userId]
    }

    // 如果没有映射，显示简化的用户ID
    return `用户${userId.slice(0, 8)}`
  }

  // 构建查询参数，过滤掉空值
  const queryParams = {
    range: timeRange,
    ...(period.query?.start && { start_date: period.query.start }),
    ...(period.query?.end && { end_date: period.query.end }),
  }

  const { data: rawAnalyticsData, isLoading, error } = useSWR<UserAnalyticsData>(
    { url: `/apps/${appId}/user-analytics`, params: queryParams },
    fetchUserAnalytics,
    {
      refreshInterval: 30000,
      onError: (err) => {
        console.error('Failed to fetch user analytics:', err)
      },
    },
  )

  // 处理分析数据，添加显示名称
  const analyticsData = rawAnalyticsData ? {
    ...rawAnalyticsData,
    user_distribution: rawAnalyticsData.user_distribution?.map(user => ({
      ...user,
      display_name: getUserDisplayName(user.user_id, user.user_name)
    }))
  } : null

  if (isLoading) {
    return (
      <div className="flex w-full flex-col rounded-2xl bg-white border border-gray-100 px-6 py-8 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <Loading />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex w-full flex-col rounded-2xl bg-white border border-gray-100 px-6 py-8 shadow-sm">
        <div className="text-center text-red-500 py-4">
          用户分析数据加载失败: {error.message || 'API Error'}
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="flex w-full flex-col rounded-2xl bg-white border border-gray-100 px-6 py-8 shadow-sm">
        <div className="text-center text-gray-500 py-4">
          暂无用户分析数据
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 时间范围选择器 - 统一样式 */}
      <div className="flex w-full flex-col rounded-2xl bg-white border border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('appOverview.userAnalytics.title')}</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">{t('appOverview.analysis.title')}:</span>
            <SimpleSelect
              items={[
                ...Object.entries(TIME_PERIOD_MAPPING).map(([k, v]) => ({ value: k, name: t(`appLog.filter.period.${v.name}`) })),
                { value: 'custom', name: t('appLog.filter.period.custom') }
              ]}
              className='mt-0 !w-40'
              onSelect={(item) => {
                if (item.value === 'custom') {
                  onSelect({ value: 'custom', name: item.name })
                  return
                }
                const id = item.value
                const value = TIME_PERIOD_MAPPING[id]?.value ?? '-1'
                const name = item.name || t('appLog.filter.period.allTime')
                onSelect({ value, name })
              }}
              defaultValue={'2'}
            />

            {isCustomRange && (
              <div className='flex items-center gap-2'>
                <DatePicker
                  value={customStartDate}
                  onChange={setCustomStartDate}
                  onClear={() => setCustomStartDate(undefined)}
                  placeholder={t('appLog.filter.startDate')}
                  needTimePicker={false}
                />
                <span className='text-text-tertiary'>-</span>
                <DatePicker
                  value={customEndDate}
                  onChange={setCustomEndDate}
                  onClear={() => setCustomEndDate(undefined)}
                  placeholder={t('appLog.filter.endDate')}
                  needTimePicker={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 概览卡片 - 改进设计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-blue-900 mb-1">
                {analyticsData.total_users}
              </div>
              <div className="text-sm font-medium text-blue-700">
                {t('appOverview.userAnalytics.totalUsers')}
              </div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500 shadow-lg">
              <Users01 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-900 mb-1">
                {analyticsData.active_users_today}
              </div>
              <div className="text-sm font-medium text-green-700">
                {t('appOverview.userAnalytics.activeToday')}
              </div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500 shadow-lg">
              <User01 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-amber-900 mb-1">
                {analyticsData.total_conversations}
              </div>
              <div className="text-sm font-medium text-amber-700">
                {t('appOverview.userAnalytics.totalConversations')}
              </div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 shadow-lg">
              <MessageDotsCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-purple-900 mb-1">
                {analyticsData.total_messages}
              </div>
              <div className="text-sm font-medium text-purple-700">
                {t('appOverview.userAnalytics.totalMessages')}
              </div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500 shadow-lg">
              <MessageDotsCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* 活跃用户趋势图 - 改进设计 */}
      {analyticsData?.daily_active_users && analyticsData.daily_active_users.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              活跃用户趋势
            </h3>
            <div className="text-sm text-gray-500">
              过去 {timeRange === '1d' ? '1天' : timeRange === '7d' ? '7天' : timeRange === '30d' ? '30天' : '90天'}
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analyticsData.daily_active_users} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="user_count"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                  name="活跃用户数"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 用户消息分布图表 - 修复柱状图大小和显示问题 */}
      {analyticsData?.user_distribution && analyticsData.user_distribution.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              用户消息分布
            </h3>
            <div className="text-sm text-gray-500">
              前 {Math.min(10, analyticsData.user_distribution.length)} 名活跃用户
            </div>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analyticsData.user_distribution.slice(0, 10)}
                margin={{ top: 20, right: 40, left: 20, bottom: 100 }}
                barCategoryGap="15%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="display_name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '14px'
                  }}
                  formatter={(value) => [value, '消息数量']}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
                <Bar
                  dataKey="message_count"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                  minPointSize={2}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 用户活跃排行 - 改为详情页面 */}
      {analyticsData?.user_distribution && analyticsData.user_distribution.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              用户活跃排行
            </h3>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setShowUserDetails(true)}
              className="flex items-center gap-2"
            >
              <Users01 className="w-4 h-4" />
              查看详情
            </Button>
          </div>
          <div className="space-y-4">
            {analyticsData.user_distribution.slice(0, 5).map((user, index) => (
              <div key={user.user_id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-amber-600' :
                    'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {user.display_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      用户ID: {user.user_id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {user.message_count}
                  </div>
                  <div className="text-xs text-gray-500">
                    条消息
                  </div>
                </div>
              </div>
            ))}
            {analyticsData.user_distribution.length > 5 && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setShowUserDetails(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  查看全部 {analyticsData.user_distribution.length} 个用户
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 用户详情模态框 */}
      {showUserDetails && (
        <UserDetailsModal
          isOpen={showUserDetails}
          onClose={() => setShowUserDetails(false)}
          appId={appId}
          timeRange={timeRange}
          startDate={period.query?.start}
          endDate={period.query?.end}
          title="用户活跃详情"
        />
      )}
    </div>
  )
}

export default UserAnalyticsSimple
