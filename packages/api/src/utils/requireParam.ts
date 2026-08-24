import type { Request } from 'express'
import { AppError, ErrorCode } from './AppError.js'
import { HttpStatus } from '../constants/index.js'

/**
 * Read a required route parameter as a `string`.
 *
 * Express types route params as `string | undefined` under
 * `noUncheckedIndexedAccess`. A parameter is always present when the route that
 * declares it has matched, so this narrows the type for the common case, while
 * still failing loudly — through the same `AppError` the rest of the API throws
 * — if a handler is ever mounted on a route that does not declare it.
 *
 * @example
 * const id = requireParam(req, 'id')
 */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name]
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError(
      `Missing required route parameter: ${name}`,
      HttpStatus.BAD_REQUEST,
      true,
      ErrorCode.VALIDATION_ERROR,
    )
  }
  return value
}

/**
 * Read the first of several route parameters that is present.
 *
 * Some routers mount the same handler under different parameter names (for
 * example `/workers/:id/reviews` and `/workers/:workerId/reviews`).
 */
export function requireAnyParam(req: Request, ...names: string[]): string {
  for (const name of names) {
    const value = req.params[name]
    if (typeof value === 'string' && value.length > 0) return value
  }
  throw new AppError(
    `Missing required route parameter: one of ${names.join(', ')}`,
    HttpStatus.BAD_REQUEST,
    true,
    ErrorCode.VALIDATION_ERROR,
  )
}
