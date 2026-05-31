import type { PaginatedResult } from './paginated-result.type';
import type { PaginationDto } from './pagination.dto';

interface PrismaDelegate<T> {
  findMany(args: Record<string, unknown>): Promise<T[]>;
  count(args: Record<string, unknown>): Promise<number>;
}

export async function paginate<T>(
  model: PrismaDelegate<T>,
  args: Record<string, unknown>,
  pagination: PaginationDto
): Promise<PaginatedResult<T>> {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({ ...args, skip, take: limit }),
    model.count({ where: (args.where ?? {}) as Record<string, unknown> }),
  ]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
