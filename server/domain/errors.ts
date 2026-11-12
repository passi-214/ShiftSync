import type { ApiErrorCode } from './types'

/** Carries a code the API layer maps to an HTTP status and the UI to a translated message. */
export class InputError extends Error {
  constructor(public code: ApiErrorCode) { super(code) }
}
