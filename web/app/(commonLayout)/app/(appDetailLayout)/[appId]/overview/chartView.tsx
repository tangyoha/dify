'use client'
import React, { useState } from 'react'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import { useTranslation } from 'react-i18next'
import type { PeriodParams } from '@/app/components/app/overview/appChart'
import { AvgResponseTime, AvgSessionInteractions, AvgUserInteractions, ConversationsChart, CostChart, EndUsersChart, MessagesChart, ResponseTimeTrend, TokenPerSecond, UserSatisfactionRate, UserLikeTrend, UserDislikeTrend, WorkflowCostChart, WorkflowDailyTerminalsChart, WorkflowMessagesChart } from '@/app/components/app/overview/appChart'
import type { Item } from '@/app/components/base/select'
import { SimpleSelect } from '@/app/components/base/select'
import { TIME_PERIOD_MAPPING } from '@/app/components/app/log/filter'
import { useStore as useAppStore } from '@/app/components/app/store'
import UserAnalyticsSimple from '@/app/components/app/overview/user-analytics-simple'
import DatePicker from '@/app/components/base/date-and-time-picker/date-picker'

dayjs.extend(quarterOfYear)

const today = dayjs()

const queryDateFormat = 'YYYY-MM-DD HH:mm'

export type IChartViewProps = {
  appId: string
}

export default function ChartView({ appId }: IChartViewProps) {
  const { t } = useTranslation()
  const appDetail = useAppStore(state => state.appDetail)
  const isChatApp = appDetail?.mode !== 'completion' && appDetail?.mode !== 'workflow'
  const isWorkflow = appDetail?.mode === 'workflow'
  const [period, setPeriod] = useState<PeriodParams>({ name: t('appLog.filter.period.last7days'), query: { start: today.subtract(7, 'day').startOf('day').format(queryDateFormat), end: today.endOf('day').format(queryDateFormat) } })
  const [isCustomRange, setIsCustomRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState<dayjs.Dayjs | undefined>(undefined)
  const [customEndDate, setCustomEndDate] = useState<dayjs.Dayjs | undefined>(undefined)

  const onSelect = (item: Item) => {
    if (item.value === 'custom') {
      setIsCustomRange(true)
      // Don't update period yet, wait for date selection
      return
    }

    setIsCustomRange(false)
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
  React.useEffect(() => {
    if (isCustomRange && customStartDate && customEndDate) {
      handleCustomDateChange()
    }
  }, [customStartDate, customEndDate, isCustomRange])

  if (!appDetail)
    return null

  return (
    <div>
      <div className='system-xl-semibold mb-4 mt-8 flex flex-row items-center text-text-primary'>
        <span className='mr-3'>{t('appOverview.analysis.title')}</span>
        <div className='flex items-center gap-3'>
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
      {!isWorkflow && (
        <div className='mb-6 grid w-full grid-cols-1 gap-6 xl:grid-cols-2'>
          <ConversationsChart period={period} id={appId} />
          <EndUsersChart period={period} id={appId} />
        </div>
      )}
      {!isWorkflow && (
        <div className='mb-6 grid w-full grid-cols-1 gap-6 xl:grid-cols-2'>
          {isChatApp
            ? (
              <AvgSessionInteractions period={period} id={appId} />
            )
            : (
              <AvgResponseTime period={period} id={appId} />
            )}
          <TokenPerSecond period={period} id={appId} />
        </div>
      )}
      {!isWorkflow && (
        <div className='mb-6 grid w-full grid-cols-1 gap-6 xl:grid-cols-2'>
          <UserSatisfactionRate period={period} id={appId} />
          <CostChart period={period} id={appId} />
        </div>
      )}
      {!isWorkflow && isChatApp && (
        <div className='mb-6 grid w-full grid-cols-1 gap-6 xl:grid-cols-2'>
          <MessagesChart period={period} id={appId} />
          <ResponseTimeTrend period={period} id={appId} />
        </div>
      )}
      {!isWorkflow && isChatApp && (
        <div className='mb-6 grid w-full grid-cols-1 gap-6 xl:grid-cols-2'>
          <UserLikeTrend period={period} id={appId} />
          <UserDislikeTrend period={period} id={appId} />
        </div>
      )}
      {isWorkflow && (
        <div className='mb-6 grid w-full grid-cols-1 gap-6 xl:grid-cols-2'>
          <WorkflowMessagesChart period={period} id={appId} />
          <WorkflowDailyTerminalsChart period={period} id={appId} />
        </div>
      )}
      {isWorkflow && (
        <div className='mb-6 grid w-full grid-cols-1 gap-6 xl:grid-cols-2'>
          <WorkflowCostChart period={period} id={appId} />
          <AvgUserInteractions period={period} id={appId} />
        </div>
      )}

      {/* 用户分析部分 */}
      <div className='mb-6'>
        <div className='system-xl-semibold mb-4 text-text-primary'>
          {t('appOverview.userAnalytics.title')}
        </div>
        <UserAnalyticsSimple appId={appId} />
      </div>
    </div>
  )
}
