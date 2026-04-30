import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
import { ApiError } from '../utils/ApiError';

type Source = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodTypeAny, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        ApiError.validation(result.error.flatten().fieldErrors, `Invalid ${source}`),
      );
    }
    // Replace the source with the parsed (and possibly transformed) value.
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
