import type { AppData, Program, ProgramDay, SetLog, Workout, WorkoutEntry } from './types';
import { lastSets, nowIso, uid } from './utils';

const firstNumber = (s: string) => {
  const m = s.match(/\d+/);
  return m ? Number(m[0]) : null;
};

export function newSet(prev?: Partial<SetLog>): SetLog {
  return { id: uid(), reps: prev?.reps ?? null, weight: prev?.weight ?? null, done: false };
}

export function newEntry(exerciseId: string, workouts: Workout[], sets = 3, reps?: string, weight?: number): WorkoutEntry {
  const last = lastSets(workouts, exerciseId);
  return {
    id: uid(),
    exerciseId,
    sets: Array.from({ length: sets }, (_, i) =>
      newSet({
        reps: (reps ? firstNumber(reps) : null) ?? last?.[i]?.reps ?? last?.[0]?.reps ?? null,
        weight: weight ?? last?.[i]?.weight ?? last?.[last.length - 1]?.weight ?? null,
      }),
    ),
  };
}

/** Create a workout (optionally from a program day) and return the updater + id. */
export function startWorkout(
  profileId: string,
  workouts: Workout[],
  program?: Program,
  day?: ProgramDay,
): { id: string; apply: (d: AppData) => AppData } {
  const w: Workout = {
    id: uid(),
    profileId,
    name: day ? day.name : 'Fri træning',
    programId: program?.id,
    dayId: day?.id,
    startedAt: nowIso(),
    entries: day ? day.exercises.map((p) => newEntry(p.exerciseId, workouts, p.sets, p.reps, p.weight)) : [],
  };
  return {
    id: w.id,
    apply: (d) => ({
      ...d,
      // Only one active workout per profile; callers confirm before replacing it.
      workouts: [...d.workouts.filter((x) => !(x.profileId === profileId && !x.finishedAt)), w],
    }),
  };
}
