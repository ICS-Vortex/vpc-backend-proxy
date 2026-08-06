import { db } from '@/db';
import {
  queryProxyPilotExists,
  queryProxySeriesPilotResults,
  queryProxySeriesRoundForScoring,
  queryProxySeriesStandingsByRound,
  queryProxySeriesStandingForPilot,
} from '@/queries/proxy/proxySeriesQueries';
import { recalculateSeriesRound } from '@/services/proxy/SeriesScoringService';

const parseCountedResultIds = (value: unknown): number[] => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id));
      }
    } catch {
      return [];
    }
  }

  if (Array.isArray(value)) {
    return value.map((id) => Number(id)).filter((id) => Number.isInteger(id));
  }

  return [];
};

export const fetchProxySeriesRoundStandings = async (roundId: number) => {
  const round = await recalculateSeriesRound(roundId);
  if (!round) {
    return null;
  }

  const { rows } = await db.query(queryProxySeriesStandingsByRound, [roundId]);
  const standings = rows.map((row) => ({
    rank: row.rank,
    pilotId: row.pilotId,
    callsign: row.callsign,
    points: row.points,
    resultsCount: row.resultsCount,
    countedResultIds: parseCountedResultIds(row.countedResultIds),
  }));

  return { round, standings };
};

export const fetchProxySeriesRoundPilotResults = async (roundId: number, pilotId: number) => {
  const roundResult = await db.query(queryProxySeriesRoundForScoring, [roundId]);
  if (roundResult.rows.length === 0) {
    return null;
  }

  const pilotResult = await db.query(queryProxyPilotExists, [pilotId]);
  if (pilotResult.rows.length === 0) {
    return null;
  }

  const round = await recalculateSeriesRound(roundId);
  if (!round) {
    return null;
  }

  const standingResult = await db.query(queryProxySeriesStandingForPilot, [roundId, pilotId]);
  const standingRow = standingResult.rows[0] as { points: number; countedResultIds: unknown } | undefined;
  const countedIds = parseCountedResultIds(standingRow?.countedResultIds);
  const pilotRow = pilotResult.rows[0] as { id: number; callsign: string | null };

  const { rows } = await db.query(queryProxySeriesPilotResults, [roundId, pilotId]);
  const results = rows.map((row) => ({
    id: row.id,
    sourceType: row.sourceType,
    points: row.points,
    rawValue: row.rawValue,
    occurredAt: row.occurredAt,
    counted: countedIds.includes(Number(row.id)),
    aircraft: row.aircraft,
  }));

  return {
    round,
    pilot: {
      id: pilotRow.id,
      callsign: pilotRow.callsign,
    },
    roundPoints: standingRow?.points ?? 0,
    results,
  };
};
