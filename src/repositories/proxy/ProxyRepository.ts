import { db } from '@/db';
import {
  queryProxyActivityAllocations,
  queryProxyActivityAllocationsByActivityId,
  queryProxyActivityAircrafts,
  queryProxyActivityParticipants,
  queryProxyActivitySchedule,
  queryProxyAllocationTeamMembers,
  queryProxyAllocationTeamMembersByActivityId,
  queryProxyBanlist,
  queryProxyPendingActivities,
  queryProxyPilotBanRecordsCount,
  queryProxyPilotRoles,
} from '@/queries/proxy/proxyQueries';

type ParticipantRow = {
  activityId: number;
  ucid: string | null;
  callsign: string | null;
  aircraft: string | null;
  arrived: boolean;
};

type AircraftRow = {
  activityId: number;
  id: number;
  name: string;
};

type TeamMemberRow = {
  allocationId: number;
  side: 'left' | 'right';
  id: number;
  ucid: string | null;
  callsign: string | null;
  aircraft: string | null;
};

type AllocationRow = {
  id: number;
  activityId?: number;
  roundNumber: number | null;
  roundsPlayed: number | null;
  teamLeftPoints: number | null;
  teamRightPoints: number | null;
  status: string | null;
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

const buildTeamMembers = (members: TeamMemberRow[], side: 'left' | 'right') => {
  return members
    .filter((member) => member.side === side)
    .map((member) => ({
      id: member.id,
      ucid: member.ucid,
      callsign: member.callsign,
      aircraft: member.aircraft,
    }));
};

const serializeAllocations = (
  allocations: AllocationRow[],
  membersByAllocation: Map<number, TeamMemberRow[]>,
) => {
  return allocations.map((allocation) => {
    const members = membersByAllocation.get(allocation.id) ?? [];
    return {
      id: allocation.id,
      roundNumber: allocation.roundNumber,
      roundsPlayed: allocation.roundsPlayed,
      teamLeft: buildTeamMembers(members, 'left'),
      teamRight: buildTeamMembers(members, 'right'),
      teamLeftPoints: allocation.teamLeftPoints,
      teamRightPoints: allocation.teamRightPoints,
      status: allocation.status,
    };
  });
};

export const fetchProxyBanlist = async (serverId: number) => {
  const { rows } = await db.query(queryProxyBanlist, [serverId]);
  return rows.map((row: { ucid: string | null }) => row.ucid);
};

export const fetchProxyActivitySchedule = async (serverId: number) => {
  const { rows } = await db.query(queryProxyActivitySchedule, [serverId]);
  return rows;
};

export const fetchProxyCurrentActivities = async (serverId: number, includeSeriesFields: boolean) => {
  const { rows: activities } = await db.query(queryProxyPendingActivities, [serverId]);
  if (activities.length === 0) {
    return [];
  }

  const activityIds = activities.map((row: { id: number }) => row.id);
  const [
    participantsResult,
    aircraftsResult,
    allocationsResult,
  ] = await Promise.all([
    db.query(queryProxyActivityParticipants, [activityIds]),
    db.query(queryProxyActivityAircrafts, [activityIds]),
    db.query(queryProxyActivityAllocations, [activityIds]),
  ]);

  const participantsByActivity = groupBy(
    participantsResult.rows as ParticipantRow[],
    'activityId',
  );
  const aircraftsByActivity = groupBy(
    aircraftsResult.rows as AircraftRow[],
    'activityId',
  );
  const allocationsByActivity = groupBy(allocationsResult.rows as AllocationRow[], 'activityId');

  const allocationIds = (allocationsResult.rows as AllocationRow[]).map((row) => row.id);
  const membersByAllocation = allocationIds.length === 0
    ? new Map<number, TeamMemberRow[]>()
    : groupBy(
      (await db.query(queryProxyAllocationTeamMembers, [allocationIds])).rows as TeamMemberRow[],
      'allocationId',
    );

  return activities.map((activity: Record<string, unknown>) => {
    const activityId = activity.id as number;
    const participants = (participantsByActivity.get(activityId) ?? []).map((row) => ({
      ucid: row.ucid,
      callsign: row.callsign,
      aircraft: row.aircraft,
      arrived: row.arrived,
    }));
    const aircrafts = (aircraftsByActivity.get(activityId) ?? []).map((row) => ({
      id: row.id,
      name: row.name,
    }));
    const activityAllocations = allocationsByActivity.get(activityId) ?? [];
    const allocations = serializeAllocations(
      activityAllocations,
      membersByAllocation,
    );

    const payload: Record<string, unknown> = {
      id: activity.id,
      type: activity.type,
      status: activity.status,
      titleEn: activity.titleEn,
      titleRu: activity.titleRu,
      slug: activity.slug,
      awaitTime: activity.awaitingTime,
      startTime: activity.startTime,
      endTime: activity.endTime,
      bestOf: activity.bestOf,
      participants,
      allocations,
      aircrafts,
      isTournament: activity.isTournament,
      isQualification: activity.isQualification,
      roundsToBePlayed: activity.roundsToBePlayed,
      bestOfAllocation: activity.bestOfAllocation,
    };

    if (includeSeriesFields) {
      payload.seriesId = activity.seriesId;
      payload.seriesRoundId = activity.seriesRoundId;
      payload.seriesTitle = activity.seriesTitle;
      payload.roundTitle = activity.roundTitle;
    }

    return payload;
  });
};

export const fetchProxyActivityAllocations = async (activityId: number) => {
  const { rows: allocations } = await db.query(queryProxyActivityAllocationsByActivityId, [activityId]);
  if (allocations.length === 0) {
    return [];
  }

  const membersByAllocation = groupBy(
    (await db.query(queryProxyAllocationTeamMembersByActivityId, [activityId])).rows as TeamMemberRow[],
    'allocationId',
  );

  return serializeAllocations(allocations as AllocationRow[], membersByAllocation);
};

export const fetchProxyPilotRights = async (ucid: string | null) => {
  if (!ucid) {
    return null;
  }

  const [rolesResult, banResult] = await Promise.all([
    db.query(queryProxyPilotRoles, [ucid]),
    db.query(queryProxyPilotBanRecordsCount, [ucid]),
  ]);

  if (rolesResult.rows.length === 0) {
    return null;
  }

  const rolesRow = rolesResult.rows[0] as { roles: string[] | null };
  const banCount = (banResult.rows[0] as { count: number } | undefined)?.count ?? 0;

  return {
    roles: rolesRow.roles ?? [],
    isBanned: banCount > 0,
    banRecords: banCount,
  };
};
