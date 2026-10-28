import {NextFunction, Request, Response} from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : 'An unexpected error occurred.';
  res.status(status).json({success: false, error: {message}});
}

export const ok = <T>(res: Response, data: T, status = 200) => res.status(status).json({success: true, data});
