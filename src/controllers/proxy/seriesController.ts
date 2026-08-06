import {
  fetchProxySeriesList,
  fetchProxySeriesRounds,
} from '@/repositories/proxy/ProxyRacingRepository';
import {
  fetchProxySeriesRoundPilotResults,
  fetchProxySeriesRoundStandings,
} from '@/repositories/proxy/ProxySeriesRepository';
import type { Request, Response } from 'express';

export const proxySeriesList = async (req: Request, res: Response) => {
  if (!req.proxyServer) {
    return res.status(403).json([]);
  }

  const series = await fetchProxySeriesList();
  return res.status(200).json(series);
};

export const proxySeriesRounds = async (req: Request, res: Response) => {
  if (!req.proxyServer) {
    return res.status(403).json([]);
  }

  const seriesId = Number(req.params.series);
  if (!Number.isInteger(seriesId) || seriesId <= 0) {
    return res.status(404).json([]);
  }

  const rounds = await fetchProxySeriesRounds(seriesId);
  if (rounds === null) {
    return res.status(404).json([]);
  }

  return res.status(200).json(rounds);
};

export const proxySeriesRoundStandings = async (req: Request, res: Response) => {
  if (!req.proxyServer) {
    return res.status(403).json([]);
  }

  const roundId = Number(req.params.round);
  if (!Number.isInteger(roundId) || roundId <= 0) {
    return res.status(404).json([]);
  }

  const payload = await fetchProxySeriesRoundStandings(roundId);
  if (!payload) {
    return res.status(404).json([]);
  }

  return res.status(200).json(payload);
};

export const proxySeriesRoundPilotResults = async (req: Request, res: Response) => {
  if (!req.proxyServer) {
    return res.status(403).json([]);
  }

  const roundId = Number(req.params.round);
  const pilotId = Number(req.params.pilot);
  if (!Number.isInteger(roundId) || roundId <= 0 || !Number.isInteger(pilotId) || pilotId <= 0) {
    return res.status(404).json([]);
  }

  const payload = await fetchProxySeriesRoundPilotResults(roundId, pilotId);
  if (!payload) {
    return res.status(404).json([]);
  }

  return res.status(200).json(payload);
};
