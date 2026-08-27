import { expect } from 'vitest';
import type { Response } from 'supertest';

export const isExpressNotFound = (response: Response): boolean => {
  if (response.status !== 404) {
    return false;
  }

  const contentType = String(response.headers['content-type'] ?? '');
  return contentType.includes('text/html');
};

export const expectRouteRegistered = (response: Response): void => {
  expect(isExpressNotFound(response)).toBe(false);
};
