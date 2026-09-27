import type { Illustration } from '../illustrations/ExerciseFigure';
import type { Equipment, MuscleGroup } from '../types';
import { GROUP_MUSCLES, type Muscle } from './muscles';
import { BEN } from './library/ben';
import { BRYST } from './library/bryst';
import { RYG } from './library/ryg';
import { SKULDRE } from './library/skuldre';
import { ARME } from './library/arme';
import { MAVE } from './library/mave';
import { KONDITION } from './library/kondition';

export interface Exercise {
  id: string;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment;
  description: string;
  cues: string[];
  illustration: Illustration;
  /** Detailed muscles for the muscle map. Falls back to the muscle group. */
  muscles?: { primary: Muscle[]; secondary: Muscle[] };
  /** Cardio / timed exercises log minutes instead of weight. */
  timed?: boolean;
  custom?: boolean;
}

export const EXERCISES: Exercise[] = [
  ...BEN,
  ...BRYST,
  ...RYG,
  ...SKULDRE,
  ...ARME,
  ...MAVE,
  ...KONDITION,
];

export function exerciseMuscles(e: Exercise): { primary: Muscle[]; secondary: Muscle[] } {
  if (e.muscles) return e.muscles;
  return {
    primary: GROUP_MUSCLES[e.primary],
    secondary: [...new Set(e.secondary.flatMap((g) => GROUP_MUSCLES[g]))],
  };
}

export const MUSCLE_LABELS: Record<string, string> = {
  bryst: 'Bryst',
  ryg: 'Ryg',
  skuldre: 'Skuldre',
  biceps: 'Biceps',
  triceps: 'Triceps',
  ben: 'Ben',
  baller: 'Baller',
  mave: 'Mave',
  kondition: 'Kondition',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  vægtstang: 'Vægtstang',
  håndvægte: 'Håndvægte',
  kettlebell: 'Kettlebell',
  kabel: 'Kabel',
  maskine: 'Maskine',
  kropsvægt: 'Kropsvægt',
  bænk: 'Bænk',
};
