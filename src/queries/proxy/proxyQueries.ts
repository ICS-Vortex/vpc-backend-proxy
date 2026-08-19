import {
  tableActivities,
  tableActivitiesAllocations,
  tableActivitiesServers,
  tableActivityAllocationTeamLeft,
  tableActivityAllocationTeamRight,
  tableActivityParticipationRequests,
  tableAllocationTeamMembers,
  tableBanlist,
  tablePilots,
  tablePlanes,
  tableServers,
  tableTournamentStages,
} from '@/tables';

const pilotCallsignSql = `COALESCE(NULLIF(p.dcs_callsign, ''), NULLIF(p.il_callsign, ''), p.username)`;

export const queryProxyServerByIdentifier = `
SELECT id, identifier, active
FROM ${tableServers}
WHERE identifier = $1
LIMIT 1
`;

export const queryProxyBanlist = `
SELECT p.ucid
FROM ${tableBanlist} b
INNER JOIN ${tablePilots} p ON p.id = b.pilot_id
WHERE b.server_id = $1
  AND b.banned_until IS NOT NULL
  AND b.banned_until > NOW()
ORDER BY b.id ASC
`;

export const queryProxyActivitySchedule = `
SELECT
  a.id,
  to_char(a.start, 'YYYY-MM-DD HH24:MI:SS') AS "startTime"
FROM ${tableActivities} a
INNER JOIN ${tableActivitiesServers} asrv ON asrv.activity_id = a.id
WHERE asrv.server_id = $1
  AND a.hidden = FALSE
  AND a.status NOT IN ('ended', 'canceled', 'waiting_registration')
ORDER BY a.start ASC NULLS LAST, a.id ASC
`;

export const queryProxyPendingActivities = `
SELECT
  a.id,
  a.type,
  a.status,
  a.title_en AS "titleEn",
  a.title_ru AS "titleRu",
  a.slug,
  a.awaiting_time AS "awaitingTime",
  to_char(a.start, 'YYYY-MM-DD HH24:MI:SS') AS "startTime",
  to_char(a.end, 'YYYY-MM-DD HH24:MI:SS') AS "endTime",
  a.rounds AS "bestOf",
  a.series_id AS "seriesId",
  a.series_round_id AS "seriesRoundId",
  s.title_en AS "seriesTitle",
  sr.title_en AS "roundTitle",
  (ts.id IS NOT NULL AND ts.tournament_id IS NOT NULL) AS "isTournament",
  COALESCE(ts.qualification, FALSE) AS "isQualification",
  COALESCE(ts.rounds_to_play, 0) AS "roundsToBePlayed",
  COALESCE(ts.best_of_allocation, '[]') AS "bestOfAllocation"
FROM ${tableActivities} a
INNER JOIN ${tableActivitiesServers} asrv ON asrv.activity_id = a.id
LEFT JOIN events_series s ON s.id = a.series_id
LEFT JOIN events_series_rounds sr ON sr.id = a.series_round_id
LEFT JOIN ${tableTournamentStages} ts ON ts.id = a.tournament_stage_id
WHERE asrv.server_id = $1
  AND a.hidden = FALSE
  AND a.status IN ('allocated', 'started')
ORDER BY a.id ASC
`;

export const queryProxyActivityParticipants = `
SELECT
  apr.activity_id AS "activityId",
  p.ucid,
  ${pilotCallsignSql} AS callsign,
  plane.name AS aircraft,
  apr.arrived
FROM ${tableActivityParticipationRequests} apr
INNER JOIN ${tablePilots} p ON p.id = apr.pilot_id
LEFT JOIN ${tablePlanes} plane ON plane.id = apr.aircraft_id
WHERE apr.activity_id = ANY($1::int[])
ORDER BY apr.id ASC
`;

export const queryProxyActivityAircrafts = `
SELECT
  aa.activity_id AS "activityId",
  plane.id,
  plane.name
FROM activity_aircraft aa
INNER JOIN ${tablePlanes} plane ON plane.id = aa.aircraft_id
WHERE aa.activity_id = ANY($1::int[])
ORDER BY plane.id ASC
`;

export const queryProxyActivityAllocations = `
SELECT
  alloc.id,
  alloc.activity_id AS "activityId",
  alloc.round_number AS "roundNumber",
  alloc.rounds_played AS "roundsPlayed",
  alloc.team_left_points AS "teamLeftPoints",
  alloc.team_right_points AS "teamRightPoints",
  alloc.status
FROM ${tableActivitiesAllocations} alloc
WHERE alloc.activity_id = ANY($1::int[])
ORDER BY alloc.id ASC
`;

export const queryProxyAllocationTeamMembers = `
SELECT
  atl.activity_allocation_id AS "allocationId",
  'left' AS side,
  tm.id,
  p.ucid,
  ${pilotCallsignSql} AS callsign,
  plane.name AS aircraft
FROM ${tableActivityAllocationTeamLeft} atl
INNER JOIN ${tableAllocationTeamMembers} tm ON tm.id = atl.team_member_id
LEFT JOIN ${tablePilots} p ON p.id = tm.pilot_id
LEFT JOIN ${tablePlanes} plane ON plane.id = tm.aircraft_id
WHERE atl.activity_allocation_id = ANY($1::int[])

UNION ALL

SELECT
  atr.activity_allocation_id AS "allocationId",
  'right' AS side,
  tm.id,
  p.ucid,
  ${pilotCallsignSql} AS callsign,
  plane.name AS aircraft
FROM ${tableActivityAllocationTeamRight} atr
INNER JOIN ${tableAllocationTeamMembers} tm ON tm.id = atr.team_member_id
LEFT JOIN ${tablePilots} p ON p.id = tm.pilot_id
LEFT JOIN ${tablePlanes} plane ON plane.id = tm.aircraft_id
WHERE atr.activity_allocation_id = ANY($1::int[])

ORDER BY "allocationId" ASC, side ASC, id ASC
`;

export const queryProxyActivityAllocationsByActivityId = `
SELECT
  alloc.id,
  alloc.round_number AS "roundNumber",
  alloc.rounds_played AS "roundsPlayed",
  alloc.team_left_points AS "teamLeftPoints",
  alloc.team_right_points AS "teamRightPoints",
  alloc.status
FROM ${tableActivitiesAllocations} alloc
WHERE alloc.activity_id = $1
ORDER BY alloc.id ASC
`;

export const queryProxyAllocationTeamMembersByActivityId = `
SELECT
  atl.activity_allocation_id AS "allocationId",
  'left' AS side,
  tm.id,
  p.ucid,
  ${pilotCallsignSql} AS callsign,
  plane.name AS aircraft
FROM ${tableActivityAllocationTeamLeft} atl
INNER JOIN ${tableActivitiesAllocations} alloc ON alloc.id = atl.activity_allocation_id
INNER JOIN ${tableAllocationTeamMembers} tm ON tm.id = atl.team_member_id
LEFT JOIN ${tablePilots} p ON p.id = tm.pilot_id
LEFT JOIN ${tablePlanes} plane ON plane.id = tm.aircraft_id
WHERE alloc.activity_id = $1

UNION ALL

SELECT
  atr.activity_allocation_id AS "allocationId",
  'right' AS side,
  tm.id,
  p.ucid,
  ${pilotCallsignSql} AS callsign,
  plane.name AS aircraft
FROM ${tableActivityAllocationTeamRight} atr
INNER JOIN ${tableActivitiesAllocations} alloc ON alloc.id = atr.activity_allocation_id
INNER JOIN ${tableAllocationTeamMembers} tm ON tm.id = atr.team_member_id
LEFT JOIN ${tablePilots} p ON p.id = tm.pilot_id
LEFT JOIN ${tablePlanes} plane ON plane.id = tm.aircraft_id
WHERE alloc.activity_id = $1

ORDER BY "allocationId" ASC, side ASC, id ASC
`;

export const queryProxyPilotRoles = `
SELECT u.roles
FROM ${tablePilots} p
LEFT JOIN vpc_users u ON u.id = p.account_id
WHERE p.ucid = $1
LIMIT 1
`;

export const queryProxyPilotBanRecordsCount = `
SELECT COUNT(*)::int AS count
FROM ${tableBanlist} b
INNER JOIN ${tablePilots} p ON p.id = b.pilot_id
WHERE p.ucid = $1
`;
