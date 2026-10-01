import type { Program, SetLog, Workout, WorkoutEntry } from './types';

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const nowIso = () => new Date().toISOString();
export const todayIso = () => new Date().toISOString().slice(0, 10);

const dateFmt = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short' });
const dateLongFmt = new Intl.DateTimeFormat('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
const dateYearFmt = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('da-DK', { hour: '2-digit', minute: '2-digit' });

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.getFullYear() === new Date().getFullYear() ? dateFmt.format(d) : dateYearFmt.format(d);
};
export const fmtDateLong = (iso: string) => dateLongFmt.format(new Date(iso));
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));

export function fmtRelative(iso: string) {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86400000);
  if (days === 0) return 'I dag';
  if (days === 1) return 'I går';
  if (days < 7) return `${days} dage siden`;
  return fmtDate(iso);
}

export function fmtDuration(ms: number) {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} t ${min % 60} min`;
}

export const fmtNum = (n: number, digits = 1) =>
  n.toLocaleString('da-DK', { maximumFractionDigits: digits });

export function fmtKg(n: number) {
  if (n >= 10000) return `${fmtNum(n / 1000, 1)} t`;
  return `${fmtNum(n, 1)} kg`;
}

export const setDone = (s: SetLog) => s.done && (s.reps ?? 0) > 0;

export const entryVolume = (e: WorkoutEntry) =>
  e.sets.filter(setDone).reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight ?? 0), 0);

export const workoutVolume = (w: Workout) => w.entries.reduce((s, e) => s + entryVolume(e), 0);

export const workoutSets = (w: Workout) => w.entries.reduce((s, e) => s + e.sets.filter(setDone).length, 0);

/** Epley estimated one-rep max. */
export const e1rm = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

export interface ExercisePoint {
  date: string;
  workoutId: string;
  bestWeight: number;
  bestE1rm: number;
  volume: number;
  reps: number;
}

/** One data point per finished workout containing the exercise, oldest first. */
export function exerciseHistory(workouts: Workout[], exerciseId: string): ExercisePoint[] {
  const pts: ExercisePoint[] = [];
  for (const w of workouts) {
    if (!w.finishedAt) continue;
    const sets = w.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets.filter(setDone));
    if (!sets.length) continue;
    pts.push({
      date: w.startedAt,
      workoutId: w.id,
      bestWeight: Math.max(...sets.map((s) => s.weight ?? 0)),
      bestE1rm: Math.max(...sets.map((s) => e1rm(s.weight ?? 0, s.reps ?? 0))),
      volume: sets.reduce((a, s) => a + (s.reps ?? 0) * (s.weight ?? 0), 0),
      reps: sets.reduce((a, s) => a + (s.reps ?? 0), 0),
    });
  }
  return pts.sort((a, b) => a.date.localeCompare(b.date));
}

/** Sets from the most recent finished workout containing the exercise. */
export function lastSets(workouts: Workout[], exerciseId: string, excludeWorkoutId?: string): SetLog[] | null {
  const sorted = [...workouts]
    .filter((w) => w.finishedAt && w.id !== excludeWorkoutId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const w of sorted) {
    const e = w.entries.find((x) => x.exerciseId === exerciseId);
    if (e && e.sets.some(setDone)) return e.sets.filter(setDone);
  }
  return null;
}

export function startOfWeek(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}

/** Consecutive weeks (ending this or last week) with at least one workout. */
export function weekStreak(workouts: Workout[]) {
  const weeks = new Set(
    workouts.filter((w) => w.finishedAt).map((w) => startOfWeek(new Date(w.startedAt)).getTime()),
  );
  let cur = startOfWeek();
  if (!weeks.has(cur.getTime())) cur = new Date(cur.getTime() - 7 * 86400000);
  let n = 0;
  while (weeks.has(cur.getTime())) {
    n++;
    cur = new Date(cur.getTime() - 7 * 86400000);
  }
  return n;
}

/** Suggest the next program day based on the last workout from that program. */
export function nextProgramDay(program: Program, workouts: Workout[]) {
  if (!program.days.length) return null;
  const last = workouts.find((w) => w.programId === program.id && w.finishedAt);
  if (!last) return program.days[0];
  const idx = program.days.findIndex((d) => d.id === last.dayId);
  return program.days[(idx + 1) % program.days.length];
}

/** Human-readable summary of what changed between two versions of a program. */
export function diffProgram(
  before: Program,
  after: Program,
  nameOf: (exerciseId: string) => string,
): string | null {
  const changes: string[] = [];
  if (before.name !== after.name) changes.push(`omdøbt til “${after.name}”`);
  const beforeDays = new Map(before.days.map((d) => [d.id, d]));
  const afterDays = new Map(after.days.map((d) => [d.id, d]));
  for (const d of after.days) if (!beforeDays.has(d.id)) changes.push(`ny dag “${d.name}”`);
  for (const d of before.days) if (!afterDays.has(d.id)) changes.push(`fjernede dag “${d.name}”`);
  for (const d of after.days) {
    const old = beforeDays.get(d.id);
    if (!old) continue;
    if (old.name !== d.name) changes.push(`“${old.name}” omdøbt til “${d.name}”`);
    const oldEx = new Map(old.exercises.map((e) => [e.id, e]));
    const newEx = new Map(d.exercises.map((e) => [e.id, e]));
    for (const e of d.exercises) {
      const o = oldEx.get(e.id);
      if (!o) {
        changes.push(`+ ${nameOf(e.exerciseId)} (${d.name})`);
        continue;
      }
      const parts: string[] = [];
      if (o.exerciseId !== e.exerciseId) parts.push(`${nameOf(o.exerciseId)} → ${nameOf(e.exerciseId)}`);
      if (o.sets !== e.sets || o.reps !== e.reps) parts.push(`${o.sets}×${o.reps} → ${e.sets}×${e.reps}`);
      if ((o.weight ?? null) !== (e.weight ?? null))
        parts.push(`${o.weight ?? '–'} → ${e.weight ?? '–'} kg`);
      if (parts.length) changes.push(`${nameOf(e.exerciseId)}: ${parts.join(', ')}`);
    }
    for (const o of old.exercises) if (!newEx.has(o.id)) changes.push(`− ${nameOf(o.exerciseId)} (${d.name})`);
  }
  return changes.length ? changes.join(' · ') : null;
}

export const PROFILE_COLORS = ['#2f4f4f', '#7a5c3e', '#4a5a78', '#6b4e71', '#3f6b52', '#8a4b3c', '#5b5f66'];

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';
