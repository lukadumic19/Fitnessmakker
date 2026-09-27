import { useEffect, useMemo, useState } from 'react';
import { ExercisePicker } from '../components/ExercisePicker';
import { Icon } from '../components/Icon';
import { Modal, confirmAction } from '../components/Modal';
import type { Exercise } from '../data/exercises';
import { ExerciseFigure } from '../illustrations/ExerciseFigure';
import { href, navigate } from '../router';
import { remove, upsert, useProfileStore } from '../store';
import type { SetLog, Workout, WorkoutEntry } from '../types';
import {
  e1rm,
  fmtDateLong,
  fmtDuration,
  fmtKg,
  fmtNum,
  fmtRelative,
  fmtTime,
  lastSets,
  nextProgramDay,
  nowIso,
  setDone,
  workoutSets,
  workoutVolume,
} from '../utils';
import { newEntry, newSet } from '../workoutActions';
import { useStartWorkout } from './Programs';

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export function Workouts() {
  const { workouts, programs } = useProfileStore();
  const [choosing, setChoosing] = useState(false);
  const start = useStartWorkout();
  const active = workouts.find((w) => !w.finishedAt);
  const finished = workouts.filter((w) => w.finishedAt);
  const activeProgram = programs.find((p) => p.active);
  const next = activeProgram && nextProgramDay(activeProgram, workouts);

  const byMonth = useMemo(() => {
    const groups = new Map<string, Workout[]>();
    for (const w of finished) {
      const key = new Intl.DateTimeFormat('da-DK', { month: 'long', year: 'numeric' }).format(new Date(w.startedAt));
      groups.set(key, [...(groups.get(key) ?? []), w]);
    }
    return [...groups.entries()];
  }, [finished]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Log</p>
          <h1 className="display">Træning</h1>
        </div>
        {!active && (
          <button className="btn btn-primary" onClick={() => setChoosing(true)}>
            <Icon name="play" size={16} /> Start træning
          </button>
        )}
      </header>

      {active && (
        <a className="card card-accent resume" href={href('/traening/aktiv')}>
          <div>
            <p className="eyebrow">I gang siden {fmtTime(active.startedAt)}</p>
            <h3>{active.name}</h3>
            <p className="muted small">
              {active.entries.length} øvelser · {workoutSets(active)} sæt udført
            </p>
          </div>
          <span className="btn btn-primary">Fortsæt</span>
        </a>
      )}

      {!active && next && activeProgram && (
        <div className="card next-card">
          <div>
            <p className="eyebrow">Næste i {activeProgram.name}</p>
            <h3>{next.name}</h3>
            <p className="muted small">{next.exercises.length} øvelser</p>
          </div>
          <button className="btn btn-primary" onClick={() => start(activeProgram, next)}>
            <Icon name="play" size={16} /> Start
          </button>
        </div>
      )}

      <h2 className="section-title">Historik</h2>
      {finished.length === 0 ? (
        <div className="empty">
          <Icon name="dumbbell" size={28} />
          <h3>Ingen træninger endnu</h3>
          <p className="muted">Start en træning fra et program eller log en fri træning.</p>
        </div>
      ) : (
        byMonth.map(([month, list]) => (
          <section key={month} className="month">
            <h3 className="month-title">{month}</h3>
            <div className="workout-list">
              {list.map((w) => (
                <WorkoutRow key={w.id} w={w} />
              ))}
            </div>
          </section>
        ))
      )}

      {choosing && <StartChooser onClose={() => setChoosing(false)} />}
    </div>
  );
}

export function WorkoutRow({ w }: { w: Workout }) {
  const { exerciseById, programs } = useProfileStore();
  const programName = programs.find((p) => p.id === w.programId)?.name;
  const dur = w.finishedAt ? new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime() : 0;
  return (
    <a className="workout-row" href={href(`/traening/${w.id}`)}>
      <div className="workout-date">
        <span>{new Date(w.startedAt).getDate()}</span>
        <small>{new Intl.DateTimeFormat('da-DK', { weekday: 'short' }).format(new Date(w.startedAt))}</small>
      </div>
      <div className="workout-main">
        <strong>
          {w.name}
          {programName && <span className="muted"> · {programName}</span>}
        </strong>
        <span className="muted small truncate">
          {w.entries.map((e) => exerciseById(e.exerciseId)?.name ?? '?').join(', ') || 'Ingen øvelser'}
        </span>
      </div>
      <div className="workout-stats">
        <span>{fmtKg(workoutVolume(w))}</span>
        <small className="muted">
          {workoutSets(w)} sæt · {fmtDuration(dur)}
        </small>
      </div>
      <Icon name="chevron" size={18} className="muted" />
    </a>
  );
}

function StartChooser({ onClose }: { onClose: () => void }) {
  const { programs, workouts } = useProfileStore();
  const start = useStartWorkout();
  const sorted = [...programs].sort((a, b) => Number(b.active) - Number(a.active));
  return (
    <Modal title="Start træning" onClose={onClose}>
      <button className="choice" onClick={() => start()}>
        <Icon name="plus" />
        <span>
          <strong>Fri træning</strong>
          <small className="muted">Tilføj øvelser undervejs</small>
        </span>
      </button>
      {sorted.map((p) => {
        const next = nextProgramDay(p, workouts);
        return (
          <div key={p.id} className="choice-group">
            <h4>
              {p.name} {p.active && <span className="tag tag-accent">Aktivt</span>}
            </h4>
            {p.days.map((d) => (
              <button key={d.id} className="choice" disabled={!d.exercises.length} onClick={() => start(p, d)}>
                <Icon name="play" />
                <span>
                  <strong>
                    {d.name} {next?.id === d.id && <span className="tag">Næste</span>}
                  </strong>
                  <small className="muted">{d.exercises.length} øvelser</small>
                </span>
              </button>
            ))}
          </div>
        );
      })}
      {!programs.length && (
        <p className="muted small">
          Tip: <a href={href('/programmer')}>opret et program</a>, så får du forslag til sæt og vægte.
        </p>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Active workout                                                      */
/* ------------------------------------------------------------------ */

function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

const parseNum = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || isNaN(n) ? null : n;
};

export function ActiveWorkout() {
  const { workouts, update, exerciseById, programs } = useProfileStore();
  const w = workouts.find((x) => !x.finishedAt);
  const now = useNow();
  const [picking, setPicking] = useState<null | { replace?: string }>(null);
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null);
  const [info, setInfo] = useState<Exercise | null>(null);

  if (!w) {
    return (
      <div className="page">
        <div className="empty">
          <Icon name="dumbbell" size={28} />
          <h3>Ingen aktiv træning</h3>
          <a className="btn btn-primary" href={href('/traening')}>
            Gå til træning
          </a>
        </div>
      </div>
    );
  }

  const program = programs.find((p) => p.id === w.programId);
  const plannedDay = program?.days.find((d) => d.id === w.dayId);
  const restFor = (exerciseId: string) =>
    plannedDay?.exercises.find((e) => e.exerciseId === exerciseId)?.restSec ?? 90;

  const save = (next: Workout) => update(upsert('workouts', next));
  const setEntry = (entryId: string, fn: (e: WorkoutEntry) => WorkoutEntry) =>
    save({ ...w, entries: w.entries.map((e) => (e.id === entryId ? fn(e) : e)) });
  const setSet = (entryId: string, setId: string, patch: Partial<SetLog>) =>
    setEntry(entryId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));

  const finish = () => {
    const entries = w.entries
      .map((e) => ({ ...e, sets: e.sets.filter(setDone) }))
      .filter((e) => e.sets.length);
    if (!entries.length) {
      if (confirmAction('Ingen sæt er markeret som udført. Vil du kassere træningen?')) {
        update(remove('workouts', w.id));
        navigate('/traening');
      }
      return;
    }
    const undone = w.entries.reduce((n, e) => n + e.sets.filter((s) => !setDone(s)).length, 0);
    if (undone && !confirmAction(`${undone} sæt er ikke markeret som udført og bliver ikke gemt. Afslut alligevel?`)) return;
    save({ ...w, entries, finishedAt: nowIso() });
    navigate(`/traening/${w.id}`);
  };

  const restLeft = rest ? Math.max(0, Math.ceil((rest.end - now) / 1000)) : 0;

  return (
    <div className="page page-workout">
      <header className="workout-head">
        <div className="grow">
          <p className="eyebrow">
            <Icon name="clock" size={14} /> {fmtDuration(now - new Date(w.startedAt).getTime())}
            {program ? ` · ${program.name}` : ` · startet ${fmtTime(w.startedAt)}`}
          </p>
          <input
            className="title-input display"
            value={w.name}
            onChange={(e) => save({ ...w, name: e.target.value })}
            aria-label="Navn på træning"
          />
        </div>
        <div className="head-actions">
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (confirmAction('Kassér denne træning? Det kan ikke fortrydes.')) {
                update(remove('workouts', w.id));
                navigate('/traening');
              }
            }}
          >
            Kassér
          </button>
          <button className="btn btn-primary" onClick={finish}>
            <Icon name="check" size={18} /> Afslut
          </button>
        </div>
      </header>

      {w.entries.map((entry) => {
        const ex = exerciseById(entry.exerciseId);
        const prev = lastSets(workouts, entry.exerciseId, w.id);
        const planned = plannedDay?.exercises.find((p) => p.exerciseId === entry.exerciseId);
        const timed = ex?.timed;
        return (
          <section key={entry.id} className="card log-card">
            <header className="log-head">
              <button className="log-fig" onClick={() => ex && setInfo(ex)} aria-label={`Vis ${ex?.name}`}>
                {ex && <ExerciseFigure illustration={ex.illustration} />}
              </button>
              <div className="grow">
                <h3>{ex?.name ?? 'Ukendt øvelse'}</h3>
                <p className="muted small">
                  {planned ? `Plan: ${planned.sets} × ${planned.reps}${planned.weight ? ` @ ${fmtNum(planned.weight)} kg` : ''}` : ''}
                  {planned && prev ? ' · ' : ''}
                  {prev
                    ? `Sidst: ${prev.map((s) => (timed ? `${s.reps} min` : `${fmtNum(s.weight ?? 0)}×${s.reps}`)).join(', ')}`
                    : !planned && 'Første gang – god fornøjelse'}
                </p>
              </div>
              <div className="log-tools">
                <button className="icon-btn" aria-label="Udskift øvelse" onClick={() => setPicking({ replace: entry.id })}>
                  <Icon name="swap" size={18} />
                </button>
                <button
                  className="icon-btn"
                  aria-label="Fjern øvelse"
                  onClick={() =>
                    (!entry.sets.some(setDone) || confirmAction(`Fjern ${ex?.name} fra træningen?`)) &&
                    save({ ...w, entries: w.entries.filter((e) => e.id !== entry.id) })
                  }
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </header>

            <div className={`set-table ${timed ? 'is-timed' : ''}`}>
              <div className="set-row set-row-head">
                <span>Sæt</span>
                <span>Forrige</span>
                {!timed && <span>Kg</span>}
                <span>{timed ? 'Min' : 'Reps'}</span>
                <span aria-label="Udført" />
              </div>
              {entry.sets.map((s, i) => {
                const p = prev?.[i];
                return (
                  <div key={s.id} className={`set-row ${s.done ? 'is-done' : ''}`}>
                    <span className="set-no">
                      <button
                        className="set-del"
                        aria-label={`Slet sæt ${i + 1}`}
                        onClick={() => setEntry(entry.id, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== s.id) }))}
                      >
                        {i + 1}
                      </button>
                    </span>
                    <span className="muted small">
                      {p ? (timed ? `${p.reps} min` : `${fmtNum(p.weight ?? 0)} × ${p.reps}`) : '–'}
                    </span>
                    {!timed && (
                      <input
                        inputMode="decimal"
                        aria-label="Vægt i kg"
                        placeholder={p?.weight != null ? String(p.weight) : '0'}
                        value={s.weight ?? ''}
                        onChange={(e) => setSet(entry.id, s.id, { weight: parseNum(e.target.value) })}
                      />
                    )}
                    <input
                      inputMode="numeric"
                      aria-label={timed ? 'Minutter' : 'Gentagelser'}
                      placeholder={p?.reps != null ? String(p.reps) : '0'}
                      value={s.reps ?? ''}
                      onChange={(e) => setSet(entry.id, s.id, { reps: parseNum(e.target.value) })}
                    />
                    <button
                      className={`check ${s.done ? 'is-on' : ''}`}
                      aria-label={s.done ? 'Markér som ikke udført' : 'Markér som udført'}
                      aria-pressed={s.done}
                      onClick={() => {
                        const done = !s.done;
                        // Fill from placeholder (previous) values when ticking an empty set.
                        const patch: Partial<SetLog> = { done };
                        if (done && s.reps == null && p?.reps != null) patch.reps = p.reps;
                        if (done && s.weight == null && p?.weight != null) patch.weight = p.weight;
                        setSet(entry.id, s.id, patch);
                        if (done && !timed) {
                          const total = restFor(entry.exerciseId);
                          setRest({ end: Date.now() + total * 1000, total });
                        }
                      }}
                    >
                      <Icon name="check" size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              className="btn btn-dashed btn-sm"
              onClick={() => {
                const last = entry.sets[entry.sets.length - 1];
                setEntry(entry.id, (e) => ({ ...e, sets: [...e.sets, newSet({ reps: last?.reps, weight: last?.weight })] }));
              }}
            >
              <Icon name="plus" size={16} /> Tilføj sæt
            </button>
          </section>
        );
      })}

      <button className="btn btn-dashed btn-block" onClick={() => setPicking({})}>
        <Icon name="plus" size={18} /> Tilføj øvelse
      </button>

      <label className="field notes-field">
        <span>Noter</span>
        <textarea
          rows={3}
          placeholder="Hvordan gik det? Søvn, energi, smerter, distance, puls …"
          value={w.notes ?? ''}
          onChange={(e) => save({ ...w, notes: e.target.value })}
        />
      </label>

      {rest && restLeft > 0 && (
        <div className="rest-bar" role="timer" aria-live="polite">
          <div className="rest-progress" style={{ width: `${(restLeft / rest.total) * 100}%` }} />
          <span className="rest-label">Pause</span>
          <strong className="rest-time">
            {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}
          </strong>
          <button className="btn btn-sm btn-ghost" onClick={() => setRest({ ...rest, end: rest.end + 15000, total: rest.total + 15 })}>
            +15 s
          </button>
          <button className="btn btn-sm" onClick={() => setRest(null)}>
            Spring over
          </button>
        </div>
      )}

      {picking && (
        <ExercisePicker
          multiple={!picking.replace}
          title={picking.replace ? 'Udskift øvelse' : 'Tilføj øvelser'}
          onClose={() => setPicking(null)}
          onPick={(ids) => {
            if (picking.replace) {
              setEntry(picking.replace, (e) => ({ ...newEntry(ids[0], workouts, e.sets.length), id: e.id }));
            } else {
              save({ ...w, entries: [...w.entries, ...ids.map((id) => newEntry(id, workouts))] });
            }
            setPicking(null);
          }}
        />
      )}

      {info && <ExerciseInfo exercise={info} onClose={() => setInfo(null)} />}
    </div>
  );
}

function ExerciseInfo({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  return (
    <Modal title={exercise.name} onClose={onClose}>
      <div className="detail-fig detail-fig-sm">
        <ExerciseFigure illustration={exercise.illustration} animate />
      </div>
      <p>{exercise.description}</p>
      {exercise.cues.length > 0 && (
        <ol className="cues">
          {exercise.cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Finished workout                                                    */
/* ------------------------------------------------------------------ */

export function WorkoutDetail({ id }: { id: string }) {
  const { workouts, exerciseById, update, programs } = useProfileStore();
  const w = workouts.find((x) => x.id === id);
  if (!w) {
    return (
      <div className="page">
        <p>Træningen findes ikke.</p>
        <a href={href('/traening')}>Tilbage</a>
      </div>
    );
  }
  if (!w.finishedAt) {
    return (
      <div className="page">
        <p>Denne træning er stadig i gang.</p>
        <a className="btn btn-primary" href={href('/traening/aktiv')}>
          Fortsæt træningen
        </a>
      </div>
    );
  }

  const earlier = workouts.filter((x) => x.finishedAt && x.startedAt < w.startedAt);
  const prBefore = (exerciseId: string) =>
    Math.max(
      0,
      ...earlier.flatMap((x) =>
        x.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets.filter(setDone).map((s) => e1rm(s.weight ?? 0, s.reps ?? 0))),
      ),
    );
  const hadBefore = (exerciseId: string) => earlier.some((x) => x.entries.some((e) => e.exerciseId === exerciseId));

  const dur = new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime();
  let prCount = 0;

  const entries = w.entries.map((e) => {
    const ex = exerciseById(e.exerciseId);
    const before = prBefore(e.exerciseId);
    const best = Math.max(0, ...e.sets.map((s) => e1rm(s.weight ?? 0, s.reps ?? 0)));
    const isPr = !ex?.timed && hadBefore(e.exerciseId) && best > before && best > 0;
    if (isPr) prCount++;
    return { e, ex, isPr, best };
  });

  return (
    <div className="page">
      <a className="back" href={href('/traening')}>
        <Icon name="back" size={18} /> Træning
      </a>
      <header className="page-head">
        <div>
          <p className="eyebrow">
            {fmtDateLong(w.startedAt)} · {fmtTime(w.startedAt)}
            {programs.find((p) => p.id === w.programId) && ` · ${programs.find((p) => p.id === w.programId)!.name}`}
          </p>
          <h1 className="display">{w.name}</h1>
        </div>
      </header>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">Varighed</span>
          <span className="stat-value">{fmtDuration(dur)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Volumen</span>
          <span className="stat-value">{fmtKg(workoutVolume(w))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Sæt</span>
          <span className="stat-value">{workoutSets(w)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Rekorder</span>
          <span className="stat-value">{prCount}</span>
        </div>
      </div>

      <div className="summary-list">
        {entries.map(({ e, ex, isPr }) => (
          <section key={e.id} className="card summary-card">
            <a className="log-fig" href={href(`/oevelser/${e.exerciseId}`)}>
              {ex && <ExerciseFigure illustration={ex.illustration} />}
            </a>
            <div className="grow">
              <h3>
                {ex?.name ?? 'Ukendt øvelse'}{' '}
                {isPr && (
                  <span className="tag tag-accent">
                    <Icon name="trophy" size={12} /> Ny rekord
                  </span>
                )}
              </h3>
              <div className="set-chips">
                {e.sets.map((s, i) => (
                  <span key={s.id} className="set-chip">
                    <small>{i + 1}</small>
                    {ex?.timed ? `${s.reps} min` : `${fmtNum(s.weight ?? 0)} kg × ${s.reps}`}
                  </span>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      {w.notes && (
        <section className="card notes-card">
          <h3 className="h-small">
            <Icon name="note" size={16} /> Noter
          </h3>
          <p>{w.notes}</p>
        </section>
      )}

      <div className="danger-zone">
        <span className="muted small">Logget {fmtRelative(w.finishedAt).toLowerCase()}</span>
        <button
          className="btn btn-danger-ghost"
          onClick={() => {
            if (confirmAction('Slet denne træning permanent?')) {
              update(remove('workouts', w.id));
              navigate('/traening');
            }
          }}
        >
          <Icon name="trash" size={18} /> Slet træning
        </button>
      </div>
    </div>
  );
}
