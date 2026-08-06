import type { Request, Response } from 'express';

export const proxyIndex = (_req: Request, res: Response) => {
  return res.status(200).type('text/plain; charset=UTF-8').send('OK');
};

export const proxyPing = (_req: Request, res: Response) => {
  return res.status(200).set('Connection', 'keep-alive').json({ ping: true });
};
