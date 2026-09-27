import { useMemo, useState } from 'react';
import { EQUIPMENT_LABELS, MUSCLE_LABELS, type Exercise } from '../data/exercises';
import { ExerciseFigure } from '../illustrations/ExerciseFigure';
import { useStore } from '../store';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function ExerciseCard({
  exercise,
  onClick,
  selected,
  meta,
}: {
  exercise: Exercise;
  onClick: () => void;
  selected?: boolean;
  meta?: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      className={`ex-card ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className="ex-card-fig">
        <ExerciseFigure illustration={exercise.illustration} animate={hover} title={exercise.name} />
        {selected && (
          <span className="ex-card-check">
            <Icon name="check" size={16} />
          </span>
        )}
      </div>
      <div className="ex-card-body">
        <strong>{exercise.name}</strong>
        <span className="muted small">
          {MUSCLE_LABELS[exercise.primary]} · {EQUIPMENT_LABELS[exercise.equipment]}
          {exercise.custom ? ' · Egen' : ''}
        </span>
        {meta}
      </div>
    </button>
  );
}

export function useExerciseFilter(list: Exercise[]) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<string>('alle');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter(
      (e) =>
        (muscle === 'alle' || e.primary === muscle) &&
        (!needle || e.name.toLowerCase().includes(needle) || MUSCLE_LABELS[e.primary].toLowerCase().includes(needle)),
    );
  }, [list, q, muscle]);
  const controls = (
    <div className="filters">
      <label className="search">
        <Icon name="search" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg efter øvelse" />
      </label>
      <div className="chips" role="tablist">
        {['alle', ...Object.keys(MUSCLE_LABELS)].map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={muscle === m}
            className={`chip ${muscle === m ? 'is-active' : ''}`}
            onClick={() => setMuscle(m)}
          >
            {m === 'alle' ? 'Alle' : MUSCLE_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  );
  return { filtered, controls };
}

/** Modal to pick one or more exercises. */
export function ExercisePicker({
  onPick,
  onClose,
  multiple = true,
  title = 'Tilføj øvelser',
}: {
  onPick: (ids: string[]) => void;
  onClose: () => void;
  multiple?: boolean;
  title?: string;
}) {
  const { exercises } = useStore();
  const { filtered, controls } = useExerciseFilter(exercises);
  const [sel, setSel] = useState<string[]>([]);

  const toggle = (id: string) => {
    if (!multiple) {
      onPick([id]);
      return;
    }
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      wide
      footer={
        multiple && (
          <>
            <span className="muted">{sel.length ? `${sel.length} valgt` : 'Vælg en eller flere øvelser'}</span>
            <button className="btn btn-primary" disabled={!sel.length} onClick={() => onPick(sel)}>
              Tilføj {sel.length || ''}
            </button>
          </>
        )
      }
    >
      {controls}
      <div className="ex-grid ex-grid-compact">
        {filtered.map((e) => (
          <ExerciseCard key={e.id} exercise={e} selected={sel.includes(e.id)} onClick={() => toggle(e.id)} />
        ))}
      </div>
      {!filtered.length && <p className="empty-inline">Ingen øvelser matcher din søgning.</p>}
    </Modal>
  );
}
