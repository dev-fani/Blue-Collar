import type { Request, Response, NextFunction } from 'express'
import { rateLimit, type AugmentedRequest } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { redis } from '../config/redis.js'
import { VERSION_CONFIG } from './version.js'

/**
 * Get dynamic rate limit config based on user and version
 */
export function getDynamicRateLimitConfig(version: string, userId?: string) {
  const baseConfig = VERSION_CONFIG.rateLimitByVersion[version as keyof typeof VERSION_CONFIG.rateLimitByVersion]
  if (!baseConfig) {
    return null
  }

  // Could implement user-tier based limits here
  // For now, return base config
  return { ...baseConfig }
}

/**
 * Version-specific rate limiter with dynamic configuration
 * Different versions can have different rate limits
 */
export function versionRateLimit(req: Request, res: Response, next: NextFunction) {
  const version = req.apiVersion || 'v1'
  const userId = (req as any).user?.id

  const config = getDynamicRateLimitConfig(version, userId)
  if (!config) {
    return next()
  }

  // Use user ID if available for per-user limits, otherwise use IP
  const key = userId ? `rl:${version}:user:${userId}` : `rl:${version}:ip:${req.ip}`

  const limiter = rateLimit({
    store: new RedisStore({
      // rate-limit-redis v5 (the declared dependency) takes a raw command
      // sender rather than a client instance, as v4 did.
      sendCommand: (...args: string[]) => (redis as any).call(...args),
      prefix: `${key}:`,
    }),
    windowMs: config.windowMs,
    max: config.requests,
    message: {
      status: 'error',
      message: `Too many requests for ${version}. Limit: ${config.requests} requests per ${config.windowMs / 1000}s`,
      code: 429,
    },
    standardHeaders: false,
    skip: (req) => !req.apiVersion,
    handler: (req, res) => {
      // express-rate-limit v7 does not augment `express.Request` globally; it
      // exposes `AugmentedRequest` and stores the info under `requestPropertyName`
      // (default `rateLimit`). `resetTime` is a `Date`, not a timestamp.
      const info = (req as AugmentedRequest).rateLimit as
        | AugmentedRequest['rateLimit']
        | undefined
      const resetTime = info?.resetTime?.getTime()
      const retryAfter = resetTime
        ? Math.ceil((resetTime - Date.now()) / 1000)
        : Math.ceil(config.windowMs / 1000)

      res.set('Retry-After', String(retryAfter))
      res.set('X-RateLimit-Limit', String(config.requests))
      res.set('X-RateLimit-Remaining', String(info?.remaining ?? 0))
      res.set('X-RateLimit-Reset', String(resetTime ?? Date.now() + config.windowMs))

      res.status(429).json({
        status: 'error',
        message: `Too many requests for ${version}`,
        code: 429,
        retryAfter,
      })
    },
  })

  limiter(req, res, next)
}

/**
 * Rate limit status endpoint - check current limits
 */
export function getRateLimitStatus(req: Request, res: Response) {
  const version = req.apiVersion || 'v1'
  const config = getDynamicRateLimitConfig(version)

  if (!config) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid API version',
      code: 400,
    })
  }

  res.json({
    status: 'success',
    version,
    rateLimiting: {
      requests: config.requests,
      windowMs: config.windowMs,
      window: `${config.windowMs / 1000}s`,
    },
    message: `${config.requests} requests per ${config.windowMs / 1000} seconds`,
  })
}
