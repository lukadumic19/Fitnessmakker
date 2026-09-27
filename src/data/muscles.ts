import type { MuscleGroup } from '../types';

export type Muscle =
  | 'bryst'
  | 'forreste-skulder'
  | 'side-skulder'
  | 'bagerste-skulder'
  | 'trapez'
  | 'lats'
  | 'midterryg'
  | 'lænd'
  | 'biceps'
  | 'triceps'
  | 'underarme'
  | 'mave'
  | 'skrå-mave'
  | 'baller'
  | 'hofteabduktorer'
  | 'forlår'
  | 'baglår'
  | 'adduktorer'
  | 'lægge';

export const MUSCLE_NAMES: Record<Muscle, string> = {
  bryst: 'Bryst',
  'forreste-skulder': 'Forreste skulder',
  'side-skulder': 'Side af skulder',
  'bagerste-skulder': 'Bagerste skulder',
  trapez: 'Trapez',
  lats: 'Latissimus (brede rygmuskel)',
  midterryg: 'Midterste ryg',
  lænd: 'Lænd',
  biceps: 'Biceps',
  triceps: 'Triceps',
  underarme: 'Underarme',
  mave: 'Lige mavemuskel',
  'skrå-mave': 'Skrå mavemuskler',
  baller: 'Baller',
  hofteabduktorer: 'Yderside af hofte',
  forlår: 'Forlår',
  baglår: 'Baglår',
  adduktorer: 'Inderlår',
  lægge: 'Lægge',
};

/** Default muscles for an exercise that only has a muscle group (e.g. custom ones). */
export const GROUP_MUSCLES: Record<MuscleGroup, Muscle[]> = {
  bryst: ['bryst'],
  ryg: ['lats', 'midterryg'],
  skuldre: ['side-skulder', 'forreste-skulder'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  ben: ['forlår', 'baglår'],
  baller: ['baller'],
  mave: ['mave'],
  kondition: [],
};
