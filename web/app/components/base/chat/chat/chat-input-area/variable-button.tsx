import React, { memo, useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RiArrowDownSLine, RiCloseLine } from '@remixicon/react'
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
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPopupPosition({
        top: rect.top - 10,
        left: rect.left
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
            className="w-full px-3 py-2 border border-components-panel-border bg-components-input-bg-normal rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-600 focus:border-primary-600 text-text-primary placeholder:text-text-placeholder"
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
            className="w-full px-3 py-2 border border-components-panel-border bg-components-input-bg-normal rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-600 focus:border-primary-600 text-text-primary placeholder:text-text-placeholder"
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
            className="w-full px-3 py-2 border border-components-panel-border bg-components-input-bg-normal rounded-md text-sm min-h-[60px] resize-none text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-1 focus:ring-primary-600 focus:border-primary-600"
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
                  'px-3 py-2 rounded-md cursor-pointer text-sm transition-colors',
                  value === option 
                    ? 'bg-primary-50 text-primary-600 border border-primary-200' 
                    : 'hover:bg-state-base-hover text-text-primary'
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
    
    if (variable.type === InputVarType.select) {
      return value.length > 8 ? `${value.substring(0, 8)}...` : value
    }
    
    if (variable.type === InputVarType.singleFile) {
      const fileName = value.name || variable.label
      return fileName.length > 8 ? `${fileName.substring(0, 8)}...` : fileName
    }
    
    if (variable.type === InputVarType.multiFiles) {
      return value.length > 0 ? `${value.length} 文件` : variable.label
    }
    
    if (typeof value === 'string') {
      return value.length > 8 ? `${value.substring(0, 8)}...` : value
    }
    
    return String(value).length > 8 ? `${String(value).substring(0, 8)}...` : String(value)
  }

  return (
    <div className="relative z-10">
      <div
        ref={triggerRef}
        data-variable-button={variable.variable}
        className={cn(
          'flex items-center justify-between gap-1 px-3 py-1.5 rounded-lg cursor-pointer select-none transition-all duration-200',
          'bg-components-panel-bg hover:bg-components-panel-bg-alt border border-components-panel-border',
          'min-w-[80px] max-w-[120px] h-8',
          isOpen && 'bg-components-panel-bg-alt border-components-panel-border-alt'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm text-text-secondary truncate flex-1 font-medium">
          {getDisplayValue()}
        </span>
        <RiArrowDownSLine 
          className={cn(
            'w-4 h-4 text-text-tertiary transition-transform duration-200 flex-shrink-0',
            isOpen && 'rotate-180'
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
              transform: 'translateY(-100%)'
            }}
          >
            <div className='bg-components-panel-bg border border-components-panel-border rounded-lg shadow-lg p-3 min-w-[200px] max-w-[280px]'>
              <div className='mb-2'>
                <span className='text-sm font-medium text-text-primary'>{variable.label}</span>
                {variable.required && (
                  <span className='text-xs text-text-destructive ml-1'>*</span>
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