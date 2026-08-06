import { DCS_PILOT_HEADER } from '@/constants/dcsHeaders';
import { fetchProxyPilotRights } from '@/repositories/proxy/ProxyRepository';
import type { Request, Response } from 'express';

export const proxyRightsList = async (req: Request, res: Response) => {
  if (!req.proxyServer) {
    return res.status(403).json([]);
  }

  const ucid = req.header(DCS_PILOT_HEADER) ?? null;
  // Match Symfony proxy RightsController behavior.
  if (ucid) {
    return res.status(404).json([]);
  }

  const rights = await fetchProxyPilotRights(ucid);
  if (rights === null) {
    return res.status(404).json([]);
  }

  return res.status(200).json(rights);
};
