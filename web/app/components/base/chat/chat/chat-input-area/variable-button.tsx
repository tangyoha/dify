import React, { memo, useEffect, useRef, useState } from 'react'
import { RiArrowDownSLine } from '@remixicon/react'
import type { InputForm } from '../type'
import { InputVarType } from '@/app/components/workflow/types'

import { FileUploaderInAttachmentWrapper } from '@/app/components/base/file-uploader'
import cn from '@/utils/classnames'

type VariableButtonProps = {
  variable: InputForm
  value: any
  onChange: (value: any) => void
  appParams?: any
}

const VariableButton = ({ variable, value, onChange, appParams }: VariableButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPopupPosition({
        top: rect.top - 10,
        left: rect.left,
      })
    }
  }, [isOpen])

  const renderInput = () => {
    switch (variable.type) {
      case InputVarType.textInput:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={variable.label}
            className="w-full rounded-md border border-components-panel-border bg-components-input-bg-normal px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            onBlur={() => setTimeout(() => setIsOpen(false), 100)}
            autoFocus
          />
        )
      case InputVarType.number:
        return (
          <input
            type="number"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={variable.label}
            className="w-full rounded-md border border-components-panel-border bg-components-input-bg-normal px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            onBlur={() => setTimeout(() => setIsOpen(false), 100)}
            autoFocus
          />
        )
      case InputVarType.paragraph:
        return (
          <textarea
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={variable.label}
            className="min-h-[60px] w-full resize-none rounded-md border border-components-panel-border bg-components-input-bg-normal px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            rows={3}
          />
        )
      case InputVarType.select:
        return (
          <div className="space-y-1">
            {variable.options?.map((option: string) => (
              <div
                key={option}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-2 text-sm transition-colors',
                  value === option
                    ? 'border border-primary-200 bg-primary-50 text-primary-600'
                    : 'text-text-primary hover:bg-state-base-hover',
                )}
                onClick={() => {
                  onChange(option)
                  setIsOpen(false) // 选择后自动关闭
                }}
              >
                {option}
              </div>
            ))}
          </div>
        )
      case InputVarType.radio:
        return (
          <div className="space-y-2">
            {variable.options?.map((option: string) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-state-base-hover"
              >
                <input
                  type="radio"
                  name={variable.variable}
                  value={option}
                  checked={value === option}
                  onChange={() => {
                    onChange(option)
                    setIsOpen(false) // 选择后自动关闭
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-600"
                />
                <span className="text-text-primary">{option}</span>
              </label>
            ))}
          </div>
        )
      case InputVarType.singleFile:
        return (
          <FileUploaderInAttachmentWrapper
            value={value ? [value] : []}
            onChange={files => onChange(files[0])}
            fileConfig={{
              allowed_file_types: variable.allowed_file_types,
              allowed_file_extensions: variable.allowed_file_extensions,
              allowed_file_upload_methods: variable.allowed_file_upload_methods,
              number_limits: 1,
              fileUploadConfig: appParams?.system_parameters,
            }}
          />
        )
      case InputVarType.multiFiles:
        return (
          <FileUploaderInAttachmentWrapper
            value={value || []}
            onChange={files => onChange(files)}
            fileConfig={{
              allowed_file_types: variable.allowed_file_types,
              allowed_file_extensions: variable.allowed_file_extensions,
              allowed_file_upload_methods: variable.allowed_file_upload_methods,
              number_limits: variable.max_length,
              fileUploadConfig: appParams?.system_parameters,
            }}
          />
        )
      default:
        return null
    }
  }

  const getDisplayValue = () => {
    if (!value) {
      // 显示变量标签，如果太长则截断
      const label = typeof variable.label === 'string' ? variable.label : variable.variable
      return label.length > 8 ? `${label.substring(0, 8)}...` : label
    }

    if (variable.type === InputVarType.select || variable.type === InputVarType.radio)
      return value.length > 8 ? `${value.substring(0, 8)}...` : value

    if (variable.type === InputVarType.singleFile) {
      const fileName = value.name || variable.label
      return fileName.length > 8 ? `${fileName.substring(0, 8)}...` : fileName
    }

    if (variable.type === InputVarType.multiFiles)
      return value.length > 0 ? `${value.length} 文件` : variable.label

    if (typeof value === 'string')
      return value.length > 8 ? `${value.substring(0, 8)}...` : value

    return String(value).length > 8 ? `${String(value).substring(0, 8)}...` : String(value)
  }

  // 单选类型直接以内嵌标签按钮呈现，点击选中，再次点击取消
  if (variable.type === InputVarType.radio) {
    return (
      <div className="relative z-10" data-variable-button={variable.variable}>
        <div
          className={cn(
            'flex h-8 rounded-lg border border-components-panel-border overflow-hidden w-full min-w-fit',
          )}
        >
          {variable.options?.map((option: string, index) => (
            <button
              key={option}
              type="button"
              className={cn(
                'flex-1 flex items-center justify-center h-full px-3 text-sm font-medium transition-all duration-200 min-w-0',
                value === option
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900',
                index > 0 && 'border-l border-gray-300'
              )}
              onClick={() => onChange(value === option ? null : option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10">
      <div
        ref={triggerRef}
        data-variable-button={variable.variable}
        className={cn(
          'flex cursor-pointer select-none items-center justify-between gap-1 rounded-lg px-3 py-1.5 transition-all duration-200',
          'border border-components-panel-border bg-components-panel-bg hover:bg-components-panel-bg-alt',
          'h-8 min-w-[80px] max-w-[120px]',
          isOpen && 'border-components-panel-border-alt bg-components-panel-bg-alt',
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex-1 truncate text-sm font-medium text-text-secondary">
          {getDisplayValue()}
        </span>
        <RiArrowDownSLine
          className={cn(
            'h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </div>

            {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[998]"
            onClick={() => setIsOpen(false)}
          />

          {/* Popup - Fixed positioning to ensure visibility */}
          <div
            className="fixed z-[999]"
            style={{
              top: popupPosition.top,
              left: popupPosition.left,
              transform: 'translateY(-100%)',
            }}
          >
            <div className='min-w-[200px] max-w-[280px] rounded-lg border border-components-panel-border bg-components-panel-bg p-3 shadow-lg'>
              <div className='mb-2'>
                <span className='text-sm font-medium text-text-primary'>{variable.label}</span>
                {variable.required && (
                  <span className='ml-1 text-xs text-text-destructive'>*</span>
                )}
              </div>
              <div className='max-h-[180px] overflow-y-auto'>
                {renderInput()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default memo(VariableButton)
