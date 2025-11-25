'use client'
import type { FC } from 'react'
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { RiCalendarLine, RiUser3Line } from '@remixicon/react'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import type { QueryParam } from './index'
import Chip from '@/app/components/base/chip'
import Input from '@/app/components/base/input'
import Sort from '@/app/components/base/sort'
import DatePicker from '@/app/components/base/date-and-time-picker/date-picker'
import { fetchAnnotationsCount } from '@/service/log'
import { get } from '@/service/base'
dayjs.extend(quarterOfYear)

const today = dayjs()

export const TIME_PERIOD_MAPPING: { [key: string]: { value: number; name: string } } = {
  1: { value: 0, name: 'today' },
  2: { value: 7, name: 'last7days' },
  3: { value: 28, name: 'last4weeks' },
  4: { value: today.diff(today.subtract(3, 'month'), 'day'), name: 'last3months' },
  5: { value: today.diff(today.subtract(12, 'month'), 'day'), name: 'last12months' },
  6: { value: today.diff(today.startOf('month'), 'day'), name: 'monthToDate' },
  7: { value: today.diff(today.startOf('quarter'), 'day'), name: 'quarterToDate' },
  8: { value: today.diff(today.startOf('year'), 'day'), name: 'yearToDate' },
  9: { value: -1, name: 'allTime' },
}

type IFilterProps = {
  isChatMode?: boolean
  appId: string
  queryParams: QueryParam
  setQueryParams: (v: QueryParam) => void
}

const Filter: FC<IFilterProps> = ({ isChatMode, appId, queryParams, setQueryParams }: IFilterProps) => {
  const { data } = useSWR({ url: `/apps/${appId}/annotations/count` }, fetchAnnotationsCount)
  const { data: userListData } = useSWR<{ users: Array<{ id: string; name: string; external_user_id: string; is_anonymous: boolean }> }>(
    `/apps/${appId}/users`,
    get,
    {
      refreshInterval: 60000, // 每分钟刷新一次用户列表
    },
  )
  const { t } = useTranslation()

  // Custom date range state
  const [isCustomRange, setIsCustomRange] = useState(queryParams.period === 'custom')
  const [customStartDate, setCustomStartDate] = useState<dayjs.Dayjs | undefined>(
    queryParams.start_date ? dayjs(queryParams.start_date, 'YYYY-MM-DD HH:mm') : undefined
  )
  const [customEndDate, setCustomEndDate] = useState<dayjs.Dayjs | undefined>(
    queryParams.end_date ? dayjs(queryParams.end_date, 'YYYY-MM-DD HH:mm') : undefined
  )

  // 获取用户显示名称，支持映射
  const getUserDisplayName = (userId: string, userName?: string) => {
    if (userName) return userName

    // 从localStorage获取用户ID映射
    const userMappings = JSON.parse(localStorage.getItem('user_id_mappings') || '{}')
    if (userMappings[userId]) {
      return userMappings[userId]
    }

    // 如果没有映射，显示简化的用户ID
    if (userId.length > 20 && userId.includes('-')) {
      return `用户${userId.slice(0, 8)}`
    }

    return userId
  }

  // Handle custom date range changes
  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      const start = customStartDate.startOf('day').format('YYYY-MM-DD HH:mm')
      const end = customEndDate.endOf('day').format('YYYY-MM-DD HH:mm')
      setQueryParams({
        ...queryParams,
        period: 'custom',
        start_date: start,
        end_date: end
      })
    }
  }

  // Update query params when custom dates change
  useEffect(() => {
    if (isCustomRange && customStartDate && customEndDate) {
      handleCustomDateChange()
    }
  }, [customStartDate, customEndDate, isCustomRange])

  // 构建用户选项列表
  const userOptions = [
    { value: '', name: t('appLog.filter.user.all') },
    ...(userListData?.users || []).map(user => ({
      value: user.id,
      name: getUserDisplayName(user.id, user.name || user.external_user_id)
    }))
  ]

  if (!data)
    return null
  return (
    <div className='mb-2 flex flex-row flex-wrap items-center gap-2'>
      <Chip
        className='min-w-[150px]'
        panelClassName='w-[270px]'
        leftIcon={<RiCalendarLine className='h-4 w-4 text-text-secondary' />}
        value={queryParams.period}
        onSelect={(item) => {
          if (item.value === 'custom') {
            setIsCustomRange(true)
            setQueryParams({ ...queryParams, period: 'custom' })
            return
          }
          setIsCustomRange(false)
          setQueryParams({
            ...queryParams,
            period: item.value,
            start_date: undefined,
            end_date: undefined
          })
        }}
        onClear={() => {
          setIsCustomRange(false)
          setQueryParams({
            ...queryParams,
            period: '9',
            start_date: undefined,
            end_date: undefined
          })
        }}
        items={[
          ...Object.entries(TIME_PERIOD_MAPPING).map(([k, v]) => ({ value: k, name: t(`appLog.filter.period.${v.name}`) })),
          {
            value: 'custom',
            name: queryParams.period === 'custom' && customStartDate && customEndDate
              ? `${customStartDate.format('YYYY-MM-DD')} - ${customEndDate.format('YYYY-MM-DD')}`
              : t('appLog.filter.period.custom')
          }
        ]}
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

      <Chip
        className='min-w-[150px]'
        panelClassName='w-[270px]'
        showLeftIcon={false}
        value={queryParams.annotation_status || 'all'}
        onSelect={(item) => {
          setQueryParams({ ...queryParams, annotation_status: item.value as string })
        }}
        onClear={() => setQueryParams({ ...queryParams, annotation_status: 'all' })}
        items={[
          { value: 'all', name: t('appLog.filter.annotation.all') },
          { value: 'annotated', name: t('appLog.filter.annotation.annotated', { count: data?.count }) },
          { value: 'not_annotated', name: t('appLog.filter.annotation.not_annotated') },
        ]}
      />

      <Chip
        className='min-w-[150px]'
        panelClassName='w-[270px]'
        showLeftIcon={false}
        value={queryParams.user_feedback_status || 'all'}
        onSelect={(item) => {
          setQueryParams({ ...queryParams, user_feedback_status: item.value as string })
        }}
        onClear={() => setQueryParams({ ...queryParams, user_feedback_status: 'all' })}
        items={[
          { value: 'all', name: t('appLog.filter.userFeedback.all') },
          { value: 'liked', name: t('appLog.filter.userFeedback.liked') },
          { value: 'disliked', name: t('appLog.filter.userFeedback.disliked') },
          { value: 'no_feedback', name: t('appLog.filter.userFeedback.no_feedback') },
        ]}
      />
      <Chip
        className='min-w-[150px]'
        panelClassName='w-[270px]'
        leftIcon={<RiUser3Line className='h-4 w-4 text-text-secondary' />}
        value={queryParams.user_id || ''}
        onSelect={(item) => {
          setQueryParams({ ...queryParams, user_id: item.value as string })
        }}
        onClear={() => setQueryParams({ ...queryParams, user_id: '' })}
        items={userOptions}
      />
      <Input
        wrapperClassName='w-[200px]'
        showLeftIcon
        showClearIcon
        value={queryParams.keyword}
        placeholder={t('common.operation.search')!}
        onChange={(e) => {
          setQueryParams({ ...queryParams, keyword: e.target.value })
        }}
        onClear={() => setQueryParams({ ...queryParams, keyword: '' })}
      />
      {isChatMode && (
        <>
          <div className='h-3.5 w-px bg-divider-regular'></div>
          <Sort
            order={queryParams.sort_by?.startsWith('-') ? '-' : ''}
            value={queryParams.sort_by?.replace('-', '') || 'created_at'}
            items={[
              { value: 'created_at', name: t('appLog.table.header.time') },
              { value: 'updated_at', name: t('appLog.table.header.updatedTime') },
            ]}
            onSelect={(value) => {
              setQueryParams({ ...queryParams, sort_by: value as string })
            }}
          />
        </>
      )}
    </div>
  )
}

export default Filter
