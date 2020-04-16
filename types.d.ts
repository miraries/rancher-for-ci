export type ErrorCode = 'UNKNOWN' | 'NOT_FOUND_ENVIRONMENT' | 'UNAUTHORIZED'

export interface Validate {
  isValid: boolean
  errorCode: ErrorCode
}
