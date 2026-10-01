import { MuscleTags } from './MuscleTags';
import { ExerciseImage } from '../illustrations/ExerciseImage';
import { useMemo, useState } from 'react';
import { EQUIPMENT_LABELS, MUSCLE_LABELS, exerciseMuscles, type Exercise } from '../data/exercises';
import { MUSCLE_NAMES } from '../data/muscles';
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
        <ExerciseImage exercise={exercise} animate={hover} />
        {selected && (
          <span className="ex-card-check">
            <Icon name="check" size={16} />
          </span>
        )}
      </div>
      <div className="ex-card-body">
        <strong>{exercise.name}</strong>
        <MuscleTags exercise={exercise} max={2} />
        <span className="muted small">
          {EQUIPMENT_LABELS[exercise.equipment]}
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
  const [equipment, setEquipment] = useState<string>('alt');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matches = (e: Exercise) => {
      if (!needle) return true;
      const m = exerciseMuscles(e);
      return [e.name, MUSCLE_LABELS[e.primary], EQUIPMENT_LABELS[e.equipment], ...[...m.primary, ...m.secondary].map((x) => MUSCLE_NAMES[x])]
        .some((t) => t.toLowerCase().includes(needle));
    };
    return list.filter(
      (e) => (muscle === 'alle' || e.primary === muscle) && (equipment === 'alt' || e.equipment === equipment) && matches(e),
    );
  }, [list, q, muscle, equipment]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { alle: list.length };
    for (const e of list) c[e.primary] = (c[e.primary] ?? 0) + 1;
    return c;
  }, [list]);
  const controls = (
    <div className="filters">
      <div className="filter-row">
        <label className="search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg efter øvelse eller muskel" aria-label="Søg" />
        </label>
        <select className="equip-select" value={equipment} onChange={(e) => setEquipment(e.target.value)} aria-label="Udstyr">
          <option value="alt">Alt udstyr</option>
          {Object.entries(EQUIPMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="chips" role="tablist">
        {['alle', ...Object.keys(MUSCLE_LABELS)].map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={muscle === m}
            className={`chip ${muscle === m ? 'is-active' : ''}`}
            onClick={() => setMuscle(m)}
          >
            {m === 'alle' ? 'Alle' : MUSCLE_LABELS[m]} <span className="chip-count">{counts[m] ?? 0}</span>
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
