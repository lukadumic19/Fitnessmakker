import { useEffect, useState } from 'react';
import { ExercisePicker } from '../components/ExercisePicker';
import { Icon } from '../components/Icon';
import { Modal, confirmAction } from '../components/Modal';
import { MUSCLE_LABELS } from '../data/exercises';
import { TEMPLATES, programFromTemplate } from '../data/templates';
import { ExerciseFigure } from '../illustrations/ExerciseFigure';
import { href, navigate } from '../router';
import { remove, upsert, useProfileStore } from '../store';
import type { Program, ProgramDay } from '../types';
import { diffProgram, fmtDate, fmtRelative, nextProgramDay, nowIso, uid } from '../utils';
import { startWorkout } from '../workoutActions';

export function useStartWorkout() {
  const { profile, workouts, update } = useProfileStore();
  return (program?: Program, day?: ProgramDay) => {
    const active = workouts.find((w) => !w.finishedAt);
    if (active && !confirmAction('Du har allerede en træning i gang. Vil du kassere den og starte en ny?')) {
      navigate('/traening/aktiv');
      return;
    }
    const { apply } = startWorkout(profile.id, workouts, program, day);
    update(apply);
    navigate('/traening/aktiv');
  };
}

export function Programs() {
  const { programs, workouts, profile, update } = useProfileStore();
  const [creating, setCreating] = useState(false);
  const start = useStartWorkout();
  const sorted = [...programs].sort((a, b) => Number(b.active) - Number(a.active) || b.updatedAt.localeCompare(a.updatedAt));

  const create = (tId: string | null) => {
    const p = programFromTemplate(TEMPLATES.find((t) => t.id === tId) ?? null, profile.id);
    if (!programs.some((x) => x.active)) p.active = true;
    update(upsert('programs', p));
    setCreating(false);
    navigate(`/programmer/${p.id}`);
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Planlægning</p>
          <h1 className="display">Programmer</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={18} /> Nyt program
        </button>
      </header>

      {sorted.length === 0 ? (
        <div className="empty">
          <Icon name="list" size={28} />
          <h3>Ingen programmer endnu</h3>
          <p className="muted">Byg dit eget program fra bunden, eller start fra en skabelon og tilpas den.</p>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Opret program
          </button>
        </div>
      ) : (
        <div className="program-list">
          {sorted.map((p) => {
            const next = nextProgramDay(p, workouts);
            const count = workouts.filter((w) => w.programId === p.id && w.finishedAt).length;
            const allEx = p.days.flatMap((d) => d.exercises);
            return (
              <article key={p.id} className={`card program-card ${p.active ? 'is-active' : ''}`}>
                <a className="program-card-main" href={href(`/programmer/${p.id}`)}>
                  <div className="program-card-head">
                    <h3>{p.name}</h3>
                    {p.active && <span className="tag tag-accent">Aktivt</span>}
                  </div>
                  <p className="muted small">
                    {p.days.length} {p.days.length === 1 ? 'dag' : 'dage'} · {allEx.length} øvelser · {count} gennemført ·
                    opdateret {fmtRelative(p.updatedAt).toLowerCase()}
                  </p>
                  <div className="thumb-strip">
                    {allEx.slice(0, 8).map((e) => (
                      <ExThumb key={e.id} exerciseId={e.exerciseId} />
                    ))}
                    {allEx.length > 8 && <span className="thumb-more">+{allEx.length - 8}</span>}
                  </div>
                </a>
                {next && (
                  <div className="program-card-foot">
                    <span className="muted small">Næste: {next.name}</span>
                    <button className="btn btn-sm" onClick={() => start(p, next)}>
                      <Icon name="play" size={14} /> Start
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {creating && (
        <Modal title="Nyt program" onClose={() => setCreating(false)} wide>
          <div className="template-grid">
            <button className="template-card template-blank" onClick={() => create(null)}>
              <Icon name="plus" size={24} />
              <strong>Tomt program</strong>
              <span className="muted small">Byg det selv fra bunden</span>
            </button>
            {TEMPLATES.map((t) => (
              <button key={t.id} className="template-card" onClick={() => create(t.id)}>
                <strong>{t.name}</strong>
                <span className="muted small">{t.description}</span>
                <span className="small">{t.days.map((d) => d.name).join(' · ')}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ExThumb({ exerciseId }: { exerciseId: string }) {
  const { exerciseById } = useProfileStore();
  const ex = exerciseById(exerciseId);
  if (!ex) return null;
  return (
    <span className="thumb" title={ex.name}>
      <ExerciseFigure illustration={ex.illustration} />
    </span>
  );
}

export function ProgramEditor({ id }: { id: string }) {
  const { programs, update, exerciseById, workouts } = useProfileStore();
  const saved = programs.find((p) => p.id === id);
  const [draft, setDraft] = useState<Program | undefined>(saved);
  const [picking, setPicking] = useState<{ dayId: string; replace?: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const start = useStartWorkout();

  // Reset the draft only when navigating to another program, not on every save.
  const savedId = saved?.id;
  useEffect(() => setDraft(saved), [savedId]);

  if (!saved || !draft) {
    return (
      <div className="page">
        <p>Programmet findes ikke.</p>
        <a href={href('/programmer')}>Tilbage til programmer</a>
      </div>
    );
  }

  const nameOf = (eid: string) => exerciseById(eid)?.name ?? 'Ukendt øvelse';
  const summary = diffProgram(saved, draft, nameOf);
  const editable = (p: Program) => JSON.stringify([p.name, p.description ?? '', p.days]);
  const dirty = editable(saved) !== editable(draft);

  const setDay = (dayId: string, fn: (d: ProgramDay) => ProgramDay) =>
    setDraft((p) => p && { ...p, days: p.days.map((d) => (d.id === dayId ? fn(d) : d)) });

  const save = () => {
    const now = nowIso();
    const next: Program = {
      ...saved,
      name: draft.name.trim() || saved.name,
      description: draft.description,
      days: draft.days,
      updatedAt: now,
      history: summary ? [{ date: now, summary }, ...saved.history] : saved.history,
    };
    update(upsert('programs', next));
    setDraft(next);
  };

  const setActive = () =>
    update((d) => ({
      ...d,
      programs: d.programs.map((p) => (p.profileId === saved.profileId ? { ...p, active: p.id === saved.id } : p)),
    }));

  const moveEx = (dayId: string, idx: number, dir: -1 | 1) =>
    setDay(dayId, (d) => {
      const ex = [...d.exercises];
      const j = idx + dir;
      if (j < 0 || j >= ex.length) return d;
      [ex[idx], ex[j]] = [ex[j], ex[idx]];
      return { ...d, exercises: ex };
    });

  return (
    <div className="page">
      <a className="back" href={href('/programmer')}>
        <Icon name="back" size={18} /> Programmer
      </a>
      <header className="page-head page-head-edit">
        <div className="grow">
          <input
            className="title-input display"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            aria-label="Programnavn"
          />
          <textarea
            className="desc-input"
            rows={1}
            placeholder="Beskrivelse, mål eller noter til programmet"
            value={draft.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <div className="head-actions">
          {!saved.active && (
            <button className="btn btn-ghost" onClick={setActive}>
              Gør aktivt
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowHistory(true)}>
            <Icon name="history" size={18} /> Ændringer ({saved.history.length})
          </button>
        </div>
      </header>

      {draft.days.map((day, di) => (
        <section key={day.id} className="card day-card">
          <header className="day-head">
            <span className="day-index">{di + 1}</span>
            <input
              className="day-name"
              value={day.name}
              onChange={(e) => setDay(day.id, (d) => ({ ...d, name: e.target.value }))}
              aria-label="Navn på dag"
            />
            <div className="day-actions">
              <button
                className="btn btn-sm"
                disabled={!day.exercises.length || dirty}
                title={dirty ? 'Gem ændringerne først' : undefined}
                onClick={() => start(saved, saved.days.find((d) => d.id === day.id))}
              >
                <Icon name="play" size={14} /> Start
              </button>
              <button
                className="icon-btn"
                aria-label="Slet dag"
                onClick={() =>
                  (!day.exercises.length || confirmAction(`Slet “${day.name}”?`)) &&
                  setDraft({ ...draft, days: draft.days.filter((d) => d.id !== day.id) })
                }
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          </header>

          {day.exercises.length === 0 && <p className="muted empty-inline">Ingen øvelser på denne dag endnu.</p>}

          <ol className="plan-list">
            {day.exercises.map((pe, i) => {
              const ex = exerciseById(pe.exerciseId);
              const set = (patch: Partial<typeof pe>) =>
                setDay(day.id, (d) => ({
                  ...d,
                  exercises: d.exercises.map((x) => (x.id === pe.id ? { ...x, ...patch } : x)),
                }));
              return (
                <li key={pe.id} className="plan-row">
                  <a className="plan-fig" href={href(`/oevelser/${pe.exerciseId}`)} aria-label={`Se ${ex?.name}`}>
                    {ex && <ExerciseFigure illustration={ex.illustration} />}
                  </a>
                  <div className="plan-main">
                    <div className="plan-title">
                      <strong>{ex?.name ?? 'Ukendt øvelse'}</strong>
                      <span className="muted small">{ex && MUSCLE_LABELS[ex.primary]}</span>
                    </div>
                    <div className="plan-fields">
                      <label>
                        <span>Sæt</span>
                        <input
                          inputMode="numeric"
                          value={pe.sets}
                          onChange={(e) => set({ sets: Math.max(1, Math.min(20, Number(e.target.value.replace(/\D/g, '')) || 1)) })}
                        />
                      </label>
                      <label>
                        <span>{ex?.timed ? 'Tid' : 'Reps'}</span>
                        <input value={pe.reps} onChange={(e) => set({ reps: e.target.value })} />
                      </label>
                      {!ex?.timed && (
                        <label>
                          <span>Kg</span>
                          <input
                            inputMode="decimal"
                            placeholder="–"
                            value={pe.weight ?? ''}
                            onChange={(e) => {
                              const v = e.target.value.replace(',', '.');
                              set({ weight: v === '' || isNaN(Number(v)) ? undefined : Number(v) });
                            }}
                          />
                        </label>
                      )}
                      <label>
                        <span>Pause</span>
                        <select value={pe.restSec ?? 90} onChange={(e) => set({ restSec: Number(e.target.value) })}>
                          {[30, 45, 60, 90, 120, 180, 240].map((s) => (
                            <option key={s} value={s}>
                              {s < 60 ? `${s} s` : `${s / 60} min`}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="plan-tools">
                    <button className="icon-btn" aria-label="Flyt op" disabled={i === 0} onClick={() => moveEx(day.id, i, -1)}>
                      <Icon name="up" size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Flyt ned"
                      disabled={i === day.exercises.length - 1}
                      onClick={() => moveEx(day.id, i, 1)}
                    >
                      <Icon name="down" size={18} />
                    </button>
                    <button className="icon-btn" aria-label="Udskift øvelse" onClick={() => setPicking({ dayId: day.id, replace: pe.id })}>
                      <Icon name="swap" size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Fjern øvelse"
                      onClick={() => setDay(day.id, (d) => ({ ...d, exercises: d.exercises.filter((x) => x.id !== pe.id) }))}
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <button className="btn btn-dashed" onClick={() => setPicking({ dayId: day.id })}>
            <Icon name="plus" size={18} /> Tilføj øvelser
          </button>
        </section>
      ))}

      <button
        className="btn btn-dashed btn-block"
        onClick={() =>
          setDraft({ ...draft, days: [...draft.days, { id: uid(), name: `Dag ${draft.days.length + 1}`, exercises: [] }] })
        }
      >
        <Icon name="plus" size={18} /> Tilføj træningsdag
      </button>

      <div className="danger-zone">
        <button
          className="btn btn-ghost"
          onClick={() => {
            const copy: Program = {
              ...structuredClone(saved),
              id: uid(),
              name: `${saved.name} (kopi)`,
              active: false,
              createdAt: nowIso(),
              updatedAt: nowIso(),
              history: [{ date: nowIso(), summary: `Kopieret fra “${saved.name}”` }],
            };
            update(upsert('programs', copy));
            navigate(`/programmer/${copy.id}`);
          }}
        >
          <Icon name="copy" size={18} /> Dupliker
        </button>
        <button
          className="btn btn-danger-ghost"
          onClick={() => {
            if (confirmAction(`Slet programmet “${saved.name}”? Loggede træninger bevares.`)) {
              update(remove('programs', saved.id));
              navigate('/programmer');
            }
          }}
        >
          <Icon name="trash" size={18} /> Slet program
        </button>
      </div>

      {dirty && (
        <div className="savebar">
          <span className="savebar-text">{summary ?? 'Ikke-gemte ændringer'}</span>
          <div className="savebar-actions">
            <button className="btn btn-ghost" onClick={() => setDraft(saved)}>
              Fortryd
            </button>
            <button className="btn btn-primary" onClick={save}>
              Gem ændringer
            </button>
          </div>
        </div>
      )}

      {picking && (
        <ExercisePicker
          multiple={!picking.replace}
          title={picking.replace ? 'Udskift øvelse' : 'Tilføj øvelser'}
          onClose={() => setPicking(null)}
          onPick={(ids) => {
            setDay(picking.dayId, (d) =>
              picking.replace
                ? { ...d, exercises: d.exercises.map((x) => (x.id === picking.replace ? { ...x, exerciseId: ids[0] } : x)) }
                : {
                    ...d,
                    exercises: [
                      ...d.exercises,
                      ...ids.map((exerciseId) => ({
                        id: uid(),
                        exerciseId,
                        sets: 3,
                        reps: exerciseById(exerciseId)?.timed ? '60 sek' : '8–12',
                        restSec: 90,
                      })),
                    ],
                  },
            );
            setPicking(null);
          }}
        />
      )}

      {showHistory && (
        <Modal title="Ændringshistorik" onClose={() => setShowHistory(false)}>
          <p className="muted small">
            Hver gang du gemmer programmet, registreres hvad der er ændret – så du kan se, hvordan dit program har udviklet sig.
            {' '}
            {workouts.filter((w) => w.programId === saved.id && w.finishedAt).length} træninger er gennemført med programmet.
          </p>
          <ol className="timeline">
            {saved.history.map((h, i) => (
              <li key={i}>
                <span className="timeline-date">{fmtDate(h.date)}</span>
                <span>{h.summary}</span>
              </li>
            ))}
          </ol>
        </Modal>
      )}
    </div>
  );
}
