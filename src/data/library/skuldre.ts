import type { Exercise } from '../exercises';
import { STAND } from './shared';

export const SKULDRE: Exercise[] = [
  {
    id: 'overhead-press',
    name: 'Skulderpres',
    primary: 'skuldre',
    secondary: ['triceps', 'mave'],
    equipment: 'vægtstang',
    muscles: { primary: ['forreste-skulder', 'side-skulder'], secondary: ['triceps', 'trapez', 'mave'] },
    description: 'Stående pres af stangen fra skuldrene til strakte arme over hovedet.',
    cues: ['Stram baller og mave', 'Hovedet lidt tilbage, mens stangen passerer', 'Lås ud med stangen over midtfoden'],
    illustration: {
      highlight: ['upperArm'],
      poses: [
        { ...STAND, armN: { to: [114, 42], bend: -1 }, legN: { to: [100, 150] } },
        { ...STAND, armN: { to: [102, -15], bend: 1 }, legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'plate', at: 'handN', r: 14 }],
    },
  },
  {
    id: 'lateral-raise',
    name: 'Sidehæv',
    primary: 'skuldre',
    secondary: [],
    equipment: 'håndvægte',
    muscles: { primary: ['side-skulder'], secondary: ['trapez'] },
    description: 'Løft håndvægtene ud til siden til skulderhøjde. Isolerer den midterste del af skulderen.',
    cues: ['Let bøjede albuer', 'Løft til skulderhøjde', 'Led med albuerne – ikke hænderne'],
    illustration: {
      view: 'front',
      thumb: 1,
      highlight: ['upperArm'],
      poses: [
        { hip: [100, 80], arms: [8, 4], legs: [4, 0] },
        { hip: [100, 80], arms: [86, 90], legs: [4, 0] },
      ],
      props: [
        { kind: 'dumbbell', at: 'handR', vertical: true },
        { kind: 'dumbbell', at: 'handL', vertical: true },
      ],
    },
  },
  {
    id: 'db-shoulder-press',
    name: 'Skulderpres med håndvægte',
    primary: 'skuldre',
    secondary: ['triceps'],
    equipment: 'håndvægte',
    muscles: { primary: ['forreste-skulder', 'side-skulder'], secondary: ['triceps', 'trapez'] },
    description: 'Pres to håndvægte fra skulderhøjde op over hovedet – stående eller siddende. Træner hver side for sig.',
    cues: ['Start med albuerne lidt foran kroppen', 'Pres op og let ind', 'Undgå at svaje i lænden'],
    illustration: {
      view: 'front',
      highlight: ['upperArm'],
      poses: [
        { hip: [100, 80], arms: [88, 178], legs: [6, 2] },
        { hip: [100, 80], arms: [164, 176], legs: [6, 2] },
      ],
      props: [
        { kind: 'dumbbell', at: 'handR' },
        { kind: 'dumbbell', at: 'handL' },
      ],
    },
  },
  {
    id: 'front-raise',
    name: 'Fronthæv',
    primary: 'skuldre',
    secondary: [],
    equipment: 'håndvægte',
    muscles: { primary: ['forreste-skulder'], secondary: ['side-skulder', 'bryst'] },
    description: 'Løft håndvægtene frem til skulderhøjde med næsten strakte arme. Isolerer forreste del af skulderen.',
    cues: ['Let bøjede albuer', 'Løft til skulderhøjde', 'Ingen sving fra hoften'],
    illustration: {
      thumb: 1,
      highlight: ['upperArm'],
      poses: [
        { ...STAND, armN: [4, 4], legN: { to: [100, 150] } },
        { ...STAND, armN: [90, 92], legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'dumbbell', at: 'handN' }],
    },
  },
  {
    id: 'upright-row',
    name: 'Upright row',
    primary: 'skuldre',
    secondary: ['ryg'],
    equipment: 'vægtstang',
    muscles: { primary: ['side-skulder', 'trapez'], secondary: ['forreste-skulder', 'biceps'] },
    description: 'Træk stangen lodret op langs kroppen til brysthøjde, mens albuerne fører. Rammer siden af skulderen og trapez.',
    cues: ['Albuerne højere end hænderne', 'Stop i brysthøjde', 'Skulderbredt greb skåner skulderen'],
    illustration: {
      thumb: 1,
      highlight: ['upperArm'],
      poses: [
        { ...STAND, armN: { to: [106, 84] }, legN: { to: [100, 150] } },
        { ...STAND, armN: { to: [108, 40], bend: 1 }, legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'plate', at: 'handN', r: 14 }],
    },
  },
  {
    id: 'face-pull',
    name: 'Face pull',
    primary: 'skuldre',
    secondary: ['ryg'],
    equipment: 'kabel',
    muscles: { primary: ['bagerste-skulder'], secondary: ['midterryg', 'trapez'] },
    description: 'Træk et reb fra trisse i hovedhøjde ind mod ansigtet med albuerne højt. Styrker bagerste skulder og holdningen.',
    cues: ['Albuerne højt og ud til siden', 'Træk rebet fra hinanden ved ansigtet', 'Pause kort bagerst'],
    illustration: {
      thumb: 1,
      highlight: ['upperArm'],
      poses: [
        { hip: [96, 80], torso: 176, armN: { to: [144, 24] }, legN: { to: [98, 150] } },
        { hip: [96, 80], torso: 176, armN: { to: [112, 16], bend: 1 }, legN: { to: [98, 150] } },
      ],
      props: [
        { kind: 'line', from: [184, -30], to: [184, 152], w: 6 },
        { kind: 'cable', from: [178, 20], to: 'handN' },
      ],
    },
  },
  {
    id: 'pike-push-up',
    name: 'Pike push-up',
    primary: 'skuldre',
    secondary: ['triceps'],
    equipment: 'kropsvægt',
    muscles: { primary: ['forreste-skulder', 'side-skulder'], secondary: ['triceps', 'trapez'] },
    description: 'Armstrækninger med hoften højt, så kroppen danner et omvendt V. Flytter arbejdet op i skuldrene uden udstyr.',
    cues: ['Hoften højt over hænderne', 'Sænk issen mod gulvet foran hænderne', 'Pres tilbage op'],
    illustration: {
      highlight: ['upperArm'],
      poses: [
        { hip: [0, 0], torso: 47, head: -10, armN: [47, 47], legN: [-20, -20], footN: 40, anchor: { joint: 'handN', at: [150, 150] } },
        { hip: [0, 0], torso: 28, head: -10, armN: [-28, 74], legN: [-27, -27], footN: 40, anchor: { joint: 'handN', at: [150, 150] } },
      ],
    },
  },
];
