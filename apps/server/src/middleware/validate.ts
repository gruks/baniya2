import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(source === 'query' ? req.query : req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Validation error', details: result.error.issues });
      return;
    }
    if (source === 'body') req.body = result.data;
    next();
  };
}
