import type { Prisma } from '@prisma/client'

/**
 * Common pagination options
 */
export interface PaginationOpts {
  skip?: number
  take?: number
}

/**
 * Common filtering options
 */
export interface FilterOpts<TWhere = Prisma.WorkerWhereInput> {
  where?: TWhere
}

/**
 * Common sorting options
 */
export interface SortOpts<TOrderBy = Prisma.WorkerOrderByWithRelationInput> {
  orderBy?: TOrderBy
}

/**
 * Query builder for common Prisma patterns.
 *
 * `filter`, `sort` and `buildQuery` are generic over the model's `WhereInput`
 * and `OrderByWithRelationInput` so a caller gets back the shape its own
 * delegate accepts; they default to `Worker`, the only model using them today.
 */
export class QueryBuilder {
  /**
   * Build pagination parameters
   */
  static pagination(opts: PaginationOpts = {}) {
    const { skip = 0, take = 20 } = opts
    return { skip, take: Math.min(take, 100) } // Cap at 100 to prevent abuse
  }

  /**
   * Build default sort order (newest first)
   */
  static defaultSort() {
    return { createdAt: 'desc' as const }
  }

  /**
   * Build sort order with validation
   */
  static sort<TOrderBy = Prisma.WorkerOrderByWithRelationInput>(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): TOrderBy {
    const validFields = ['createdAt', 'updatedAt', 'name', 'rating']
    const field = sortBy && validFields.includes(sortBy) ? sortBy : 'createdAt'
    return { [field]: sortOrder } as TOrderBy
  }

  /**
   * Build filter with optional conditions
   */
  static filter<TWhere = Prisma.WorkerWhereInput>(conditions: Record<string, unknown> = {}): TWhere {
    const where: Record<string, unknown> = {}
    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        where[key] = value
      }
    })
    return where as TWhere
  }

  /**
   * Build a complete query with pagination, filtering, and sorting
   */
  static buildQuery<
    TWhere = Prisma.WorkerWhereInput,
    TOrderBy = Prisma.WorkerOrderByWithRelationInput,
  >(opts: {
    pagination?: PaginationOpts
    filter?: Record<string, unknown>
    sort?: { field?: string; order?: 'asc' | 'desc' }
  } = {}) {
    const { pagination = {}, filter = {}, sort = {} } = opts
    return {
      ...this.pagination(pagination),
      where: this.filter<TWhere>(filter),
      orderBy: this.sort<TOrderBy>(sort.field, sort.order),
    }
  }
}
