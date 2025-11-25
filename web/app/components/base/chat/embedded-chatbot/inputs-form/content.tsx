import React, { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useEmbeddedChatbotContext } from '../context'
import Input from '@/app/components/base/input'
import Textarea from '@/app/components/base/textarea'
import { PortalSelect } from '@/app/components/base/select'
import { FileUploaderInAttachmentWrapper } from '@/app/components/base/file-uploader'
import { InputVarType } from '@/app/components/workflow/types'

type Props = {
  showTip?: boolean
}

const InputsFormContent = ({ showTip }: Props) => {
  const { t } = useTranslation()
  const {
    appParams,
    inputsForms,
    currentConversationId,
    currentConversationInputs,
    setCurrentConversationInputs,
    newConversationInputs,
    newConversationInputsRef,
    handleNewConversationInputsChange,
  } = useEmbeddedChatbotContext()

  // 统一使用当前输入值，不区分是否有对话ID
  const inputsFormValue = currentConversationId ? currentConversationInputs : newConversationInputs

  const handleFormChange = useCallback((variable: string, value: any) => {
    // 更新当前对话的输入值
    if (currentConversationId) {
      const updatedInputs = {
        ...currentConversationInputs,
        [variable]: value,
      }
      setCurrentConversationInputs(updatedInputs)
      // 同时更新新对话的输入值，保持同步
      handleNewConversationInputsChange({
        ...updatedInputs,
      })
    }
    else {
      // 如果没有当前对话ID，只更新新对话的输入值
      handleNewConversationInputsChange({
        ...newConversationInputsRef.current,
        [variable]: value,
      })
    }
  }, [newConversationInputsRef, handleNewConversationInputsChange, currentConversationInputs, setCurrentConversationInputs, currentConversationId])

  const visibleInputsForms = inputsForms.filter(form => form.hide !== true)

  return (
    <div className='space-y-4'>
      {visibleInputsForms.map(form => (
        <div key={form.variable} className='space-y-1'>
          <div className='flex h-6 items-center gap-1'>
            <div className='system-md-semibold text-text-secondary'>{form.label}</div>
            {!form.required && (
              <div className='system-xs-regular text-text-tertiary'>{t('appDebug.variableTable.optional')}</div>
            )}
          </div>
          {form.type === InputVarType.textInput && (
            <Input
              value={inputsFormValue?.[form.variable] || ''}
              onChange={e => handleFormChange(form.variable, e.target.value)}
              placeholder={form.label}
            />
          )}
          {form.type === InputVarType.number && (
            <Input
              type='number'
              value={inputsFormValue?.[form.variable] || ''}
              onChange={e => handleFormChange(form.variable, e.target.value)}
              placeholder={form.label}
            />
          )}
          {form.type === InputVarType.paragraph && (
            <Textarea
              value={inputsFormValue?.[form.variable] || ''}
              onChange={e => handleFormChange(form.variable, e.target.value)}
              placeholder={form.label}
            />
          )}
          {form.type === InputVarType.select && (
            <PortalSelect
              popupClassName='w-[200px]'
              value={inputsFormValue?.[form.variable]}
              items={form.options.map((option: string) => ({ value: option, name: option }))}
              onSelect={item => handleFormChange(form.variable, item.value as string)}
              placeholder={form.label}
            />
          )}
          {form.type === InputVarType.radio && (
            <div className="space-y-2">
              {form.options?.map((option: string) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-state-base-hover"
                >
                  <input
                    type="radio"
                    name={form.variable}
                    value={option}
                    checked={inputsFormValue?.[form.variable] === option}
                    onChange={() => handleFormChange(form.variable, option)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-600"
                  />
                  <span className="text-text-primary">{option}</span>
                </label>
              ))}
            </div>
          )}
          {form.type === InputVarType.singleFile && (
            <FileUploaderInAttachmentWrapper
              value={inputsFormValue?.[form.variable] ? [inputsFormValue?.[form.variable]] : []}
              onChange={files => handleFormChange(form.variable, files[0])}
              fileConfig={{
                allowed_file_types: form.allowed_file_types,
                allowed_file_extensions: form.allowed_file_extensions,
                allowed_file_upload_methods: form.allowed_file_upload_methods,
                number_limits: 1,
                fileUploadConfig: (appParams as any).system_parameters,
              }}
            />
          )}
          {form.type === InputVarType.multiFiles && (
            <FileUploaderInAttachmentWrapper
              value={inputsFormValue?.[form.variable] || []}
              onChange={files => handleFormChange(form.variable, files)}
              fileConfig={{
                allowed_file_types: form.allowed_file_types,
                allowed_file_extensions: form.allowed_file_extensions,
                allowed_file_upload_methods: form.allowed_file_upload_methods,
                number_limits: form.max_length,
                fileUploadConfig: (appParams as any).system_parameters,
              }}
            />
          )}
        </div>
      ))}
      {showTip && currentConversationId && (
        <div className='system-xs-regular text-text-tertiary'>{t('share.chat.configStatusDes')}</div>
      )}
      {showTip && !currentConversationId && (
        <div className='system-xs-regular text-text-tertiary'>{t('share.chat.chatFormTip')}</div>
      )}
    </div>
  )
}

export default memo(InputsFormContent)
