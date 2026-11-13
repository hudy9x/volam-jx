/** USER 2026-11-13: 40 bãi (Luyện công + Hang động), hai bản đồ mỗi mốc cấp 10–200.
 * These are project spawn levels, not levels recovered from the original client.
 * Phượng Tường (1) is a town and is deliberately outside this list.
 */
export const TRAINING_STAGES: readonly { band: [number, number]; maps: [number, number] }[] = [
  { band: [10, 19], maps: [2, 3] },
  { band: [20, 29], maps: [19, 4] },
  { band: [30, 39], maps: [43, 70] },
  { band: [40, 49], maps: [167, 5] },
  { band: [50, 59], maps: [22, 24] },
  { band: [60, 69], maps: [92, 21] },
  { band: [70, 79], maps: [56, 41] },
  { band: [80, 89], maps: [14, 74] },
  { band: [90, 99], maps: [90, 195] },
  { band: [100, 109], maps: [23, 6] },
  { band: [110, 119], maps: [26, 27] },
  { band: [120, 129], maps: [179, 193] },
  { band: [130, 139], maps: [68, 122] },
  { band: [140, 149], maps: [38, 28] },
  { band: [150, 159], maps: [7, 39] },
  { band: [160, 169], maps: [50, 40] },
  { band: [170, 179], maps: [224, 336] },
  { band: [180, 189], maps: [93, 319] },
  { band: [190, 199], maps: [342, 320] },
  { band: [200, 200], maps: [340, 341] },
];

export const TRAINING_BANDS = new Map(TRAINING_STAGES.flatMap(s => s.maps.map(id => [id, s.band] as const)));

/** Configured monster levels shown in the map picker; legacy Dược Vương Cốc keeps its existing spawn range. */
export function mapLevelBand(id: number): [number, number] | undefined {
  return TRAINING_BANDS.get(id) ?? (id === 140 ? [3, 7] : undefined);
}
