import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { LineChart } from '../components/LineChart';
import { Modal, confirmAction } from '../components/Modal';
import { ExerciseFigure } from '../illustrations/ExerciseFigure';
import { href } from '../router';
import { remove, upsert, useProfileStore } from '../store';
import type { BodyEntry } from '../types';
import { exerciseHistory, fmtDate, fmtNum, todayIso, uid } from '../utils';

const METRICS = [
  { key: 'weight', label: 'Vægt', unit: 'kg' },
  { key: 'bodyFat', label: 'Fedtprocent', unit: '%' },
  { key: 'waist', label: 'Talje', unit: 'cm' },
  { key: 'chest', label: 'Bryst', unit: 'cm' },
  { key: 'arm', label: 'Overarm', unit: 'cm' },
  { key: 'thigh', label: 'Lår', unit: 'cm' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

export function Progress() {
  const [tab, setTab] = useState<'krop' | 'styrke'>('krop');
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Udvikling</p>
          <h1 className="display">Fremskridt</h1>
        </div>
      </header>
      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={tab === 'krop'} className={tab === 'krop' ? 'is-active' : ''} onClick={() => setTab('krop')}>
          Krop & mål
        </button>
        <button role="tab" aria-selected={tab === 'styrke'} className={tab === 'styrke' ? 'is-active' : ''} onClick={() => setTab('styrke')}>
          Styrke
        </button>
      </div>
      {tab === 'krop' ? <Body /> : <Strength />}
    </div>
  );
}

function Body() {
  const { body, update, profile } = useProfileStore();
  const [metric, setMetric] = useState<MetricKey>('weight');
  const [editing, setEditing] = useState<BodyEntry | null>(null);
  const m = METRICS.find((x) => x.key === metric)!;
  const points = body.filter((b) => b[metric] != null).map((b) => ({ date: b.date, value: b[metric]! }));
  const first = points[0];
  const last = points[points.length - 1];
  const available = METRICS.filter((x) => body.some((b) => b[x.key] != null));

  const bmi =
    profile.heightCm && body.findLast((b) => b.weight != null)
      ? body.findLast((b) => b.weight != null)!.weight! / (profile.heightCm / 100) ** 2
      : null;

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">Kropsmål</h2>
        <button className="btn btn-primary" onClick={() => setEditing({ id: uid(), profileId: profile.id, date: todayIso() })}>
          <Icon name="plus" size={18} /> Ny måling
        </button>
      </div>

      {body.length === 0 ? (
        <div className="empty">
          <Icon name="scale" size={28} />
          <h3>Ingen målinger endnu</h3>
          <p className="muted">Log vægt og mål jævnligt – fx hver mandag morgen – for at følge ændringerne over tid.</p>
        </div>
      ) : (
        <>
          <div className="chips">
            {(available.length ? available : METRICS.slice(0, 1)).map((x) => (
              <button key={x.key} className={`chip ${metric === x.key ? 'is-active' : ''}`} onClick={() => setMetric(x.key)}>
                {x.label}
              </button>
            ))}
          </div>
          <div className="card chart-card">
            <div className="chart-head">
              <div>
                <p className="eyebrow">{m.label}</p>
                <p className="big-number">
                  {last ? fmtNum(last.value) : '–'} <span className="muted">{m.unit}</span>
                </p>
              </div>
              {first && last && first !== last && (
                <div className="delta">
                  <span className={last.value - first.value > 0 ? 'up' : 'down'}>
                    {last.value - first.value > 0 ? '+' : ''}
                    {fmtNum(last.value - first.value)} {m.unit}
                  </span>
                  <small className="muted">siden {fmtDate(first.date)}</small>
                </div>
              )}
              {metric === 'weight' && bmi && (
                <div className="delta">
                  <span>{fmtNum(bmi)}</span>
                  <small className="muted">BMI</small>
                </div>
              )}
            </div>
            {points.length > 1 ? (
              <LineChart points={points} unit={m.unit} label={`${m.label} over tid`} />
            ) : (
              <p className="muted small">Log mindst to målinger for at se en kurve.</p>
            )}
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Dato</th>
                  {METRICS.map((x) => (
                    <th key={x.key} className="num">
                      {x.label}
                    </th>
                  ))}
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {[...body].reverse().map((b) => (
                  <tr key={b.id} onClick={() => setEditing(b)} className="clickable">
                    <td>{fmtDate(b.date)}</td>
                    {METRICS.map((x) => (
                      <td key={x.key} className="num">
                        {b[x.key] != null ? fmtNum(b[x.key]!) : <span className="muted">–</span>}
                      </td>
                    ))}
                    <td className="muted truncate">{b.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <BodyForm
          entry={editing}
          isNew={!body.some((b) => b.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(e) => {
            update(upsert('body', e));
            setEditing(null);
          }}
          onDelete={() => {
            if (confirmAction('Slet denne måling?')) {
              update(remove('body', editing.id));
              setEditing(null);
            }
          }}
        />
      )}
    </>
  );
}

function BodyForm({
  entry,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  entry: BodyEntry;
  isNew: boolean;
  onClose: () => void;
  onSave: (e: BodyEntry) => void;
  onDelete: () => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(METRICS.map((m) => [m.key, entry[m.key]?.toString().replace('.', ',') ?? ''])),
  );
  const [date, setDate] = useState(entry.date);
  const [note, setNote] = useState(entry.note ?? '');
  const parse = (v: string) => {
    const n = Number(v.replace(',', '.'));
    return v.trim() && !isNaN(n) ? n : undefined;
  };
  return (
    <Modal title={isNew ? 'Ny måling' : 'Rediger måling'} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const next: BodyEntry = { id: entry.id, profileId: entry.profileId, date, note: note.trim() || undefined };
          for (const m of METRICS) next[m.key] = parse(vals[m.key]);
          onSave(next);
        }}
      >
        <label className="field">
          <span>Dato</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <div className="field-grid">
          {METRICS.map((m) => (
            <label key={m.key} className="field">
              <span>
                {m.label} ({m.unit})
              </span>
              <input
                inputMode="decimal"
                value={vals[m.key]}
                onChange={(e) => setVals({ ...vals, [m.key]: e.target.value })}
                autoFocus={m.key === 'weight'}
              />
            </label>
          ))}
        </div>
        <label className="field">
          <span>Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fx efter ferie, ny kost …" />
        </label>
        <div className="form-actions">
          {!isNew && (
            <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>
              Slet
            </button>
          )}
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuller
          </button>
          <button className="btn btn-primary">Gem</button>
        </div>
      </form>
    </Modal>
  );
}

function Strength() {
  const { workouts, exerciseById } = useProfileStore();
  const trained = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of workouts) {
      if (!w.finishedAt) continue;
      for (const e of w.entries) counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, n]) => ({ ex: exerciseById(id), n }))
      .filter((x) => x.ex && !x.ex.timed)
      .sort((a, b) => b.n - a.n);
  }, [workouts, exerciseById]);
  const [sel, setSel] = useState<string | null>(null);
  const selected = sel ?? trained[0]?.ex?.id ?? null;
  const hist = selected ? exerciseHistory(workouts, selected) : [];
  const ex = selected ? exerciseById(selected) : undefined;

  if (!trained.length) {
    return (
      <div className="empty">
        <Icon name="chart" size={28} />
        <h3>Ingen styrkedata endnu</h3>
        <p className="muted">Når du har logget træninger med vægt, kan du følge din udvikling i hver øvelse her.</p>
      </div>
    );
  }

  const first = hist[0];
  const last = hist[hist.length - 1];

  return (
    <div className="strength">
      <div className="strength-list">
        {trained.map(({ ex: e, n }) => {
          const h = exerciseHistory(workouts, e!.id);
          const best = Math.max(...h.map((p) => p.bestWeight));
          return (
            <button key={e!.id} className={`strength-item ${selected === e!.id ? 'is-active' : ''}`} onClick={() => setSel(e!.id)}>
              <span className="thumb">
                <ExerciseFigure illustration={e!.illustration} />
              </span>
              <span className="grow">
                <strong>{e!.name}</strong>
                <small className="muted">
                  {n}× · bedst {fmtNum(best)} kg
                </small>
              </span>
            </button>
          );
        })}
      </div>
      {ex && (
        <div className="card chart-card">
          <div className="chart-head">
            <div>
              <p className="eyebrow">Estimeret 1RM · {ex.name}</p>
              <p className="big-number">
                {last ? fmtNum(last.bestE1rm, 0) : '–'} <span className="muted">kg</span>
              </p>
            </div>
            {first && last && first !== last && (
              <div className="delta">
                <span className={last.bestE1rm >= first.bestE1rm ? 'up' : 'down'}>
                  {last.bestE1rm >= first.bestE1rm ? '+' : ''}
                  {fmtNum(last.bestE1rm - first.bestE1rm, 0)} kg
                </span>
                <small className="muted">siden {fmtDate(first.date)}</small>
              </div>
            )}
            <a className="link" href={href(`/oevelser/${ex.id}`)}>
              Om øvelsen
            </a>
          </div>
          {hist.length > 1 ? (
            <LineChart
              points={hist.map((h) => ({ date: h.date, value: Math.round(h.bestE1rm * 10) / 10 }))}
              unit="kg"
              label={`Estimeret 1RM for ${ex.name}`}
            />
          ) : (
            <p className="muted small">Træn øvelsen mindst to gange for at se en kurve.</p>
          )}
          <p className="muted small">
            Estimeret 1RM beregnes med Epleys formel ud fra dit bedste sæt i hver træning (vægt × (1 + reps/30)).
          </p>
        </div>
      )}
    </div>
  );
}
