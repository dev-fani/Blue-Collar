import type { Request, Response } from 'express'
import * as availabilityService from '../services/availability.service.js'
import { handleError } from '../utils/handleError.js'
import { requireParam } from '../utils/requireParam.js'

export async function getAvailability(req: Request, res: Response) {
  try {
    const availability = await availabilityService.getAvailability(requireParam(req, 'id'))
    return res.json({ data: availability, status: 'success', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}

export async function upsertAvailability(req: Request, res: Response) {
  try {
    const result = await availabilityService.upsertAvailability(requireParam(req, 'id'), req.body)
    return res.json({ data: result, status: 'success', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}

export async function addAvailabilitySlot(req: Request, res: Response) {
  try {
    const slot = await availabilityService.addAvailabilitySlot(requireParam(req, 'id'), req.body)
    return res.status(201).json({ data: slot, status: 'success', code: 201 })
  } catch (err) {
    return handleError(res, err)
  }
}

export async function deleteAvailabilitySlot(req: Request, res: Response) {
  try {
    await availabilityService.deleteAvailabilitySlot(requireParam(req, 'id'), requireParam(req, 'slotId'))
    return res.status(204).send()
  } catch (err) {
    return handleError(res, err)
  }
}
