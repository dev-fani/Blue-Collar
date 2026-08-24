import type { Request, Response } from 'express'
import { handleError } from '../utils/handleError.js'
import { getWorkerReputation, syncReputationToDb } from '../services/stellar.service.js'
import { requireParam } from '../utils/requireParam.js'

export async function getReputation(req: Request, res: Response) {
  try {
    const data = await getWorkerReputation(requireParam(req, 'id'))
    return res.json({ data, status: 'success', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}

export async function syncReputation(req: Request, res: Response) {
  try {
    const { avgRating, reviewCount, reputation } = req.body as {
      avgRating: number
      reviewCount: number
      reputation: number
    }
    const data = await syncReputationToDb(requireParam(req, 'id'), avgRating, reviewCount, reputation)
    return res.json({ data, status: 'success', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}
