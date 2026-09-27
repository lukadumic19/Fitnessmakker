import { exerciseMuscles, type Exercise } from '../data/exercises';
import { MUSCLE_SHORT } from '../data/muscles';

/** The muscles an exercise trains, as compact tags (primary first). */
export function MuscleTags({ exercise, secondary = false, max = 3 }: { exercise: Exercise; secondary?: boolean; max?: number }) {
  const m = exerciseMuscles(exercise);
  const primary = m.primary.slice(0, max);
  const sec = secondary ? m.secondary.slice(0, Math.max(0, max - primary.length)) : [];
  if (!primary.length && !sec.length) return <span className="muscle-tags"><span className="mtag">Hele kroppen</span></span>;
  return (
    <span className="muscle-tags">
      {primary.map((x) => (
        <span key={x} className="mtag mtag-1">
          {MUSCLE_SHORT[x]}
        </span>
      ))}
      {sec.map((x) => (
        <span key={x} className="mtag mtag-2">
          {MUSCLE_SHORT[x]}
        </span>
      ))}
    </span>
  );
}
