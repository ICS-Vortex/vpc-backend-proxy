import {
  fetchProxyActivityAllocations,
  fetchProxyBanlist,
  fetchProxyCurrentActivities,
} from '@/repositories/proxy/ProxyRepository';
import type { Request, Response } from 'express';

export const proxyPilotsBanlist = async (req: Request, res: Response) => {
  const server = req.proxyServer;
  if (!server) {
    return res.status(403).json([]);
  }

  const banlist = await fetchProxyBanlist(server.id);
  return res.status(200).json(banlist);
};

export const proxyPilotsCurrent = async (req: Request, res: Response) => {
  const server = req.proxyServer;
  if (!server) {
    return res.status(403).json([]);
  }

  const activities = await fetchProxyCurrentActivities(server.id, false);
  return res.status(200).json(activities);
};

export const proxyPilotsAllocations = async (req: Request, res: Response) => {
  const activityId = Number(req.params.activity);
  if (!Number.isInteger(activityId) || activityId <= 0) {
    return res.status(200).json([]);
  }

  const allocations = await fetchProxyActivityAllocations(activityId);
  return res.status(200).json(allocations);
};
