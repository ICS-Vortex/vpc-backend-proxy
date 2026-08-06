import {
  tableActivities,
  tableActivitiesAllocations,
  tableActivityAllocationDuel,
  tableDuels,
  tableEventsSeries,
  tableEventsSeriesRoundResults,
  tableEventsSeriesRounds,
  tableEventsSeriesStandings,
  tablePilots,
  tablePlanes,
  tableRaceResults,
  tableRaceSessions,
  tableRaces,
} from '@/tables';

const pilotCallsignSql = `COALESCE(NULLIF(p.dcs_callsign, ''), NULLIF(p.il_callsign, ''), p.username)`;

export const queryProxySeriesRoundForScoring = `
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
  sr.schedule_pattern AS "schedulePattern",
  sr.scoring_config AS "scoringConfig"
FROM ${tableEventsSeriesRounds} sr
INNER JOIN ${tableEventsSeries} s ON s.id = sr.series_id
WHERE sr.id = $1
LIMIT 1
`;

export const queryProxyRaceResultsForSeriesRound = `
SELECT
  rr.id,
  rr.pilot_id AS "pilotId",
  rr.aircraft_id AS "aircraftId",
  rr.position,
  rr.result,
  rr.created_at AS "createdAt",
  existing.id AS "existingId"
FROM ${tableRaceResults} rr
INNER JOIN ${tableRaceSessions} rs ON rs.id = rr.race_session_id
INNER JOIN ${tableRaces} r ON r.id = rs.race_id
LEFT JOIN ${tableEventsSeriesRoundResults} existing
  ON existing.round_id = $1 AND existing.race_result_id = rr.id
WHERE r.series_round_id = $1
  AND rr.actual IS TRUE
  AND rr.pilot_id IS NOT NULL
ORDER BY rr.id ASC
`;

export const queryProxyDuelsForSeriesRound = `
SELECT DISTINCT d.id
FROM ${tableDuels} d
WHERE d.series_round_id = $1
  AND d.merged IS TRUE

UNION

SELECT DISTINCT d.id
FROM ${tableDuels} d
INNER JOIN ${tableActivityAllocationDuel} aad ON aad.duel_id = d.id
INNER JOIN ${tableActivitiesAllocations} aa ON aa.id = aad.activity_allocation_id
INNER JOIN ${tableActivities} a ON a.id = aa.activity_id
WHERE a.series_round_id = $1
  AND d.merged IS TRUE
`;

export const queryProxyDuelById = `
SELECT
  d.id,
  d.series_round_id AS "seriesRoundId",
  d.left_side_id AS "leftSideId",
  d.right_side_id AS "rightSideId",
  d.winner_id AS "winnerId",
  d.loser_id AS "loserId",
  d.left_side_aircraft_id AS "leftSideAircraftId",
  d.right_side_aircraft_id AS "rightSideAircraftId",
  d.started_at AS "startedAt",
  d.ended_at AS "endedAt"
FROM ${tableDuels} d
WHERE d.id = $1
LIMIT 1
`;

export const queryProxySeriesRoundResultByDuelPilot = `
SELECT id
FROM ${tableEventsSeriesRoundResults}
WHERE round_id = $1
  AND duel_id = $2
  AND pilot_id = $3
LIMIT 1
`;

export const queryProxyValidSeriesRoundResults = `
SELECT
  id,
  pilot_id AS "pilotId",
  points::float AS points,
  raw_value AS "rawValue",
  occurred_at AS "occurredAt"
FROM ${tableEventsSeriesRoundResults}
WHERE round_id = $1
  AND status = 'valid'
ORDER BY id ASC
`;

export const queryProxySeriesStandingsByRound = `
SELECT
  st.rank,
  st.pilot_id AS "pilotId",
  ${pilotCallsignSql} AS callsign,
  st.points::float AS points,
  st.results_count AS "resultsCount",
  st.counted_result_ids AS "countedResultIds"
FROM ${tableEventsSeriesStandings} st
INNER JOIN ${tablePilots} p ON p.id = st.pilot_id
WHERE st.round_id = $1
ORDER BY st.rank ASC NULLS LAST, st.points DESC, st.pilot_id ASC
`;

export const queryProxySeriesPilotResults = `
SELECT
  rr.id,
  rr.source_type AS "sourceType",
  rr.points::float AS points,
  rr.raw_value AS "rawValue",
  to_char(rr.occurred_at, 'YYYY-MM-DD HH24:MI:SS') AS "occurredAt",
  rr.counted,
  plane.name AS aircraft
FROM ${tableEventsSeriesRoundResults} rr
LEFT JOIN ${tablePlanes} plane ON plane.id = rr.aircraft_id
WHERE rr.round_id = $1
  AND rr.pilot_id = $2
  AND rr.status = 'valid'
ORDER BY rr.points DESC, rr.occurred_at ASC, rr.id ASC
`;

export const queryProxySeriesStandingForPilot = `
SELECT points::float AS points, counted_result_ids AS "countedResultIds"
FROM ${tableEventsSeriesStandings}
WHERE round_id = $1 AND pilot_id = $2
LIMIT 1
`;

export const queryProxyPilotExists = `
SELECT id, ${pilotCallsignSql} AS callsign
FROM ${tablePilots} p
WHERE p.id = $1
LIMIT 1
`;

export const resetSeriesRoundResultCountedFlags = `
UPDATE ${tableEventsSeriesRoundResults}
SET counted = FALSE
WHERE round_id = $1
`;

export const insertSeriesRoundResult = `
INSERT INTO ${tableEventsSeriesRoundResults} (
  round_id, pilot_id, aircraft_id, source_type, race_result_id, duel_id,
  raw_value, points, status, occurred_at, counted, created_at, updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, 'valid', $9, FALSE, NOW(), NOW()
)
RETURNING id
`;

export const updateSeriesRoundResult = `
UPDATE ${tableEventsSeriesRoundResults}
SET
  pilot_id = $2,
  aircraft_id = $3,
  raw_value = $4,
  points = $5,
  status = 'valid',
  occurred_at = $6,
  updated_at = NOW()
WHERE id = $1
`;

export const upsertSeriesStanding = `
INSERT INTO ${tableEventsSeriesStandings} (
  round_id, pilot_id, points, counted_result_ids, results_count, recalculated_at, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
ON CONFLICT (round_id, pilot_id) DO UPDATE SET
  points = EXCLUDED.points,
  counted_result_ids = EXCLUDED.counted_result_ids,
  results_count = EXCLUDED.results_count,
  recalculated_at = EXCLUDED.recalculated_at,
  updated_at = NOW()
`;

export const updateSeriesRoundResultCounted = `
UPDATE ${tableEventsSeriesRoundResults}
SET counted = TRUE
WHERE id = ANY($1::int[])
`;

export const updateSeriesStandingRanks = `
UPDATE ${tableEventsSeriesStandings} st
SET rank = ranked.rank
FROM (
  SELECT pilot_id, ROW_NUMBER() OVER (ORDER BY points DESC, pilot_id ASC) AS rank
  FROM ${tableEventsSeriesStandings}
  WHERE round_id = $1
) ranked
WHERE st.round_id = $1 AND st.pilot_id = ranked.pilot_id
`;

export const updateDuelSeriesRound = `
UPDATE ${tableDuels}
SET series_round_id = $2
WHERE id = $1 AND series_round_id IS NULL
`;
