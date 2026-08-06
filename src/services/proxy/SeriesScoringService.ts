import { db } from '@/db';
import {
  insertSeriesRoundResult,
  queryProxyDuelById,
  queryProxyDuelsForSeriesRound,
  queryProxyRaceResultsForSeriesRound,
  queryProxySeriesRoundForScoring,
  queryProxySeriesRoundResultByDuelPilot,
  queryProxyValidSeriesRoundResults,
  resetSeriesRoundResultCountedFlags,
  updateDuelSeriesRound,
  updateSeriesRoundResult,
  updateSeriesRoundResultCounted,
  updateSeriesStandingRanks,
  upsertSeriesStanding,
} from '@/queries/proxy/proxySeriesQueries';
import { serializeSeriesRound } from '@/services/proxy/proxySerializers';
import type { PoolClient } from 'pg';

type ScoringConfig = Record<string, unknown>;

type SeriesRoundRow = {
  id: number;
  entryType: string;
  bestResultsCount: number;
  scoringConfig: string;
};

type RoundResultRow = {
  id: number;
  pilotId: number;
  points: number;
  rawValue: string | null;
  occurredAt: Date;
};

const parseJsonObject = (value: string): ScoringConfig => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as ScoringConfig;
    }
  } catch {
    return {};
  }
  return {};
};

const calculateRacePoints = (config: ScoringConfig, position: number) => {
  const positionPoints = config.positionPoints;
  if (positionPoints && typeof positionPoints === 'object' && !Array.isArray(positionPoints)) {
    const key = String(position);
    const mapped = (positionPoints as Record<string, unknown>)[key];
    if (typeof mapped === 'number' || typeof mapped === 'string') {
      return Number(mapped);
    }
  }

  if (position === 1) {
    const first = config.firstPlacePoints;
    return typeof first === 'number' || typeof first === 'string' ? Number(first) : 25;
  }
  if (position === 2) {
    const second = config.secondPlacePoints;
    return typeof second === 'number' || typeof second === 'string' ? Number(second) : 18;
  }
  if (position === 3) {
    const third = config.thirdPlacePoints;
    return typeof third === 'number' || typeof third === 'string' ? Number(third) : 15;
  }
  if (position > 0 && position <= 10) {
    return Math.max(0, 11 - position);
  }
  return 0;
};

const compareResults = (a: RoundResultRow, b: RoundResultRow, config: ScoringConfig) => {
  const pointsCompare = b.points - a.points;
  if (pointsCompare !== 0) {
    return pointsCompare;
  }

  const tieBreakers = Array.isArray(config.tieBreakers) ? config.tieBreakers : ['occurredAt'];
  for (const tieBreaker of tieBreakers) {
    if (tieBreaker === 'occurredAt') {
      const aTime = a.occurredAt.getTime();
      const bTime = b.occurredAt.getTime();
      if (aTime !== bTime) {
        return aTime - bTime;
      }
    }
    if (tieBreaker === 'rawValueAsc') {
      const aRaw = Number(a.rawValue ?? 0);
      const bRaw = Number(b.rawValue ?? 0);
      if (aRaw !== bRaw) {
        return aRaw - bRaw;
      }
    }
  }

  return a.id - b.id;
};

const syncRaceResults = async (client: PoolClient, round: SeriesRoundRow) => {
  const config = parseJsonObject(round.scoringConfig);
  const { rows } = await client.query(queryProxyRaceResultsForSeriesRound, [round.id]);
  let synced = 0;

  for (const row of rows as Array<{
    id: number;
    pilotId: number;
    aircraftId: number | null;
    position: number | null;
    result: number | null;
    createdAt: Date;
    existingId: number | null;
  }>) {
    const points = calculateRacePoints(config, Number(row.position ?? 0));
    const rawValue = String(row.result ?? row.position ?? '');
    const occurredAt = row.createdAt ?? new Date();

    if (row.existingId) {
      await client.query(updateSeriesRoundResult, [
        row.existingId,
        row.pilotId,
        row.aircraftId,
        rawValue,
        points,
        occurredAt,
      ]);
    } else {
      await client.query(insertSeriesRoundResult, [
        round.id,
        row.pilotId,
        row.aircraftId,
        'race',
        row.id,
        null,
        rawValue,
        points,
        occurredAt,
      ]);
    }
    synced += 1;
  }

  return synced;
};

type DuelRow = {
  id: number;
  seriesRoundId: number | null;
  leftSideId: number | null;
  rightSideId: number | null;
  winnerId: number | null;
  loserId: number | null;
  leftSideAircraftId: number | null;
  rightSideAircraftId: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
};

const buildDuelPilotResults = (round: SeriesRoundRow, duel: DuelRow) => {
  const config = parseJsonObject(round.scoringConfig);
  const winPoints = Number(config.winPoints ?? 3);
  const drawPoints = Number(config.drawPoints ?? 1);
  const lossPoints = Number(config.lossPoints ?? 0);
  const occurredAt = duel.endedAt ?? duel.startedAt ?? new Date();
  const results: Array<{
    pilotId: number;
    aircraftId: number | null;
    rawValue: string;
    points: number;
    occurredAt: Date;
  }> = [];

  const sides = [
    { pilotId: duel.leftSideId, aircraftId: duel.leftSideAircraftId },
    { pilotId: duel.rightSideId, aircraftId: duel.rightSideAircraftId },
  ];

  for (const side of sides) {
    if (!side.pilotId) {
      continue;
    }

    const isWinner = duel.winnerId === side.pilotId;
    const isLoser = duel.loserId === side.pilotId;
    const isDraw = !isWinner && !isLoser;

    let points = 0;
    let rawValue = 'loss';
    if (isWinner) {
      points = winPoints;
      rawValue = 'win';
    } else if (isDraw) {
      points = drawPoints;
      rawValue = 'draw';
    } else if (isLoser) {
      points = lossPoints;
      rawValue = 'loss';
    }

    results.push({
      pilotId: side.pilotId,
      aircraftId: side.aircraftId,
      rawValue,
      points,
      occurredAt,
    });
  }

  return results;
};

const syncDuelResults = async (client: PoolClient, round: SeriesRoundRow) => {
  const duelIdsResult = await client.query(queryProxyDuelsForSeriesRound, [round.id]);
  let synced = 0;

  for (const row of duelIdsResult.rows as Array<{ id: number }>) {
    const duelResult = await client.query(queryProxyDuelById, [row.id]);
    if (duelResult.rows.length === 0) {
      continue;
    }

    const duel = duelResult.rows[0] as DuelRow;
    if (!duel.seriesRoundId) {
      await client.query(updateDuelSeriesRound, [duel.id, round.id]);
    }

    for (const pilotResult of buildDuelPilotResults(round, duel)) {
      const existing = await client.query(queryProxySeriesRoundResultByDuelPilot, [
        round.id,
        duel.id,
        pilotResult.pilotId,
      ]);
      const existingId = (existing.rows[0] as { id: number } | undefined)?.id;

      if (existingId) {
        await client.query(updateSeriesRoundResult, [
          existingId,
          pilotResult.pilotId,
          pilotResult.aircraftId,
          pilotResult.rawValue,
          pilotResult.points,
          pilotResult.occurredAt,
        ]);
      } else {
        await client.query(insertSeriesRoundResult, [
          round.id,
          pilotResult.pilotId,
          pilotResult.aircraftId,
          'duel',
          null,
          duel.id,
          pilotResult.rawValue,
          pilotResult.points,
          pilotResult.occurredAt,
        ]);
      }
      synced += 1;
    }
  }

  return synced;
};

const recalculateStandings = async (client: PoolClient, round: SeriesRoundRow) => {
  const config = parseJsonObject(round.scoringConfig);
  await client.query(resetSeriesRoundResultCountedFlags, [round.id]);

  const { rows } = await client.query(queryProxyValidSeriesRoundResults, [round.id]);
  const resultsByPilot = new Map<number, RoundResultRow[]>();

  for (const row of rows as RoundResultRow[]) {
    const bucket = resultsByPilot.get(row.pilotId) ?? [];
    bucket.push(row);
    resultsByPilot.set(row.pilotId, bucket);
  }

  const bestN = Math.max(1, round.bestResultsCount);
  let updated = 0;

  for (const [pilotId, pilotResults] of resultsByPilot) {
    pilotResults.sort((left, right) => compareResults(left, right, config));
    const counted = pilotResults.slice(0, bestN);
    const totalPoints = counted.reduce((sum, result) => sum + result.points, 0);
    const countedIds = counted.map((result) => result.id);

    if (countedIds.length > 0) {
      await client.query(updateSeriesRoundResultCounted, [countedIds]);
    }

    await client.query(upsertSeriesStanding, [
      round.id,
      pilotId,
      totalPoints,
      JSON.stringify(countedIds),
      pilotResults.length,
    ]);
    updated += 1;
  }

  await client.query(updateSeriesStandingRanks, [round.id]);
  return updated;
};

export const recalculateSeriesRound = async (roundId: number) => {
  const roundResult = await db.query(queryProxySeriesRoundForScoring, [roundId]);
  if (roundResult.rows.length === 0) {
    return null;
  }

  const roundRow = roundResult.rows[0] as Record<string, unknown>;
  const round: SeriesRoundRow = {
    id: roundRow.id as number,
    entryType: roundRow.entryType as string,
    bestResultsCount: Number(roundRow.bestResultsCount ?? 5),
    scoringConfig: String(roundRow.scoringConfig ?? '{}'),
  };

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    if (round.entryType === 'race') {
      await syncRaceResults(client, round);
    } else if (round.entryType === 'duel') {
      await syncDuelResults(client, round);
    }
    await recalculateStandings(client, round);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return serializeSeriesRound(roundRow as Parameters<typeof serializeSeriesRound>[0]);
};
