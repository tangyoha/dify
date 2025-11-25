import type { CommonNodeType } from '../_base/types'

export type UserIdentifierNodeType = CommonNodeType & {
  user_id?: string
  onUserIdChange?: (userId: string) => void
}
