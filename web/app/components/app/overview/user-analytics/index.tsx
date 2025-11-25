import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { User01, Users01 } from '@/app/components/base/icons/src/vender/line/users'
import { MessageDotsCircle } from '@/app/components/base/icons/src/vender/line/communication'
import { Calendar } from '@/app/components/base/icons/src/vender/line/time'
import Card from '@/app/components/base/card'
import Loading from '@/app/components/base/loading'
import { fetchUserAnalytics, type UserAnalyticsData } from '@/service/user-analytics'

type Props = {
  appId: string
}



const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

const UserAnalytics = ({ appId }: Props) => {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = useState('7d')

  const { data: analyticsData, isLoading, error } = useSWR<UserAnalyticsData>(
    { url: `/console/api/apps/${appId}/user-analytics`, params: { range: timeRange } },
    fetchUserAnalytics,
    {
      refreshInterval: 30000, // 30秒刷新一次
      onError: (err) => {
        console.error('Failed to fetch user analytics:', err)
      }
    }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        {t('appOverview.userAnalytics.noData')} - {error.message || 'API Error'}
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center text-gray-500 py-8">
        {t('appOverview.userAnalytics.noData')}
      </div>
    )
  }

  const topUsers = analyticsData.user_distribution
    .sort((a, b) => b.message_count - a.message_count)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
              <Users01 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {analyticsData.total_users}
              </div>
              <div className="text-sm text-gray-500">
                {t('app.overview.userAnalytics.totalUsers')}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50">
              <User01 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {analyticsData.active_users_today}
              </div>
              <div className="text-sm text-gray-500">
                {t('app.overview.userAnalytics.activeToday')}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-50">
              <MessageDotsCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {analyticsData.total_conversations}
              </div>
              <div className="text-sm text-gray-500">
                {t('app.overview.userAnalytics.totalConversations')}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
              <MessageDotsCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {analyticsData.total_messages}
              </div>
              <div className="text-sm text-gray-500">
                {t('app.overview.userAnalytics.totalMessages')}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 时间范围选择器 */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-700">{t('app.overview.userAnalytics.timeRange')}:</span>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="1d">{t('app.overview.userAnalytics.last1Day')}</option>
          <option value="7d">{t('app.overview.userAnalytics.last7Days')}</option>
          <option value="30d">{t('app.overview.userAnalytics.last30Days')}</option>
          <option value="90d">{t('app.overview.userAnalytics.last90Days')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 每日活跃用户图表 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('app.overview.userAnalytics.dailyActiveUsers')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.daily_active_users}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="user_count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 用户活跃度分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('app.overview.userAnalytics.userDistribution')}
          </h3>
          <div className="space-y-3">
            {topUsers.map((user, index) => (
              <div key={user.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {user.user_name || user.user_id}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {user.message_count} {t('app.overview.userAnalytics.messages')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 详细用户列表 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('app.overview.userAnalytics.userDetails')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2">{t('app.overview.userAnalytics.userId')}</th>
                <th className="text-left py-2">{t('app.overview.userAnalytics.conversations')}</th>
                <th className="text-left py-2">{t('app.overview.userAnalytics.messages')}</th>
                <th className="text-left py-2">{t('app.overview.userAnalytics.lastActive')}</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData.user_distribution.map((user) => (
                <tr key={user.user_id} className="border-b border-gray-100">
                  <td className="py-2 font-medium">{user.user_name || user.user_id}</td>
                  <td className="py-2">{user.conversation_count}</td>
                  <td className="py-2">{user.message_count}</td>
                  <td className="py-2 text-gray-500">{user.last_active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default UserAnalytics
