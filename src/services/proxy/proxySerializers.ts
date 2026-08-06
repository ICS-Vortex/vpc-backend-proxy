const parseJsonObject = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
};

const parseJsonArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

type LayoutRow = {
  id: number;
  raceTrackId?: number;
  code: string;
  title: string;
  version: number | null;
  isActive: boolean;
  configuration?: string | null;
  sectors: unknown;
};

export const serializeRaceTrackLayout = (layout: LayoutRow) => {
  const payload: Record<string, unknown> = {
    id: layout.id,
    code: layout.code,
    title: layout.title,
    version: layout.version,
    isActive: layout.isActive,
    sectors: parseJsonArray(layout.sectors),
  };

  if (layout.configuration !== null && layout.configuration !== undefined) {
    payload.configuration = parseJsonObject(layout.configuration);
  }

  return payload;
};

export const serializeRaceTrackListItem = (
  track: { id: number; title: string; code: string; configuration?: string | null },
  layouts: LayoutRow[],
) => {
  const payload: Record<string, unknown> = {
    id: track.id,
    title: track.title,
    code: track.code,
    layouts: layouts.map(serializeRaceTrackLayout),
  };

  if (track.configuration !== null && track.configuration !== undefined) {
    payload.configuration = parseJsonObject(track.configuration);
  }

  return payload;
};

export const serializeSeriesRound = (round: {
  id: number;
  seriesId: number | null;
  seriesTitleEn: string | null;
  position: number;
  titleEn: string;
  titleRu: string;
  entryType: string;
  startDate: string | null;
  endDate: string | null;
  timezone: string;
  seriesTimezone: string | null;
  bestResultsCount: number;
  status: string;
  schedulePattern: string;
}) => {
  const effectiveTimezone = round.timezone && round.timezone !== 'UTC'
    ? round.timezone
    : (round.seriesTimezone ?? 'UTC');

  return {
    id: round.id,
    seriesId: round.seriesId,
    seriesTitleEn: round.seriesTitleEn,
    position: round.position,
    titleEn: round.titleEn,
    titleRu: round.titleRu,
    entryType: round.entryType,
    startDate: round.startDate,
    endDate: round.endDate,
    timezone: effectiveTimezone,
    bestResultsCount: round.bestResultsCount,
    status: round.status,
    schedulePattern: parseJsonObject(round.schedulePattern),
  };
};
