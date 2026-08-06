import { db } from '@/db';
import {
  queryProxyLegacyRaceTracksByServer,
  queryProxyRaceAttemptsBySessionIds,
  queryProxyRaceAircraftsByRaceIds,
  queryProxyRaceResultsBySessionIds,
  queryProxyRacesByServer,
  queryProxyRaceSessionsByRaceIds,
  queryProxyRaceTrackAircraftCategories,
  queryProxyRaceTrackCheckpoints,
  queryProxyRaceTrackLayoutsByTrackIds,
  queryProxyRaceTracksList,
} from '@/queries/proxy/proxyRacingQueries';
import {
  queryProxyActiveSeries,
  queryProxySeriesExists,
  queryProxySeriesRoundsBySeriesId,
} from '@/queries/proxy/proxyRacingQueries';
import {
  serializeRaceTrackLayout,
  serializeRaceTrackListItem,
  serializeSeriesRound,
} from '@/services/proxy/proxySerializers';

type LayoutRow = {
  id: number;
  raceTrackId: number;
  code: string;
  title: string;
  version: number | null;
  isActive: boolean;
  configuration?: string | null;
  sectors: unknown;
};

const addSlashes = (value: string) => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\0/g, '\\0');
};

type AttemptRow = {
  sessionId: number;
  pilotUcid: string;
  tries: number;
  consumedAircraft: number;
};

type CheckpointRow = {
  raceTrackId: number;
  id: number;
  name: string;
  height: number;
  penalty: number;
};

const groupBy = <T extends Record<string, unknown>, K extends keyof T>(
  rows: T[],
  key: K,
): Map<T[K], T[]> => {
  const map = new Map<T[K], T[]>();
  for (const row of rows) {
    const groupKey = row[key];
    const bucket = map.get(groupKey);
    if (bucket) {
      bucket.push(row);
    } else {
      map.set(groupKey, [row]);
    }
  }
  return map;
};

const enrichLayouts = async (layoutIds: number[]) => {
  if (layoutIds.length === 0) {
    return new Map<number, ReturnType<typeof serializeRaceTrackLayout>>();
  }

  const { rows } = await db.query(
    `SELECT
      rtl.id,
      rtl.code,
      rtl.title,
      rtl.version,
      rtl.is_active AS "isActive",
      rtl.configuration,
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', rts.id,
            'title', rts.title,
            'code', rts.code,
            'position', rts.position
          )
          ORDER BY rts.position ASC NULLS LAST, rts.id ASC
        )
        FROM race_track_sectors rts
        WHERE rts.layout_id = rtl.id
      ), '[]'::jsonb) AS sectors
    FROM race_track_layouts rtl
    WHERE rtl.id = ANY($1::int[])`,
    [layoutIds],
  );

  return new Map<number, ReturnType<typeof serializeRaceTrackLayout>>(
    (rows as LayoutRow[]).map((row) => [row.id, serializeRaceTrackLayout(row)]),
  );
};

export const fetchProxyRaces = async (serverId: number) => {
  const { rows: races } = await db.query(queryProxyRacesByServer, [serverId]);
  if (races.length === 0) {
    return [];
  }

  const raceIds = races.map((row: { id: number }) => row.id);
  const layoutIds = races
    .map((row: { layout?: { id?: number } | null }) => row.layout?.id)
    .filter((id: number | undefined): id is number => typeof id === 'number');

  const [sessionsResult, aircraftsResult, layoutsById] = await Promise.all([
    db.query(queryProxyRaceSessionsByRaceIds, [raceIds]),
    db.query(queryProxyRaceAircraftsByRaceIds, [raceIds]),
    enrichLayouts(layoutIds),
  ]);

  const sessions = sessionsResult.rows as Array<{ id: number; raceId: number }>;
  const sessionIds = sessions.map((session) => session.id);

  let attemptsResult: { rows: unknown[] } = { rows: [] };
  let resultsResult: { rows: unknown[] } = { rows: [] };
  if (sessionIds.length > 0) {
    [attemptsResult, resultsResult] = await Promise.all([
      db.query(queryProxyRaceAttemptsBySessionIds, [sessionIds]),
      db.query(queryProxyRaceResultsBySessionIds, [sessionIds]),
    ]);
  }

  const attemptsBySession = groupBy(attemptsResult.rows as AttemptRow[], 'sessionId');
  const resultsBySession = groupBy(resultsResult.rows as Array<{ sessionId: number }>, 'sessionId');
  const sessionsByRace = groupBy(sessions, 'raceId');
  const aircraftsByRace = groupBy(aircraftsResult.rows as Array<{ raceId: number }>, 'raceId');

  return races.map((race: Record<string, unknown>) => {
    const raceId = race.id as number;
    const layoutValue = race.layout as { id?: number } | null;
    const layout = layoutValue?.id ? layoutsById.get(layoutValue.id) ?? layoutValue : undefined;

    const raceSessions = (sessionsByRace.get(raceId) ?? []).map((session) => {
      const sessionRow = session as Record<string, unknown>;
      const sessionId = sessionRow.id as number;
      const attempts = (attemptsBySession.get(sessionId) ?? []).map((attempt) => ({
        pilotUcid: attempt.pilotUcid,
        tries: attempt.tries,
        consumedAircraft: attempt.consumedAircraft,
      }));
      const results = (resultsBySession.get(sessionId) ?? []).map((result) => {
        const resultRow = result as Record<string, unknown>;
        return {
          acType: resultRow.acType,
          pilotUcid: resultRow.pilotUcid,
          pilotName: resultRow.pilotName,
          result: resultRow.result,
          laps: resultRow.laps,
          timings: resultRow.timings ?? [],
        };
      });

      return {
        ...sessionRow,
        attempts,
        results,
      };
    });

    const track = race.raceTrackId
      ? {
          id: race.raceTrackId,
          title: race.raceTrackTitle,
          code: race.raceTrackCode,
        }
      : [];

    const payload: Record<string, unknown> = {
      id: race.id,
      title: race.title,
      seriesId: race.seriesId,
      seriesRoundId: race.seriesRoundId,
      seriesTitle: race.seriesTitle,
      roundTitle: race.roundTitle,
      startTime: race.startTime,
      endTime: race.endTime,
      startedAt: race.startedAt,
      endedAt: race.endedAt,
      status: race.status,
      type: race.type,
      availableAircraft: race.availableAircraft,
      sessions: raceSessions,
      aircrafts: aircraftsByRace.get(raceId) ?? [],
      track,
    };

    if (layout) {
      payload.layout = layout;
    }

    return payload;
  });
};

export const fetchProxyRaceTracksList = async () => {
  const { rows: tracks } = await db.query(queryProxyRaceTracksList);
  if (tracks.length === 0) {
    return [];
  }

  const trackIds = tracks.map((row: { id: number }) => row.id);
  const layoutsByTrack = groupBy(
    (await db.query(queryProxyRaceTrackLayoutsByTrackIds, [trackIds])).rows as LayoutRow[],
    'raceTrackId',
  );

  return tracks.map((track: { id: number; title: string; code: string; configuration?: string | null }) => {
    const layouts = (layoutsByTrack.get(track.id) ?? []) as LayoutRow[];
    return serializeRaceTrackListItem(track, layouts);
  });
};

export const fetchProxyRaceTrackConfigs = async (serverId: number) => {
  const { rows: tracks } = await db.query(queryProxyLegacyRaceTracksByServer, [serverId]);
  if (tracks.length === 0) {
    return [];
  }

  const trackIds = tracks.map((row: { id: number }) => row.id);
  const [checkpointsResult, categoriesResult] = await Promise.all([
    db.query(queryProxyRaceTrackCheckpoints, [trackIds]),
    db.query(queryProxyRaceTrackAircraftCategories, [trackIds]),
  ]);

  const checkpointsByTrack = groupBy(
    checkpointsResult.rows as CheckpointRow[],
    'raceTrackId',
  );
  const categoriesByTrack = groupBy(
    categoriesResult.rows as Array<{ raceTrackId: number; titleEn: string; aircraftName: string | null }>,
    'raceTrackId',
  );

  return tracks.map((track: Record<string, unknown>) => {
    const trackId = track.id as number;
    const categoryRows = categoriesByTrack.get(trackId) ?? [];
    const categoriesNames: string[] = [];
    const categories: string[][] = [];
    const aircraftGroups: Record<string, string> = {};
    const groups = new Map<string, string[]>();

    for (const row of categoryRows) {
      const titleEn = row.titleEn;
      if (!categoriesNames.includes(titleEn)) {
        categoriesNames.push(titleEn);
      }
      if (row.aircraftName) {
        if (!groups.has(titleEn)) {
          groups.set(titleEn, []);
        }
        groups.get(titleEn)?.push(row.aircraftName);
        aircraftGroups[row.aircraftName] = titleEn;
      }
    }

    for (const name of categoriesNames) {
      categories.push(groups.get(name) ?? []);
    }

    const checkpoints = (checkpointsByTrack.get(trackId) ?? []).map((checkpoint) => ({
      id: checkpoint.id,
      name: checkpoint.name,
      height: checkpoint.height,
      penalty: checkpoint.penalty,
    }));

    return {
      code: track.code,
      name: track.title,
      waypoints: checkpoints,
      difficulty: track.difficulty,
      maxagl: track.maxAGL,
      oncourseinterval: track.onCourseInterval,
      offcourseinterval: track.offCourseInterval,
      categories,
      categorynames: categoriesNames,
      coalition: track.coalition,
      rankingalldisplay: track.rankingAllDisplay,
      rankingcategorydisplay: track.rankingCategoryDisplay,
      rankingheatdisplay: track.rankingHeatDisplay,
      rankingflag: track.rankingFlag,
      gatemaxagl: track.gateMaxAGL,
      entrymsg: addSlashes(String(track.entryMessage ?? '')),
      gatepenalty: track.gatePenalty,
      entrygatepenalty: track.entryGatePenalty,
      turngatepenalty: track.turnGatePenalty,
      finishmsg: track.finishRaceMessage,
      aircraftgroups: aircraftGroups,
    };
  });
};

export const fetchProxySeriesList = async () => {
  const { rows } = await db.query(queryProxyActiveSeries);
  return rows;
};

export const fetchProxySeriesRounds = async (seriesId: number) => {
  const exists = await db.query(queryProxySeriesExists, [seriesId]);
  if (exists.rows.length === 0) {
    return null;
  }

  const { rows } = await db.query(queryProxySeriesRoundsBySeriesId, [seriesId]);
  return rows.map((row) => serializeSeriesRound(row as Parameters<typeof serializeSeriesRound>[0]));
};
