import { useMemo } from 'react';
import { exerciseMuscles, type Exercise } from '../data/exercises';
import { ExerciseFigure } from './ExerciseFigure';

/** An exercise's illustration with its trained muscles highlighted. */
export function ExerciseImage({
  exercise,
  animate,
  labels,
  className,
}: {
  exercise: Exercise;
  animate?: boolean;
  labels?: boolean;
  className?: string;
}) {
  const muscles = useMemo(() => exerciseMuscles(exercise), [exercise]);
  return (
    <ExerciseFigure
      illustration={exercise.illustration}
      muscles={muscles}
      animate={animate}
      labels={labels}
      className={className}
      title={exercise.name}
    />
  );
}
