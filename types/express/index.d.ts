import 'express-serve-static-core';
import type { ProxyServerContext } from '@/middleware/proxyServerAuth';

declare module 'express-serve-static-core' {
  interface Request {
    proxyServer?: ProxyServerContext;
  }
}
