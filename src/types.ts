export type MuscleGroup =
  | 'bryst'
  | 'ryg'
  | 'skuldre'
  | 'biceps'
  | 'triceps'
  | 'ben'
  | 'baller'
  | 'mave'
  | 'kondition';

export type Equipment =
  | 'vægtstang'
  | 'håndvægte'
  | 'kettlebell'
  | 'kabel'
  | 'maskine'
  | 'kropsvægt'
  | 'bænk';

export interface Profile {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  goal?: string;
  heightCm?: number;
}

export interface CustomExercise {
  id: string;
  profileId: string;
  name: string;
  primary: MuscleGroup;
  equipment: Equipment;
  /** Id of a built-in exercise whose illustration is reused. */
  illustrationOf: string;
  description?: string;
}

export interface PlannedExercise {
  id: string;
  exerciseId: string;
  sets: number;
  reps: string;
  weight?: number;
  restSec?: number;
  notes?: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

export interface ProgramChange {
  date: string;
  summary: string;
}

export interface Program {
  id: string;
  profileId: string;
  name: string;
  description?: string;
  days: ProgramDay[];
  createdAt: string;
  updatedAt: string;
  active: boolean;
  history: ProgramChange[];
}

export interface SetLog {
  id: string;
  reps: number | null;
  weight: number | null;
  done: boolean;
}

export interface WorkoutEntry {
  id: string;
  exerciseId: string;
  sets: SetLog[];
  notes?: string;
}

export interface Workout {
  id: string;
  profileId: string;
  name: string;
  programId?: string;
  dayId?: string;
  startedAt: string;
  finishedAt?: string;
  entries: WorkoutEntry[];
  notes?: string;
}

export interface BodyEntry {
  id: string;
  profileId: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  waist?: number;
  chest?: number;
  arm?: number;
  thigh?: number;
  note?: string;
}

export interface AppData {
  version: 1;
  profiles: Profile[];
  programs: Program[];
  workouts: Workout[];
  body: BodyEntry[];
  customExercises: CustomExercise[];
}
