import type { AppData, BodyEntry, Profile, Workout } from '../types';
import { uid } from '../utils';
import { TEMPLATES, programFromTemplate } from './templates';

/** Starting weights (kg) for the demo profile; progress ~2.5 % per session. */
const START: Record<string, number> = {
  squat: 70,
  'bench-press': 55,
  'barbell-row': 50,
  deadlift: 90,
  'overhead-press': 35,
  'goblet-squat': 20,
  'incline-db-press': 18,
  'db-row': 22,
  'hip-thrust': 70,
};

/** Build a demo profile with six weeks of history. Returns the updater and profile id. */
export function demoData(): { profileId: string; apply: (d: AppData) => AppData } {
  const profile: Profile = {
    id: uid(),
    name: 'Eksempel',
    color: '#4a5a78',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    goal: 'Eksempeldata – slet profilen, når du har set dig omkring',
    heightCm: 180,
  };
  const program = programFromTemplate(TEMPLATES[0], profile.id);
  program.active = true;
  program.createdAt = profile.createdAt;
  program.history.unshift({
    date: new Date(Date.now() - 20 * 86400000).toISOString(),
    summary: 'Squat: 3×5 → 5×5 · + Hip thrust (Dag C)',
  });

  const workouts: Workout[] = [];
  const body: BodyEntry[] = [];
  const sessions = 16;
  for (let i = 0; i < sessions; i++) {
    // Mon / Wed / Fri over the last ~6 weeks.
    const daysAgo = Math.round((sessions - i) * (42 / sessions)) + 1;
    const start = new Date(Date.now() - daysAgo * 86400000);
    start.setHours(17, 30, 0, 0);
    const day = program.days[i % program.days.length];
    const workout: Workout = {
      id: uid(),
      profileId: profile.id,
      name: day.name,
      programId: program.id,
      dayId: day.id,
      startedAt: start.toISOString(),
      finishedAt: new Date(start.getTime() + (52 + (i % 3) * 6) * 60000).toISOString(),
      entries: day.exercises.map((pe) => {
        const base = START[pe.exerciseId];
        const reps = Number(pe.reps.match(/\d+/)?.[0] ?? 8);
        const weight = base ? Math.round((base * (1 + 0.025 * Math.floor(i / 3))) / 2.5) * 2.5 : null;
        return {
          id: uid(),
          exerciseId: pe.exerciseId,
          sets: Array.from({ length: pe.sets }, () => ({ id: uid(), reps, weight, done: true })),
        };
      }),
    };
    workouts.push(workout);
  }
  for (let w = 0; w < 7; w++) {
    const date = new Date(Date.now() - (42 - w * 7) * 86400000).toISOString().slice(0, 10);
    body.push({
      id: uid(),
      profileId: profile.id,
      date,
      weight: Math.round((84.6 - w * 0.35 + (w % 2 ? 0.2 : 0)) * 10) / 10,
      waist: w % 2 === 0 ? Math.round((89 - w * 0.3) * 10) / 10 : undefined,
      bodyFat: w % 3 === 0 ? Math.round((19 - w * 0.25) * 10) / 10 : undefined,
    });
  }
  return {
    profileId: profile.id,
    apply: (d) => ({
      ...d,
      profiles: [...d.profiles, profile],
      programs: [...d.programs, program],
      workouts: [...d.workouts, ...workouts],
      body: [...d.body, ...body],
    }),
  };
}
