import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppData, BodyEntry, CustomExercise, Profile, Program, Workout } from './types';
import { EXERCISES, type Exercise } from './data/exercises';

const DATA_KEY = 'fitnessmakker.data.v1';
const PROFILE_KEY = 'fitnessmakker.profile';

const empty = (): AppData => ({
  version: 1,
  profiles: [],
  programs: [],
  workouts: [],
  body: [],
  customExercises: [],
});

function load(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return empty();
    return { ...empty(), ...(JSON.parse(raw) as AppData) };
  } catch {
    return empty();
  }
}

function loadProfileId(): string | null {
  try {
    return localStorage.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
}

type Updater = (d: AppData) => AppData;

interface Store {
  data: AppData;
  update: (fn: Updater) => void;
  profile: Profile | null;
  setProfileId: (id: string | null) => void;
  exercises: Exercise[];
  exerciseById: (id: string) => Exercise | undefined;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(load);
  const [profileId, setProfileIdState] = useState<string | null>(loadProfileId);

  useEffect(() => {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(data));
    } catch {
      /* storage full or unavailable */
    }
  }, [data]);

  const setProfileId = useCallback((id: string | null) => {
    setProfileIdState(id);
    try {
      if (id) localStorage.setItem(PROFILE_KEY, id);
      else localStorage.removeItem(PROFILE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const update = useCallback((fn: Updater) => setData((d) => fn(d)), []);
  const profile = data.profiles.find((p) => p.id === profileId) ?? null;

  const exercises = useMemo(() => {
    if (!profile) return EXERCISES;
    const custom = data.customExercises
      .filter((c) => c.profileId === profile.id)
      .map((c) => customToExercise(c));
    return [...EXERCISES, ...custom];
  }, [data.customExercises, profile]);

  const exerciseById = useCallback(
    (id: string) => exercises.find((e) => e.id === id) ?? EXERCISES.find((e) => e.id === id),
    [exercises],
  );

  const value = useMemo(
    () => ({ data, update, profile, setProfileId, exercises, exerciseById }),
    [data, update, profile, setProfileId, exercises, exerciseById],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function customToExercise(c: CustomExercise): Exercise {
  const base = EXERCISES.find((e) => e.id === c.illustrationOf) ?? EXERCISES[0];
  return {
    id: c.id,
    name: c.name,
    primary: c.primary,
    secondary: [],
    equipment: c.equipment,
    description: c.description || 'Egen øvelse.',
    cues: [],
    illustration: base.illustration,
    timed: base.timed,
    custom: true,
  };
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider mangler');
  return s;
}

/** Store for screens that require a selected profile. */
export function useProfileStore() {
  const s = useStore();
  if (!s.profile) throw new Error('Ingen profil valgt');
  const pid = s.profile.id;
  const programs = s.data.programs.filter((p) => p.profileId === pid);
  const workouts = s.data.workouts
    .filter((w) => w.profileId === pid)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const body = s.data.body.filter((b) => b.profileId === pid).sort((a, b) => a.date.localeCompare(b.date));
  return { ...s, profile: s.profile, programs, workouts, body };
}

/* ------------------------- Update helpers ------------------------- */

export const upsert =
  <K extends 'programs' | 'workouts' | 'body' | 'profiles' | 'customExercises'>(key: K, item: AppData[K][number]) =>
  (d: AppData): AppData => {
    const list = d[key] as { id: string }[];
    const exists = list.some((x) => x.id === item.id);
    return {
      ...d,
      [key]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item],
    };
  };

export const remove =
  (key: 'programs' | 'workouts' | 'body' | 'customExercises', id: string) =>
  (d: AppData): AppData => ({ ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) });

export const removeProfile =
  (id: string) =>
  (d: AppData): AppData => ({
    ...d,
    profiles: d.profiles.filter((p) => p.id !== id),
    programs: d.programs.filter((p) => p.profileId !== id),
    workouts: d.workouts.filter((w) => w.profileId !== id),
    body: d.body.filter((b) => b.profileId !== id),
    customExercises: d.customExercises.filter((c) => c.profileId !== id),
  });

export type { Program, Workout, BodyEntry };
