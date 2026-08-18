import {
  buildRaceTrackLayoutByIdSubquery,
  raceEffectiveLayoutIdSql,
} from '@/queries/race/RaceLayoutQueries';
import {
  tableCheckpoint,
  tableEventsSeries,
  tableEventsSeriesRounds,
  tablePilots,
  tablePlanes,
  tableRaceAircraft,
  tableRaceLaps,
  tableRaceResults,
  tableRacers,
  tableRaceServer,
  tableRaceSessions,
  tableRaces,
  tableRaceTrackLayouts,
  tableRaceTrackSectors,
  tableRaceTrackServer,
  tableRaceTrackTournamentAircraftGroup,
  tableRaceTracks,
  tableTournamentAircraftGroupAircraft,
  tableTournamentAircraftGroups,
} from '@/tables';

const pilotCallsignSql = `COALESCE(NULLIF(p.dcs_callsign, ''), NULLIF(p.il_callsign, ''), p.username)`;

export const queryProxyRacesByServer = `
SELECT
  r.id,
  r.title,
  r.series_id AS "seriesId",
  r.series_round_id AS "seriesRoundId",
  s.title_en AS "seriesTitle",
  sr.title_en AS "roundTitle",
  to_char(r.start_time, 'YYYY-MM-DD HH24:MI:SS') AS "startTime",
  to_char(r.end_time, 'YYYY-MM-DD HH24:MI:SS') AS "endTime",
  to_char(r.started_at, 'YYYY-MM-DD HH24:MI:SS') AS "startedAt",
  to_char(r.ended_at, 'YYYY-MM-DD HH24:MI:SS') AS "endedAt",
  r.status,
  r.type,
  r.available_aircraft AS "availableAircraft",
  r.race_track_id AS "raceTrackId",
  rt.title AS "raceTrackTitle",
  rt.code AS "raceTrackCode",
  ${buildRaceTrackLayoutByIdSubquery(raceEffectiveLayoutIdSql)} AS layout
FROM ${tableRaces} r
INNER JOIN ${tableRaceServer} rs ON rs.race_id = r.id
LEFT JOIN ${tableEventsSeries} s ON s.id = r.series_id
LEFT JOIN ${tableEventsSeriesRounds} sr ON sr.id = r.series_round_id
LEFT JOIN ${tableRaceTracks} rt ON rt.id = r.race_track_id
WHERE rs.server_id = $1
  AND r.status NOT IN ('ended', 'canceled')
ORDER BY r.id ASC
`;

export const queryProxyRaceSessionsByRaceIds = `
SELECT
  rs.id,
  rs.race_id AS "raceId",
  rs.type,
  rs.status,
  rs.title,
  rs.duration,
  rs.overtime,
  rs.laps,
  rs.allow_refuel AS "allowRefuel",
  rs.allow_multiple_entries AS "allowMultipleEntries",
  rs.mass_start AS "massStart",
  rs.attempt_time AS "attemptTime",
  rs.attempt_laps AS "attemptLaps",
  rs.allowed_aircraft AS "allowedAircraft",
  rs.result_format AS "resultFormat",
  to_char(rs.start_time, 'YYYY-MM-DD HH24:MI:SS') AS "startTime",
  to_char(rs.started_at, 'YYYY-MM-DD HH24:MI:SS') AS "startedAt",
  to_char(rs.ended_at, 'YYYY-MM-DD HH24:MI:SS') AS "endedAt",
  rs.max_attempts AS "maxAttempts"
FROM ${tableRaceSessions} rs
WHERE rs.race_id = ANY($1::int[])
ORDER BY rs.race_id ASC, rs.id ASC
`;

export const queryProxyRaceAttemptsBySessionIds = `
SELECT
  r.race_session_id AS "sessionId",
  p.ucid AS "pilotUcid",
  SUM(CASE WHEN r.consume_try THEN 1 ELSE 0 END)::int AS tries,
  SUM(CASE WHEN r.consume_aircraft THEN 1 ELSE 0 END)::int AS "consumedAircraft"
FROM ${tableRacers} r
INNER JOIN ${tablePilots} p ON p.id = r.pilot_id
WHERE r.race_session_id = ANY($1::int[])
  AND p.ucid IS NOT NULL
  AND p.ucid <> ''
GROUP BY r.race_session_id, p.ucid
ORDER BY r.race_session_id ASC, p.ucid ASC
`;

export const queryProxyRaceResultsBySessionIds = `
SELECT
  rr.id,
  rr.race_session_id AS "sessionId",
  plane.name AS "acType",
  p.ucid AS "pilotUcid",
  ${pilotCallsignSql} AS "pilotName",
  rr.result::float AS result,
  (
    SELECT COUNT(*)::int
    FROM ${tableRaceLaps} rl
    WHERE rl.result_id = rr.id
  ) AS laps,
  COALESCE((
    SELECT json_agg(rl.total_time ORDER BY rl.id ASC)
    FROM ${tableRaceLaps} rl
    WHERE rl.result_id = rr.id
  ), '[]'::json) AS timings
FROM ${tableRaceResults} rr
LEFT JOIN ${tablePilots} p ON p.id = rr.pilot_id
LEFT JOIN ${tablePlanes} plane ON plane.id = rr.aircraft_id
WHERE rr.race_session_id = ANY($1::int[])
  AND rr.actual IS TRUE
ORDER BY rr.race_session_id ASC, rr.id ASC
`;

export const queryProxyRaceAircraftsByRaceIds = `
SELECT
  ra.race_id AS "raceId",
  plane.id,
  plane.name
FROM ${tableRaceAircraft} ra
INNER JOIN ${tablePlanes} plane ON plane.id = ra.aircraft_id
WHERE ra.race_id = ANY($1::int[])
ORDER BY ra.race_id ASC, plane.id ASC
`;

export const queryProxyRaceTrackLayoutsByTrackIds = `
SELECT
  rtl.id,
  rtl.race_track_id AS "raceTrackId",
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
    FROM ${tableRaceTrackSectors} rts
    WHERE rts.layout_id = rtl.id
  ), '[]'::jsonb) AS sectors
FROM ${tableRaceTrackLayouts} rtl
WHERE rtl.race_track_id = ANY($1::int[])
ORDER BY rtl.race_track_id ASC, rtl.version ASC NULLS LAST, rtl.id ASC
`;

export const queryProxyRaceTracksList = `
SELECT
  id,
  title,
  code,
  configuration
FROM ${tableRaceTracks}
WHERE legacy IS FALSE
ORDER BY id ASC
`;

export const queryProxyLegacyRaceTracksByServer = `
SELECT
  rt.id,
  rt.code,
  rt.title,
  rt.difficulty,
  rt.max_agl AS "maxAGL",
  rt.on_course_interval AS "onCourseInterval",
  rt.off_course_interval AS "offCourseInterval",
  rt.coalition,
  rt.ranking_all_display AS "rankingAllDisplay",
  rt.ranking_category_display AS "rankingCategoryDisplay",
  rt.ranking_heat_display AS "rankingHeatDisplay",
  rt.ranking_flag AS "rankingFlag",
  rt.gate_max_agl AS "gateMaxAGL",
  rt.entry_message AS "entryMessage",
  rt.gate_penalty AS "gatePenalty",
  rt.entry_gate_penalty AS "entryGatePenalty",
  rt.turn_gate_penalty AS "turnGatePenalty",
  rt.finish_race_message AS "finishRaceMessage"
FROM ${tableRaceTracks} rt
INNER JOIN ${tableRaceTrackServer} rts ON rts.race_track_id = rt.id
WHERE rts.server_id = $1
  AND rt.legacy IS TRUE
ORDER BY rt.id ASC
`;

export const queryProxyRaceTrackCheckpoints = `
SELECT
  c.id,
  c.race_track_id AS "raceTrackId",
  c.name,
  c.height,
  c.penalty,
  c.position
FROM ${tableCheckpoint} c
WHERE c.race_track_id = ANY($1::int[])
ORDER BY c.race_track_id ASC, c.position ASC NULLS LAST, c.id ASC
`;

export const queryProxyRaceTrackAircraftCategories = `
SELECT
  rtg.race_track_id AS "raceTrackId",
  tag.id AS "groupId",
  tag.title_en AS "titleEn",
  plane.name AS "aircraftName"
FROM ${tableRaceTrackTournamentAircraftGroup} rtg
INNER JOIN ${tableTournamentAircraftGroups} tag ON tag.id = rtg.tournament_aircraft_group_id
LEFT JOIN ${tableTournamentAircraftGroupAircraft} taa ON taa.tournament_aircraft_group_id = tag.id
LEFT JOIN ${tablePlanes} plane ON plane.id = taa.aircraft_id
WHERE rtg.race_track_id = ANY($1::int[])
ORDER BY rtg.race_track_id ASC, tag.id ASC, plane.id ASC
`;

export const queryProxyActiveSeries = `
SELECT
  id,
  title_en AS "titleEn",
  title_ru AS "titleRu",
  description_en AS "descriptionEn",
  description_ru AS "descriptionRu",
  timezone,
  status,
  to_char(start_at, 'YYYY-MM-DD HH24:MI:SS') AS "startAt",
  to_char(end_at, 'YYYY-MM-DD HH24:MI:SS') AS "endAt"
FROM ${tableEventsSeries}
WHERE active IS TRUE
ORDER BY id ASC
`;

export const queryProxySeriesRoundById = `
SELECT
  sr.id,
  sr.series_id AS "seriesId",
  s.title_en AS "seriesTitleEn",
  sr.position,
  sr.title_en AS "titleEn",
  sr.title_ru AS "titleRu",
  sr.entry_type AS "entryType",
  to_char(sr.start_date, 'YYYY-MM-DD') AS "startDate",
  to_char(sr.end_date, 'YYYY-MM-DD') AS "endDate",
  sr.timezone,
  s.timezone AS "seriesTimezone",
  sr.best_results_count AS "bestResultsCount",
  sr.status,
  sr.schedule_pattern AS "schedulePattern"
FROM ${tableEventsSeriesRounds} sr
INNER JOIN ${tableEventsSeries} s ON s.id = sr.series_id
WHERE sr.id = $1
LIMIT 1
`;

export const queryProxySeriesRoundsBySeriesId = `
SELECT
  sr.id,
  sr.series_id AS "seriesId",
  s.title_en AS "seriesTitleEn",
  sr.position,
  sr.title_en AS "titleEn",
  sr.title_ru AS "titleRu",
  sr.entry_type AS "entryType",
  to_char(sr.start_date, 'YYYY-MM-DD') AS "startDate",
  to_char(sr.end_date, 'YYYY-MM-DD') AS "endDate",
  sr.timezone,
  s.timezone AS "seriesTimezone",
  sr.best_results_count AS "bestResultsCount",
  sr.status,
  sr.schedule_pattern AS "schedulePattern"
FROM ${tableEventsSeriesRounds} sr
INNER JOIN ${tableEventsSeries} s ON s.id = sr.series_id
WHERE sr.series_id = $1
ORDER BY sr.position ASC, sr.id ASC
`;

export const queryProxySeriesExists = `
SELECT id
FROM ${tableEventsSeries}
WHERE id = $1
LIMIT 1
`;
