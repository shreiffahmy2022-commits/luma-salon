export const OPEN_MIN = 600;   // 10:00
export const CLOSE_MIN = 1260; // 21:00
export const STEP = 30;

export type Busy = { staffId: string; startMin: number; durationMin: number };

export function staffFree(busy: Busy[], staffId: string, startMin: number, durationMin: number) {
  return !busy.some(
    (b) => b.staffId === staffId && startMin < b.startMin + b.durationMin && b.startMin < startMin + durationMin
  );
}

/** All bookable slots for a day. staffId=null means "any professional". */
export function freeSlots(
  busy: Busy[],
  staffIds: string[],
  durationMin: number,
  staffId: string | null,
  minStart = 0
): { startMin: number; staffId: string }[] {
  const out: { startMin: number; staffId: string }[] = [];
  for (let m = OPEN_MIN; m + durationMin <= CLOSE_MIN; m += STEP) {
    if (m < minStart) continue;
    if (staffId) {
      if (staffFree(busy, staffId, m, durationMin)) out.push({ startMin: m, staffId });
    } else {
      const f = staffIds.find((id) => staffFree(busy, id, m, durationMin));
      if (f) out.push({ startMin: m, staffId: f });
    }
  }
  return out;
}
