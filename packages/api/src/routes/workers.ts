/**
 * Worker Routes
 * Execution Order: Rate Limit -> Auth -> Validation -> Cache -> Controller
 */
import { Router, type Request, type Response } from 'express'
import {
  listWorkers,
  listMyWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  toggleActivation,
  advancedSearch,
  searchWorkersHandler,
  getReputation,
  syncReputation,
} from '../controllers/workers.js'
import { toggleBookmark } from '../controllers/bookmarks.js'
import { createWorkerReview, deleteReview, listWorkerReviews } from './reviews.js'
import { getAvailability, upsertAvailability, addAvailabilitySlot, deleteAvailabilitySlot } from '../controllers/availability.js'
import { registerOnChain } from '../controllers/stellar.js'
import { createContactRequest, getContactRequests, updateContactRequestStatus } from '../controllers/contact-request.js'
import { getWorkerVerifications } from '../controllers/verifications.js'
import { getAnalytics, trackView, getViewTrends, getWorkerPersonalDashboard, exportWorkerPersonalCsv } from '../controllers/analytics.js'

import { validate } from '../middleware/validate.js'
import { withAuth } from '../middleware/composition.js'
import { upload, handleMulterError } from '../middleware/upload.js'
import { createWorkerRules } from '../validations/index.js'
import { cacheMiddleware, invalidateCachePattern, CacheTTL } from '../middleware/cache.js'
import { contactRateLimit, generalRateLimit } from '../middleware/userRateLimit.js'
import { db } from '../db.js'
import { requireParam } from '../utils/requireParam.js'

import { idempotency } from '../middleware/idempotency.js'

const router = Router()

async function showWorkerWithRatings(req: Request, res: Response) {
  const id = requireParam(req, 'id')
  const [worker, rating] = await Promise.all([
    db.worker.findUnique({
      where: { id },
      include: { category: true, portfolioItems: { orderBy: { order: 'asc' } } },
    }),
    db.review.aggregate({
      where: { workerId: id },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ])
  if (!worker) return res.status(404).json({ status: 'error', message: 'Not found', code: 404 })
  return res.json({
    data: { ...worker, avgRating: rating._avg.rating ?? 0, reviewCount: rating._count.rating },
    status: 'success',
    code: 200,
  })
}

router.get('/', generalRateLimit, cacheMiddleware(CacheTTL.SHORT), listWorkers)
router.get('/search', generalRateLimit, cacheMiddleware(CacheTTL.SHORT), searchWorkersHandler)
router.get('/search/advanced', generalRateLimit, cacheMiddleware(CacheTTL.SHORT), advancedSearch)
router.get('/mine', withAuth('curator', 'admin'), listMyWorkers)
router.get('/:id', generalRateLimit, cacheMiddleware(CacheTTL.MEDIUM), showWorkerWithRatings)
router.post('/', withAuth('curator'), idempotency, validate(createWorkerRules), createWorker)
router.put('/:id', withAuth('curator'), updateWorker)
router.delete('/:id', withAuth('curator'), deleteWorker)
router.patch('/:id/toggle', withAuth('curator'), toggleActivation)

// Availability
router.get('/:id/availability', cacheMiddleware(CacheTTL.SHORT), getAvailability)
router.put('/:id/availability', withAuth('curator'), upsertAvailability)
router.post('/:id/availability', withAuth('curator'), addAvailabilitySlot)
router.delete('/:id/availability/:slotId', withAuth('curator'), deleteAvailabilitySlot)

// On-chain registration
router.post('/:id/register-on-chain', withAuth('curator'), registerOnChain)

// Contact requests
router.post('/:id/contact', withAuth(), contactRateLimit, createContactRequest)
router.get('/:id/contacts', withAuth('curator'), getContactRequests)
router.patch('/:id/contacts/:requestId', withAuth('curator'), updateContactRequestStatus)

// Bookmarks
router.post('/:id/bookmark', withAuth(), toggleBookmark)

// Reviews
router.get('/:id/reviews', cacheMiddleware(CacheTTL.SHORT), listWorkerReviews)
router.post('/:id/reviews', withAuth(), createWorkerReview)
router.delete('/reviews/:id', withAuth(), deleteReview)

// Verifications
router.get('/:id/verifications', withAuth('curator', 'admin'), getWorkerVerifications)

// Analytics
router.post('/:id/analytics/view', trackView)
router.get('/:id/analytics/dashboard', withAuth('curator', 'admin'), getWorkerPersonalDashboard)
router.get('/:id/analytics/export', withAuth('curator', 'admin'), exportWorkerPersonalCsv)
router.get('/:id/analytics', withAuth('curator', 'admin'), getAnalytics)
router.get('/:id/analytics/trends', withAuth('curator', 'admin'), getViewTrends)

// Reputation (#677)
router.get('/:id/reputation', cacheMiddleware(CacheTTL.SHORT), getReputation)
router.post('/:id/reputation/sync', withAuth('admin'), syncReputation)

export default router
