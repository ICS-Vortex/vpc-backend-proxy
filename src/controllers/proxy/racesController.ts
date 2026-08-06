import {
  fetchProxyRaceTrackConfigs,
  fetchProxyRaces,
  fetchProxyRaceTracksList,
} from '@/repositories/proxy/ProxyRacingRepository';
import type { Request, Response } from 'express';

export const proxyRacesList = async (req: Request, res: Response) => {
  const server = req.proxyServer;
  if (!server) {
    return res.status(403).json([]);
  }

  const races = await fetchProxyRaces(server.id);
  return res.status(200).json(races);
};

export const proxyRaceTracksList = async (req: Request, res: Response) => {
  if (!req.proxyServer) {
    return res.status(403).json([]);
  }

  const tracks = await fetchProxyRaceTracksList();
  return res.status(200).json(tracks);
};

export const proxyRaceTracksConfigs = async (req: Request, res: Response) => {
  const server = req.proxyServer;
  if (!server) {
    return res.status(403).json([]);
  }

  const configs = await fetchProxyRaceTrackConfigs(server.id);
  return res.status(200).json(configs);
};
