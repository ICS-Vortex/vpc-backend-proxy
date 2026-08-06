import {
  fetchProxyActivityAllocations,
  fetchProxyActivitySchedule,
  fetchProxyCurrentActivities,
} from '@/repositories/proxy/ProxyRepository';
import type { Request, Response } from 'express';

export const proxyActivitiesSchedule = async (req: Request, res: Response) => {
  const server = req.proxyServer;
  if (!server) {
    return res.status(403).json([]);
  }

  const schedule = await fetchProxyActivitySchedule(server.id);
  return res.status(200).json(schedule);
};

export const proxyActivitiesCurrent = async (req: Request, res: Response) => {
  const server = req.proxyServer;
  if (!server) {
    return res.status(403).json([]);
  }

  const activities = await fetchProxyCurrentActivities(server.id, true);
  return res.status(200).json(activities);
};

export const proxyActivitiesAllocations = async (req: Request, res: Response) => {
  const activityId = Number(req.params.activity);
  if (!Number.isInteger(activityId) || activityId <= 0) {
    return res.status(200).json([]);
  }

  const allocations = await fetchProxyActivityAllocations(activityId);
  return res.status(200).json(allocations);
};
