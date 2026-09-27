import type { Illustration } from '../illustrations/ExerciseFigure';
import type { Equipment, MuscleGroup } from '../types';

export interface Exercise {
  id: string;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment;
  description: string;
  cues: string[];
  illustration: Illustration;
  /** Cardio / timed exercises log minutes instead of weight. */
  timed?: boolean;
  custom?: boolean;
}

const STAND = { hip: [100, 80] as [number, number], torso: 180 };
const HANG: [number, number] = [0, 0];

export const EXERCISES: Exercise[] = [
  /* ------------------------------- Ben ------------------------------- */
  {
    id: 'squat',
    name: 'Squat',
    primary: 'ben',
    secondary: ['baller', 'mave'],
    equipment: 'vægtstang',
    description:
      'Grundøvelsen for underkroppen. Stangen hviler på øvre ryg, og du sætter dig ned mellem hælene med en neutral ryg.',
    cues: [
      'Fødderne i skulderbredde, tæerne let udad',
      'Træk vejret ind i maven og spænd op før hver gentagelse',
      'Knæene følger tæernes retning',
      'Gå mindst til lårene er vandrette',
    ],
    illustration: {
      thumb: 1,
      highlight: ['thigh'],
      poses: [
        { hip: [98, 80], torso: 180, armN: [-40, 150], legN: { to: [100, 150] } },
        { hip: [70, 114], torso: 142, armN: [-78, 112], legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'plate', at: 'shoulder', r: 14, dx: -5, dy: -2 }],
    },
  },
  {
    id: 'goblet-squat',
    name: 'Goblet squat',
    primary: 'ben',
    secondary: ['baller', 'mave'],
    equipment: 'kettlebell',
    description:
      'Squat med en kettlebell eller håndvægt holdt foran brystet. Giver en naturlig oprejst overkrop og er god til at lære squatmønsteret.',
    cues: ['Albuerne peger ned', 'Brystet op mod loftet', 'Skub knæene ud med albuerne i bunden'],
    illustration: {
      thumb: 1,
      highlight: ['thigh'],
      poses: [
        { hip: [98, 80], torso: 180, armN: [22, 165], legN: { to: [100, 150] } },
        { hip: [76, 114], torso: 158, armN: [2, 142], legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'kettlebell', at: 'handN' }],
    },
  },
  {
    id: 'deadlift',
    name: 'Dødløft',
    primary: 'ryg',
    secondary: ['ben', 'baller', 'mave'],
    equipment: 'vægtstang',
    description:
      'Løft stangen fra gulvet til stående position. Træner hele bagkæden – baller, baglår og ryg.',
    cues: [
      'Stangen over midten af foden',
      'Skuldrene lige over eller lidt foran stangen',
      'Skub gulvet væk og hold stangen tæt på kroppen',
      'Lås ud med ballerne – ikke ved at læne dig bagover',
    ],
    illustration: {
      thumb: 1,
      highlight: ['torso', 'thigh'],
      poses: [
        { ...STAND, armN: HANG, legN: { to: [100, 150] } },
        { hip: [76, 100], torso: 114, armN: { to: [106, 136], bend: -1 }, legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'plate', at: 'handN', r: 14 }],
    },
  },
  {
    id: 'romanian-deadlift',
    name: 'Rumænsk dødløft',
    primary: 'ben',
    secondary: ['baller', 'ryg'],
    equipment: 'vægtstang',
    description:
      'Hoftebøjning med næsten strakte ben. Fokus på baglår og baller med en lang, kontrolleret excentrisk fase.',
    cues: ['Let bøjede knæ gennem hele bevægelsen', 'Skub hoften bagud', 'Stop når du mærker stræk i baglårene'],
    illustration: {
      thumb: 1,
      highlight: ['thigh'],
      poses: [
        { ...STAND, armN: HANG, legN: { to: [100, 150] } },
        { hip: [72, 86], torso: 102, armN: { to: [108, 126], bend: -1 }, legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'plate', at: 'handN', r: 14 }],
    },
  },
  {
    id: 'split-squat',
    name: 'Udfaldsskridt',
    primary: 'ben',
    secondary: ['baller'],
    equipment: 'håndvægte',
    description:
      'Et skridt frem og sænk bagerste knæ mod gulvet. Træner ben og baller ét ben ad gangen og udfordrer balancen.',
    cues: ['Overkroppen oprejst', 'Forreste knæ over foden', 'Skub fra gennem forreste hæl'],
    illustration: {
      thumb: 1,
      highlight: ['thigh'],
      poses: [
        { hip: [94, 85], torso: 180, armN: HANG, legN: { to: [122, 150] }, legF: { to: [62, 147] }, footF: 105 },
        { hip: [94, 110], torso: 180, armN: HANG, legN: { to: [122, 150] }, legF: { to: [62, 147] }, footF: 105 },
      ],
      props: [{ kind: 'dumbbell', at: 'handN' }],
    },
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarsk split squat',
    primary: 'ben',
    secondary: ['baller'],
    equipment: 'bænk',
    description:
      'Split squat med bagerste fod hævet på en bænk. En af de mest effektive etbens-øvelser for lår og baller.',
    cues: ['Find en stand hvor forreste fod står stabilt', 'Sænk lige ned', 'Hold hoften lige'],
    illustration: {
      thumb: 1,
      highlight: ['thigh'],
      poses: [
        { hip: [98, 86], torso: 178, armN: HANG, legN: { to: [122, 150] }, legF: { to: [54, 108] }, footF: -80 },
        { hip: [94, 112], torso: 172, armN: HANG, legN: { to: [122, 150] }, legF: { to: [54, 108] }, footF: -80 },
      ],
      props: [
        { kind: 'rect', x: 14, y: 113, w: 48, h: 7 },
        { kind: 'line', from: [22, 120], to: [22, 150], w: 4 },
        { kind: 'line', from: [54, 120], to: [54, 150], w: 4 },
        { kind: 'dumbbell', at: 'handN' },
      ],
    },
  },
  {
    id: 'leg-press',
    name: 'Benpres',
    primary: 'ben',
    secondary: ['baller'],
    equipment: 'maskine',
    description:
      'Pres pladen væk med benene i en skrå maskine. Lader dig træne benene tungt uden at belaste ryggen.',
    cues: ['Lænden presset mod ryglænet', 'Lås ikke knæene helt ud', 'Kontrollér vægten på vej ned'],
    illustration: {
      thumb: 1,
      highlight: ['thigh'],
      poses: [
        { hip: [72, 124], torso: -128, armN: { to: [80, 132] }, legN: { to: [124, 72], bend: 1 }, footN: -135 },
        { hip: [72, 124], torso: -128, armN: { to: [80, 132] }, legN: { to: [100, 100], bend: 1 }, footN: -135 },
      ],
      props: [
        { kind: 'line', from: [66, 134], to: [30, 106], w: 7 },
        { kind: 'line', from: [66, 134], to: [96, 134], w: 7 },
        { kind: 'line', from: [70, 138], to: [70, 152], w: 4 },
        { kind: 'line', from: [120, 128], to: [184, 64], w: 3 },
        { kind: 'attached', at: 'ankleN', from: [-6, -18], to: [16, 4], w: 6 },
      ],
    },
  },
  {
    id: 'leg-extension',
    name: 'Benstræk',
    primary: 'ben',
    secondary: [],
    equipment: 'maskine',
    description: 'Isolationsøvelse for forsiden af låret. Stræk benene ud mod puden fra siddende position.',
    cues: ['Knæleddet på linje med maskinens akse', 'Hold kort i toppen', 'Langsom vej ned'],
    illustration: {
      thumb: 1,
      highlight: ['thigh'],
      poses: [
        { hip: [78, 104], torso: 186, armN: [10, 10], legN: [90, 4], footN: 100 },
        { hip: [78, 104], torso: 186, armN: [10, 10], legN: [90, 82], footN: 175 },
      ],
      props: [
        { kind: 'rect', x: 62, y: 110, w: 54, h: 6 },
        { kind: 'line', from: [66, 106], to: [60, 54], w: 7 },
        { kind: 'line', from: [86, 116], to: [86, 152], w: 5 },
        { kind: 'attached', at: 'ankleN', from: [4, -4], to: [4, 6], w: 8 },
      ],
    },
  },
  {
    id: 'leg-curl',
    name: 'Liggende lårcurl',
    primary: 'ben',
    secondary: [],
    equipment: 'maskine',
    description: 'Isolationsøvelse for baglårene. Bøj benene og træk hælene op mod ballerne.',
    cues: ['Hold hoften presset ned i puden', 'Fuld bevægelse', 'Undgå at svinge'],
    illustration: {
      thumb: 1,
      highlight: ['thigh'],
      poses: [
        { hip: [96, 104], torso: 90, head: 6, armN: [20, 80], legN: [-90, -90], footN: 0 },
        { hip: [96, 104], torso: 90, head: 6, armN: [20, 80], legN: [-90, 175], footN: -90 },
      ],
      props: [
        { kind: 'rect', x: 40, y: 110, w: 118, h: 6 },
        { kind: 'line', from: [96, 116], to: [96, 152], w: 5 },
        { kind: 'attached', at: 'ankleN', from: [-4, -5], to: [-4, 5], w: 8 },
      ],
      noFloor: false,
    },
  },
  {
    id: 'calf-raise',
    name: 'Tåhævninger',
    primary: 'ben',
    secondary: [],
    equipment: 'håndvægte',
    description: 'Rejs dig op på tæerne. Træner lægmusklerne – gerne med fuld bevægelse og en kort pause i toppen.',
    cues: ['Rolig bevægelse op og ned', 'Pause i toppen', 'Fuldt stræk i bunden'],
    illustration: {
      highlight: ['shin'],
      poses: [
        { hip: [100, 80], torso: 180, armN: HANG, legN: { to: [100, 150] }, footN: 90 },
        { hip: [102, 70], torso: 180, armN: HANG, legN: { to: [102, 140] }, footN: 128 },
      ],
      props: [{ kind: 'dumbbell', at: 'handN' }],
    },
  },
  {
    id: 'hip-thrust',
    name: 'Hip thrust',
    primary: 'baller',
    secondary: ['ben'],
    equipment: 'vægtstang',
    description:
      'Skuldrene hviler mod en bænk, og du presser hoften op med stangen over hoftebenet. Isolerer ballerne effektivt.',
    cues: ['Hagen mod brystet', 'Skinnebenene lodrette i toppen', 'Klem ballerne i toppen'],
    illustration: {
      thumb: 1,
      highlight: ['thigh', 'torso'],
      poses: [
        { hip: [92, 130], torso: -112, head: 30, armN: { to: [94, 118], bend: -1 }, legN: { to: [132, 150], bend: -1 } },
        { hip: [96, 106], torso: -90, head: 50, armN: { to: [98, 94], bend: -1 }, legN: { to: [132, 150], bend: -1 } },
      ],
      props: [
        { kind: 'rect', x: 14, y: 110, w: 38, h: 8 },
        { kind: 'line', from: [22, 118], to: [22, 152], w: 4 },
        { kind: 'line', from: [46, 118], to: [46, 152], w: 4 },
        { kind: 'plate', at: 'hip', dy: -12, r: 14 },
      ],
    },
  },

  /* ------------------------------ Bryst ------------------------------ */
  {
    id: 'bench-press',
    name: 'Bænkpres',
    primary: 'bryst',
    secondary: ['triceps', 'skuldre'],
    equipment: 'vægtstang',
    description: 'Den klassiske brystøvelse. Sænk stangen kontrolleret til brystet og pres den op igen.',
    cues: [
      'Skulderbladene samlet og trukket ned',
      'Fødderne plantet i gulvet',
      'Stangen rammer brystet ved brystbenet',
      'Pres op og lidt tilbage mod ansigtet',
    ],
    illustration: {
      highlight: ['upperArm', 'torso'],
      poses: [
        { hip: [68, 101], torso: 90, head: 8, armN: { to: [114, 50] }, legN: { to: [34, 147], bend: -1 } },
        { hip: [68, 101], torso: 90, head: 8, armN: [-15, 178], legN: { to: [34, 147], bend: -1 } },
      ],
      props: [
        { kind: 'rect', x: 44, y: 106, w: 98, h: 7 },
        { kind: 'line', from: [60, 113], to: [60, 152], w: 5 },
        { kind: 'line', from: [128, 113], to: [128, 152], w: 5 },
        { kind: 'plate', at: 'handN', r: 14 },
      ],
    },
  },
  {
    id: 'incline-db-press',
    name: 'Skråbænkpres med håndvægte',
    primary: 'bryst',
    secondary: ['skuldre', 'triceps'],
    equipment: 'håndvægte',
    description: 'Pres på en skråbænk (ca. 30°) rammer den øvre del af brystet. Håndvægte giver større bevægelsesudslag.',
    cues: ['Bænken i 30–45°', 'Albuerne ca. 45° fra kroppen', 'Håndvægtene mødes over brystet'],
    illustration: {
      highlight: ['upperArm', 'torso'],
      poses: [
        { hip: [70, 112], torso: 128, head: 10, armN: { to: [112, 32] }, legN: { to: [118, 150], bend: 1 } },
        { hip: [70, 112], torso: 128, head: 10, armN: [-30, 170], legN: { to: [118, 150], bend: 1 } },
      ],
      props: [
        { kind: 'line', from: [66, 122], to: [102, 94], w: 7 },
        { kind: 'line', from: [58, 122], to: [92, 122], w: 7 },
        { kind: 'line', from: [72, 126], to: [72, 152], w: 5 },
        { kind: 'dumbbell', at: 'handN' },
      ],
    },
  },
  {
    id: 'push-up',
    name: 'Armstrækninger',
    primary: 'bryst',
    secondary: ['triceps', 'skuldre', 'mave'],
    equipment: 'kropsvægt',
    description: 'Kroppen holdes som en planke, mens du sænker brystet mod gulvet og presser op igen.',
    cues: ['Stram mave og baller', 'Hænderne lige under skuldrene', 'Brystet helt ned'],
    illustration: {
      highlight: ['upperArm', 'torso'],
      poses: [
        { hip: [0, 0], torso: 112, armN: [0, 0], legN: [-68, -68], footN: 25, anchor: { joint: 'handN', at: [148, 150] } },
        { hip: [0, 0], torso: 98, armN: [-40, 62], legN: [-81, -81], footN: 25, anchor: { joint: 'handN', at: [148, 150] } },
      ],
    },
  },
  {
    id: 'dips',
    name: 'Dips',
    primary: 'triceps',
    secondary: ['bryst', 'skuldre'],
    equipment: 'kropsvægt',
    description: 'Sænk kroppen mellem to parallelle stænger og pres dig op igen. Et let fremadlæn flytter fokus mod brystet.',
    cues: ['Skuldrene væk fra ørerne', 'Ned til overarmen er vandret', 'Kontrolleret tempo'],
    illustration: {
      highlight: ['upperArm'],
      poses: [
        { hip: [100, 72], torso: 175, armN: { to: [104, 76] }, legN: [18, -100], footN: 160 },
        { hip: [86, 96], torso: 158, armN: { to: [104, 76], bend: -1 }, legN: [22, -100], footN: 160 },
      ],
      props: [
        { kind: 'line', from: [72, 80], to: [140, 80], w: 5 },
        { kind: 'line', from: [132, 80], to: [132, 152], w: 5 },
      ],
    },
  },

  /* ------------------------------- Ryg ------------------------------- */
  {
    id: 'pull-up',
    name: 'Pull-ups',
    primary: 'ryg',
    secondary: ['biceps'],
    equipment: 'kropsvægt',
    description: 'Træk dig op, til hagen er over stangen. Den bedste kropsvægtsøvelse for bred ryg og stærke arme.',
    cues: ['Start fra strakte arme', 'Træk albuerne ned mod lommerne', 'Undgå at svinge'],
    illustration: {
      highlight: ['upperArm', 'torso'],
      poses: [
        { hip: [104, 74], torso: 180, armN: { to: [104, -24] }, legN: [4, -8], footN: 110 },
        { hip: [96, 40], torso: 184, head: -6, armN: { to: [104, -24], bend: -1 }, legN: [10, -20], footN: 110 },
      ],
      props: [
        { kind: 'circle', at: [104, -24], r: 4, fill: true },
        { kind: 'line', from: [104, -24], to: [180, -24], w: 3 },
      ],
      noFloor: true,
    },
  },
  {
    id: 'lat-pulldown',
    name: 'Lat pulldown',
    primary: 'ryg',
    secondary: ['biceps'],
    equipment: 'kabel',
    description: 'Siddende træk af en stang ned til brystet. Et godt alternativ eller supplement til pull-ups.',
    cues: ['Brystet op mod stangen', 'Træk med albuerne', 'Let tilbagelæn – ikke sving'],
    illustration: {
      highlight: ['upperArm', 'torso'],
      poses: [
        { hip: [94, 112], torso: 184, armN: { to: [104, 16] }, legN: [90, 4], footN: 95 },
        { hip: [94, 112], torso: 192, head: -10, armN: { to: [106, 60], bend: -1 }, legN: [90, 4], footN: 95 },
      ],
      props: [
        { kind: 'cable', from: [104, -34], to: 'handN' },
        { kind: 'circle', at: [104, -34], r: 5 },
        { kind: 'rect', x: 72, y: 117, w: 50, h: 7 },
        { kind: 'line', from: [96, 124], to: [96, 152], w: 5 },
        { kind: 'line', from: [124, 104], to: [140, 104], w: 7 },
      ],
    },
  },
  {
    id: 'barbell-row',
    name: 'Foroverbøjet roning',
    primary: 'ryg',
    secondary: ['biceps', 'baller'],
    equipment: 'vægtstang',
    description: 'Med overkroppen foroverbøjet trækkes stangen op mod maven. Bygger tykkelse i hele ryggen.',
    cues: ['Neutral ryg og stram mave', 'Træk mod navlen', 'Pres skulderbladene sammen i toppen'],
    illustration: {
      thumb: 1,
      highlight: ['upperArm', 'torso'],
      poses: [
        { hip: [78, 90], torso: 112, armN: { to: [120, 124] }, legN: { to: [100, 150] } },
        { hip: [78, 90], torso: 112, armN: { to: [104, 96], bend: -1 }, legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'plate', at: 'handN', r: 14 }],
    },
  },
  {
    id: 'db-row',
    name: 'Enarms-roning',
    primary: 'ryg',
    secondary: ['biceps'],
    equipment: 'håndvægte',
    description: 'Med knæ og hånd på en bænk trækkes håndvægten op langs siden. Godt til at rette ubalance mellem siderne.',
    cues: ['Ryggen parallel med gulvet', 'Træk albuen op og bagud', 'Undgå at rotere overkroppen'],
    illustration: {
      thumb: 1,
      highlight: ['upperArm', 'torso'],
      poses: [
        {
          hip: [80, 80],
          torso: 98,
          armN: { to: [126, 124] },
          armF: { to: [130, 104], bend: 1 },
          legN: { to: [96, 150] },
          legF: [-38, -90],
          footF: -90,
        },
        {
          hip: [80, 80],
          torso: 98,
          armN: { to: [110, 86], bend: -1 },
          armF: { to: [130, 104], bend: 1 },
          legN: { to: [96, 150] },
          legF: [-38, -90],
          footF: -90,
        },
      ],
      props: [
        { kind: 'rect', x: 14, y: 108, w: 124, h: 7 },
        { kind: 'line', from: [26, 115], to: [26, 152], w: 5 },
        { kind: 'line', from: [124, 115], to: [124, 152], w: 5 },
        { kind: 'dumbbell', at: 'handN' },
      ],
    },
  },
  {
    id: 'seated-cable-row',
    name: 'Siddende roning',
    primary: 'ryg',
    secondary: ['biceps'],
    equipment: 'kabel',
    description: 'Siddende træk i kabel mod maven. Rammer den midterste ryg og bagside af skuldrene.',
    cues: ['Rank ryg', 'Træk håndtaget til navlen', 'Lad skulderbladene glide frem til sidst'],
    illustration: {
      highlight: ['upperArm', 'torso'],
      poses: [
        { hip: [66, 118], torso: 158, armN: { to: [134, 88] }, legN: { to: [134, 120], bend: 1 }, footN: 175 },
        { hip: [66, 118], torso: 186, armN: { to: [86, 98], bend: -1 }, legN: { to: [134, 120], bend: 1 }, footN: 175 },
      ],
      props: [
        { kind: 'cable', from: [176, 100], to: 'handN' },
        { kind: 'rect', x: 30, y: 123, w: 110, h: 7 },
        { kind: 'line', from: [60, 130], to: [60, 152], w: 5 },
        { kind: 'line', from: [148, 104], to: [148, 136], w: 6 },
        { kind: 'line', from: [176, 90], to: [176, 152], w: 6 },
      ],
    },
  },

  /* ----------------------------- Skuldre ----------------------------- */
  {
    id: 'overhead-press',
    name: 'Skulderpres',
    primary: 'skuldre',
    secondary: ['triceps', 'mave'],
    equipment: 'vægtstang',
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

  /* ------------------------------- Arme ------------------------------ */
  {
    id: 'biceps-curl',
    name: 'Bicepscurl',
    primary: 'biceps',
    secondary: [],
    equipment: 'håndvægte',
    description: 'Bøj albuerne og løft håndvægtene op mod skuldrene med stille overarme.',
    cues: ['Albuerne tæt ind til kroppen', 'Ingen sving i overkroppen', 'Langsom vej ned'],
    illustration: {
      highlight: ['forearm'],
      poses: [
        { ...STAND, armN: [-4, -2], legN: { to: [100, 150] } },
        { ...STAND, armN: [-4, 160], legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'dumbbell', at: 'handN' }],
    },
  },
  {
    id: 'hammer-curl',
    name: 'Hammercurl',
    primary: 'biceps',
    secondary: [],
    equipment: 'håndvægte',
    description: 'Curl med neutralt greb (tommelfingeren opad). Rammer også underarmen og brachialis.',
    cues: ['Tommelfingeren peger op hele vejen', 'Albuerne stille', 'Kontrolleret tempo'],
    illustration: {
      highlight: ['forearm'],
      poses: [
        { ...STAND, armN: [-4, -2], legN: { to: [100, 150] } },
        { ...STAND, armN: [-4, 150], legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'dumbbell', at: 'handN', vertical: true }],
    },
  },
  {
    id: 'triceps-pushdown',
    name: 'Triceps pushdown',
    primary: 'triceps',
    secondary: [],
    equipment: 'kabel',
    description: 'Pres kablet ned ved at strække albuerne. Overarmene holdes stille langs kroppen.',
    cues: ['Albuerne låst ind til siden', 'Stræk helt ud i bunden', 'Let fremadlæn'],
    illustration: {
      highlight: ['forearm'],
      poses: [
        { hip: [96, 80], torso: 172, armN: [6, 150], legN: { to: [98, 150] } },
        { hip: [96, 80], torso: 172, armN: [6, 12], legN: { to: [98, 150] } },
      ],
      props: [
        { kind: 'cable', from: [124, -34], to: 'handN' },
        { kind: 'line', from: [124, -34], to: [150, -34], w: 5 },
        { kind: 'line', from: [150, -38], to: [150, 152], w: 6 },
      ],
    },
  },
  {
    id: 'overhead-triceps',
    name: 'Fransk pres over hovedet',
    primary: 'triceps',
    secondary: [],
    equipment: 'håndvægte',
    description: 'Hold en håndvægt over hovedet og sænk den bag nakken ved at bøje albuerne.',
    cues: ['Overarmene tæt på hovedet', 'Kun albueleddet bevæger sig', 'Stram mave'],
    illustration: {
      highlight: ['forearm'],
      poses: [
        { ...STAND, armN: [172, 180], legN: { to: [100, 150] } },
        { ...STAND, armN: [172, -24], legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'dumbbell', at: 'handN', vertical: true }],
    },
  },

  /* ------------------------------- Mave ------------------------------ */
  {
    id: 'plank',
    name: 'Planke',
    primary: 'mave',
    secondary: ['skuldre'],
    equipment: 'kropsvægt',
    timed: true,
    description: 'Hold kroppen helt lige, støttet på underarme og tæer. Træner hele kroppens stabilitet.',
    cues: ['Lige linje fra hoved til hæl', 'Spænd baller og mave', 'Træk vejret roligt'],
    illustration: {
      highlight: ['torso'],
      duration: 4,
      poses: [
        { hip: [0, 0], torso: 98, head: -4, armN: [0, 90], legN: [-81, -81], footN: 25, anchor: { joint: 'elbowN', at: [134, 147] } },
        { hip: [0, 0], torso: 97, head: -4, armN: [0, 90], legN: [-82, -82], footN: 25, anchor: { joint: 'elbowN', at: [134, 147] } },
      ],
    },
  },
  {
    id: 'crunch',
    name: 'Mavebøjninger',
    primary: 'mave',
    secondary: [],
    equipment: 'kropsvægt',
    description: 'Rul overkroppen op fra gulvet ved at trække brystkassen mod bækkenet.',
    cues: ['Lænden i gulvet', 'Pust ud på vej op', 'Små, kontrollerede bevægelser'],
    illustration: {
      highlight: ['torso'],
      poses: [
        { hip: [116, 143], torso: -90, armN: { to: [102, 141], bend: 1 }, legN: { to: [152, 147], bend: 1 } },
        { hip: [116, 143], torso: -122, head: -20, armN: { to: [118, 116], bend: 1 }, legN: { to: [152, 147], bend: 1 } },
      ],
    },
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hængende benløft',
    primary: 'mave',
    secondary: [],
    equipment: 'kropsvægt',
    description: 'Hæng fra en stang og løft benene op foran dig. Rammer især den nederste del af maven.',
    cues: ['Undgå at svinge', 'Vip bækkenet op i toppen', 'Sænk langsomt'],
    illustration: {
      highlight: ['thigh', 'torso'],
      poses: [
        { hip: [104, 70], torso: 180, armN: { to: [104, -28] }, legN: [2, 0], footN: 120 },
        { hip: [100, 70], torso: 185, armN: { to: [104, -28] }, legN: [96, 92], footN: 175 },
      ],
      props: [
        { kind: 'circle', at: [104, -28], r: 4, fill: true },
        { kind: 'line', from: [104, -28], to: [180, -28], w: 3 },
      ],
      noFloor: true,
    },
  },

  /* ---------------------------- Kondition ---------------------------- */
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell swing',
    primary: 'kondition',
    secondary: ['baller', 'ben', 'ryg'],
    equipment: 'kettlebell',
    description: 'Eksplosiv hoftebøjning, hvor kettlebellen svinges op til brysthøjde. Kombinerer styrke og kondition.',
    cues: ['Bevægelsen kommer fra hoften – ikke armene', 'Klem ballerne i toppen', 'Lad klokken falde tilbage mellem benene'],
    illustration: {
      duration: 1.8,
      highlight: ['thigh', 'torso'],
      poses: [
        { hip: [78, 94], torso: 118, armN: { to: [100, 128] }, legN: { to: [100, 150] } },
        { ...STAND, armN: [92, 92], legN: { to: [100, 150] } },
      ],
      props: [{ kind: 'kettlebell', at: 'handN' }],
    },
  },
  {
    id: 'rowing-machine',
    name: 'Romaskine',
    primary: 'kondition',
    secondary: ['ryg', 'ben'],
    equipment: 'maskine',
    timed: true,
    description: 'Helkropskondition. Rækkefølgen er ben – krop – arme på vej ud og omvendt på vej tilbage.',
    cues: ['Skub med benene først', 'Læn let tilbage i slutningen', 'Rolig vej frem'],
    illustration: {
      duration: 2.4,
      highlight: ['thigh', 'upperArm'],
      poses: [
        { hip: [82, 128], torso: 158, armN: { to: [132, 106] }, legN: { to: [134, 132], bend: 1 }, footN: 160 },
        { hip: [52, 128], torso: 194, head: -8, armN: { to: [74, 104], bend: -1 }, legN: { to: [134, 132], bend: 1 }, footN: 160 },
      ],
      props: [
        { kind: 'cable', from: [168, 112], to: 'handN' },
        { kind: 'circle', at: [170, 120], r: 16 },
        { kind: 'line', from: [16, 138], to: [160, 138], w: 5 },
        { kind: 'line', from: [140, 116], to: [140, 138], w: 6 },
        { kind: 'attached', at: 'hip', from: [-12, 5], to: [12, 5], w: 6 },
        { kind: 'line', from: [24, 138], to: [24, 152], w: 5 },
        { kind: 'line', from: [160, 136], to: [160, 152], w: 5 },
      ],
    },
  },
  {
    id: 'running',
    name: 'Løb',
    primary: 'kondition',
    secondary: ['ben'],
    equipment: 'kropsvægt',
    timed: true,
    description: 'Løb udendørs eller på løbebånd. Log varighed og notér distance eller puls i noterne.',
    cues: ['Korte, lette skridt', 'Afslappede skuldre', 'Land under kroppen'],
    illustration: {
      duration: 1.1,
      highlight: ['thigh', 'shin'],
      poses: [
        {
          hip: [100, 80],
          torso: 172,
          armN: [-40, 50],
          armF: [40, 140],
          legN: [40, -6],
          legF: [-26, -84],
          footN: 94,
          footF: 20,
        },
        {
          hip: [100, 80],
          torso: 172,
          armN: [40, 140],
          armF: [-40, 50],
          legN: [-26, -84],
          legF: [40, -6],
          footN: 20,
          footF: 94,
        },
      ],
    },
  },
  {
    id: 'jumping-jacks',
    name: 'Sprællemand',
    primary: 'kondition',
    secondary: ['ben', 'skuldre'],
    equipment: 'kropsvægt',
    timed: true,
    description: 'Hop ud med benene og løft armene over hovedet. God opvarmning og puls-træning.',
    cues: ['Land blødt på forfoden', 'Fuld armbevægelse', 'Hold et jævnt tempo'],
    illustration: {
      view: 'front',
      duration: 1,
      thumb: 1,
      highlight: ['upperArm', 'thigh'],
      poses: [
        { hip: [100, 80], arms: [8, 4], legs: [3, 0] },
        { hip: [100, 82], arms: [150, 170], legs: [18, 16] },
      ],
    },
  },
];

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
