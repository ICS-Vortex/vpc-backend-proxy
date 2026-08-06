import { tableRaceTrackLayouts, tableRaceTrackSectors, tableRaceTracks } from "@/tables";

export const raceEffectiveLayoutIdSql = `COALESCE(r.race_track_layout_id, (SELECT active_layout_id FROM ${tableRaceTracks} WHERE id = r.race_track_id LIMIT 1))`;

export const sessionEffectiveLayoutIdSql = `COALESCE(rs.race_track_layout_id, r.race_track_layout_id, (SELECT active_layout_id FROM ${tableRaceTracks} WHERE id = r.race_track_id LIMIT 1))`;

export const buildRaceTrackLayoutByIdSubquery = (layoutIdSql: string) => `(
  SELECT jsonb_build_object(
    'id', rtl.id,
    'code', rtl.code,
    'title', rtl.title,
    'version', rtl.version,
    'isActive', rtl.is_active,
    'sectors', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', rts.id,
          'title', rts.title,
          'code', rts.code,
          'position', rts.position
        )
        ORDER BY rts.position ASC, rts.id ASC
      )
      FROM ${tableRaceTrackSectors} rts
      WHERE rts.layout_id = rtl.id
    ), '[]'::jsonb)
  )
  FROM ${tableRaceTrackLayouts} rtl
  WHERE rtl.id = ${layoutIdSql}
)`;
