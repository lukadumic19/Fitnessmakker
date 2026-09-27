import type { PlannedExercise } from '../types';
import { fmtNum } from '../utils';
import { NumberWheel, PickerSheet, Wheel } from './Wheel';

/** Reps are stored as text: "8", "8–12" or "45 sek". */
export type Reps = { kind: 'reps'; min: number; max: number | null } | { kind: 'sec'; sec: number };

export function parseReps(s: string, timed?: boolean): Reps {
  const sec = s.match(/(\d+)\s*sek/);
  if (sec) return { kind: 'sec', sec: Number(sec[1]) };
  const nums = (s.match(/\d+/g) ?? []).map(Number);
  if (timed) return { kind: 'sec', sec: nums[0] ?? 60 };
  const min = nums[0] ?? 8;
  const max = nums[1] != null && nums[1] > min ? nums[1] : null;
  return { kind: 'reps', min, max };
}

export const formatReps = (r: Reps) =>
  r.kind === 'sec' ? `${r.sec} sek` : r.max != null ? `${r.min}–${r.max}` : `${r.min}`;

/** Short label for a reps value as shown in the editor. */
export function repsLabel(reps: string, timed?: boolean) {
  const r = parseReps(reps, timed);
  return r.kind === 'sec' ? fmtClock(r.sec) : formatReps(r);
}

export const fmtClock = (sec: number) =>
  sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const range = (a: number, b: number, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);
const SETS = range(1, 12).map((v) => ({ value: v, label: String(v) }));
const REST = range(15, 600, 15).map((v) => ({ value: v, label: fmtClock(v) }));
const SECS = range(5, 600, 5).map((v) => ({ value: v, label: fmtClock(v) }));
const MIN_REPS = range(1, 50).map((v) => ({ value: v, label: String(v) }));

/** Popover / bottom sheet with every wheel for one planned exercise. */
export function PlanPicker({
  anchor,
  title,
  planned,
  timed,
  fallbackWeight,
  onChange,
  onClose,
}: {
  anchor: HTMLElement;
  title: string;
  planned: PlannedExercise;
  timed?: boolean;
  fallbackWeight: number;
  onChange: (patch: Partial<PlannedExercise>) => void;
  onClose: () => void;
}) {
  const reps = parseReps(planned.reps, timed);
  const maxOpts =
    reps.kind === 'reps'
      ? [{ value: null as number | null, label: '–' }, ...range(reps.min + 1, 60).map((v) => ({ value: v as number | null, label: String(v) }))]
      : [];

  return (
    <PickerSheet
      anchor={anchor}
      title={title}
      subtitle={`${planned.sets} × ${formatReps(reps)}${planned.weight != null ? ` · ${fmtNum(planned.weight, 2)} kg` : ''} · pause ${fmtClock(planned.restSec ?? 90)}`}
      onClose={onClose}
      footer={
        <>
          <span className="muted">Scroll eller brug piletasterne</span>
          <button className="btn btn-primary" onClick={onClose}>
            Færdig
          </button>
        </>
      }
    >
      <div className="picker-row is-dense">
        <div className="picker-col">
          <span className="num-wheel-label">Sæt</span>
          <Wheel label="Sæt" options={SETS} value={planned.sets} onChange={(v) => onChange({ sets: v })} />
        </div>
        {reps.kind === 'sec' ? (
          <div className="picker-col">
            <span className="num-wheel-label">Tid</span>
            <Wheel label="Tid" options={SECS} value={reps.sec} onChange={(v) => onChange({ reps: formatReps({ kind: 'sec', sec: v }) })} />
          </div>
        ) : (
          <div className="picker-col">
            <span className="num-wheel-label">Reps</span>
            <div className="num-wheel-row">
              <Wheel
                label="Reps fra"
                options={MIN_REPS}
                value={reps.min}
                onChange={(v) => onChange({ reps: formatReps({ ...reps, min: v, max: reps.max != null && reps.max > v ? reps.max : null }) })}
              />
              <Wheel label="Reps til" options={maxOpts} value={reps.max} onChange={(v) => onChange({ reps: formatReps({ ...reps, max: v }) })} />
            </div>
          </div>
        )}
        {!timed && (
          <NumberWheel
            label="Kg"
            value={planned.weight ?? null}
            onChange={(v) => onChange({ weight: v ?? undefined })}
            min={0}
            max={400}
            fractions={[0, 0.25, 0.5, 0.75]}
            fallback={fallbackWeight}
            optional
          />
        )}
        <div className="picker-col">
          <span className="num-wheel-label">Pause</span>
          <Wheel label="Pause" options={REST} value={planned.restSec ?? 90} onChange={(v) => onChange({ restSec: v })} />
        </div>
      </div>
    </PickerSheet>
  );
}
