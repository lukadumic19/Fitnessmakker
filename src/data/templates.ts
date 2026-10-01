import type { Program } from '../types';
import { nowIso, uid } from '../utils';

interface TemplateDay {
  name: string;
  exercises: [exerciseId: string, sets: number, reps: string][];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  days: TemplateDay[];
}

export const TEMPLATES: ProgramTemplate[] = [
  {
    id: 'fullbody',
    name: 'Fuld krop · 3 dage',
    description: 'Tre helkropspas om ugen med skiftende fokus. Et solidt udgangspunkt for de fleste.',
    days: [
      { name: 'Dag A', exercises: [['squat', 3, '5'], ['bench-press', 3, '5'], ['barbell-row', 3, '8'], ['plank', 3, '45 sek']] },
      { name: 'Dag B', exercises: [['deadlift', 3, '5'], ['overhead-press', 3, '6'], ['pull-up', 3, '6–8'], ['hanging-leg-raise', 3, '10']] },
      { name: 'Dag C', exercises: [['goblet-squat', 3, '10'], ['incline-db-press', 3, '10'], ['db-row', 3, '10'], ['hip-thrust', 3, '10']] },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Over / under · 4 dage',
    description: 'Overkrop og underkrop hver for sig, to gange om ugen. Mere volumen per muskelgruppe.',
    days: [
      { name: 'Overkrop 1', exercises: [['bench-press', 4, '6'], ['barbell-row', 4, '8'], ['overhead-press', 3, '8'], ['lat-pulldown', 3, '10'], ['biceps-curl', 3, '12'], ['triceps-pushdown', 3, '12']] },
      { name: 'Underkrop 1', exercises: [['squat', 4, '6'], ['romanian-deadlift', 3, '8'], ['leg-press', 3, '12'], ['leg-curl', 3, '12'], ['calf-raise', 4, '12']] },
      { name: 'Overkrop 2', exercises: [['incline-db-press', 4, '10'], ['pull-up', 4, '6–8'], ['dips', 3, '10'], ['seated-cable-row', 3, '12'], ['lateral-raise', 3, '15'], ['hammer-curl', 3, '12']] },
      { name: 'Underkrop 2', exercises: [['deadlift', 3, '5'], ['bulgarian-split-squat', 3, '10'], ['hip-thrust', 3, '10'], ['leg-extension', 3, '12'], ['crunch', 3, '15']] },
    ],
  },
  {
    id: 'ppl',
    name: 'Push / pull / ben',
    description: 'Klassisk split fordelt på pres, træk og ben. Kan køres 3 eller 6 dage om ugen.',
    days: [
      { name: 'Push', exercises: [['bench-press', 4, '6–8'], ['overhead-press', 3, '8'], ['incline-db-press', 3, '10'], ['lateral-raise', 3, '15'], ['triceps-pushdown', 3, '12'], ['overhead-triceps', 3, '12']] },
      { name: 'Pull', exercises: [['deadlift', 3, '5'], ['pull-up', 3, '8'], ['barbell-row', 3, '8'], ['seated-cable-row', 3, '12'], ['biceps-curl', 3, '12'], ['hammer-curl', 3, '12']] },
      { name: 'Ben', exercises: [['squat', 4, '6–8'], ['romanian-deadlift', 3, '10'], ['split-squat', 3, '10'], ['leg-curl', 3, '12'], ['calf-raise', 4, '15'], ['hanging-leg-raise', 3, '12']] },
    ],
  },
  {
    id: 'home',
    name: 'Hjemmetræning',
    description: 'Minimalt udstyr: kropsvægt, et par håndvægte og en kettlebell.',
    days: [
      { name: 'Styrke', exercises: [['goblet-squat', 4, '12'], ['push-up', 4, '10–15'], ['db-row', 4, '12'], ['split-squat', 3, '10'], ['plank', 3, '45 sek']] },
      { name: 'Puls', exercises: [['kettlebell-swing', 5, '20'], ['jumping-jacks', 3, '60 sek'], ['push-up', 3, '10'], ['crunch', 3, '20']] },
    ],
  },
];

export function programFromTemplate(t: ProgramTemplate | null, profileId: string): Program {
  const now = nowIso();
  return {
    id: uid(),
    profileId,
    name: t?.name ?? 'Nyt program',
    description: t?.description,
    createdAt: now,
    updatedAt: now,
    active: false,
    history: [{ date: now, summary: t ? `Oprettet ud fra skabelonen “${t.name}”` : 'Oprettet' }],
    days: t
      ? t.days.map((d) => ({
          id: uid(),
          name: d.name,
          exercises: d.exercises.map(([exerciseId, sets, reps]) => ({ id: uid(), exerciseId, sets, reps, restSec: 90 })),
        }))
      : [{ id: uid(), name: 'Dag 1', exercises: [] }],
  };
}
