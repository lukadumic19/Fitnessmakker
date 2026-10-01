import { MuscleTags } from '../components/MuscleTags';
import { ExerciseImage } from '../illustrations/ExerciseImage';
import { useState } from 'react';
import { EQUIPMENT_LABELS, EXERCISES, MUSCLE_LABELS, exerciseMuscles, type Exercise } from '../data/exercises';
import { MuscleMap } from '../illustrations/MuscleMap';
import { ExerciseCard, useExerciseFilter } from '../components/ExercisePicker';
import { Icon } from '../components/Icon';
import { LineChart } from '../components/LineChart';
import { Modal, confirmAction } from '../components/Modal';
import { ExerciseFigure } from '../illustrations/ExerciseFigure';
import { navigate } from '../router';
import { remove, upsert, useProfileStore } from '../store';
import type { CustomExercise, Equipment, MuscleGroup } from '../types';
import { exerciseHistory, fmtDate, fmtNum, uid } from '../utils';

export function Library({ openId }: { openId?: string }) {
  const { exercises, exerciseById } = useProfileStore();
  const { filtered, controls } = useExerciseFilter(exercises);
  const [creating, setCreating] = useState(false);
  const open = openId ? exerciseById(openId) : undefined;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Bibliotek</p>
          <h1 className="display">Øvelser</h1>
        </div>
        <button className="btn" onClick={() => setCreating(true)}>
          <Icon name="plus" size={18} /> Egen øvelse
        </button>
      </header>
      {controls}
      <div className="ex-grid">
        {filtered.map((e) => (
          <ExerciseCard key={e.id} exercise={e} onClick={() => navigate(`/oevelser/${e.id}`)} />
        ))}
      </div>
      {!filtered.length && <p className="empty-inline">Ingen øvelser matcher din søgning.</p>}
      {open && <ExerciseDetail exercise={open} onClose={() => navigate('/oevelser')} />}
      {creating && <CustomExerciseForm onClose={() => setCreating(false)} />}
    </div>
  );
}

export function ExerciseDetail({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const { workouts, update } = useProfileStore();
  const history = exerciseHistory(workouts, exercise.id);
  const best = history.reduce((m, p) => Math.max(m, p.bestWeight), 0);
  const bestE1rm = history.reduce((m, p) => Math.max(m, p.bestE1rm), 0);

  return (
    <Modal title={exercise.name} onClose={onClose} wide>
      <div className="detail">
        <div className="detail-fig">
          <ExerciseImage exercise={exercise} animate labels />
        </div>
        <div className="detail-info">
          <div className="detail-trains">
            <span className="eyebrow">Træner</span>
            <MuscleTags exercise={exercise} secondary max={6} />
          </div>
          <p>{exercise.description}</p>
          {exercise.cues.length > 0 && (
            <>
              <h3 className="h-small">Teknik</h3>
              <ol className="cues">
                {exercise.cues.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
            </>
          )}
          <div className="tags">
            <span className="tag tag-outline">{EQUIPMENT_LABELS[exercise.equipment]}</span>
            <span className="tag">{MUSCLE_LABELS[exercise.primary]}</span>
          </div>
        </div>
        <div className="detail-muscles">
          <h3 className="h-small">Muskler</h3>
          <MuscleMap {...exerciseMuscles(exercise)} />
        </div>
      </div>

      <section className="detail-stats">
        <h3 className="h-small">Din historik</h3>
        {history.length === 0 ? (
          <p className="muted">Du har ikke logget denne øvelse endnu.</p>
        ) : (
          <>
            <div className="stat-row">
              <div className="stat">
                <span className="stat-label">Tungeste sæt</span>
                <span className="stat-value">{fmtNum(best)} kg</span>
              </div>
              <div className="stat">
                <span className="stat-label">Estimeret 1RM</span>
                <span className="stat-value">{fmtNum(bestE1rm, 0)} kg</span>
              </div>
              <div className="stat">
                <span className="stat-label">Gange trænet</span>
                <span className="stat-value">{history.length}</span>
              </div>
            </div>
            {history.length > 1 && !exercise.timed && (
              <LineChart
                label={`Estimeret 1RM for ${exercise.name}`}
                unit="kg"
                points={history.map((h) => ({ date: h.date, value: Math.round(h.bestE1rm * 10) / 10 }))}
              />
            )}
            <ul className="mini-list">
              {[...history]
                .reverse()
                .slice(0, 5)
                .map((h) => (
                  <li key={h.workoutId}>
                    <span>{fmtDate(h.date)}</span>
                    <span className="muted">
                      {fmtNum(h.bestWeight)} kg bedst · {h.reps} gentagelser
                    </span>
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>

      {exercise.custom && (
        <div className="form-actions">
          <button
            className="btn btn-danger-ghost"
            onClick={async () => {
              if (await confirmAction(`Slet “${exercise.name}”? Loggede sæt bevares ikke i statistik.`, { confirmLabel: 'Slet' })) {
                update(remove('customExercises', exercise.id));
                onClose();
              }
            }}
          >
            <Icon name="trash" size={18} /> Slet øvelse
          </button>
        </div>
      )}
    </Modal>
  );
}

function CustomExerciseForm({ onClose }: { onClose: () => void }) {
  const { profile, update } = useProfileStore();
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState<MuscleGroup>('bryst');
  const [equipment, setEquipment] = useState<Equipment>('håndvægte');
  const [illustrationOf, setIllustrationOf] = useState(EXERCISES[0].id);
  const [description, setDescription] = useState('');
  const base = EXERCISES.find((e) => e.id === illustrationOf)!;

  return (
    <Modal title="Egen øvelse" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const c: CustomExercise = {
            id: `custom-${uid()}`,
            profileId: profile.id,
            name: name.trim(),
            primary,
            equipment,
            illustrationOf,
            description: description.trim() || undefined,
          };
          update(upsert('customExercises', c));
          onClose();
        }}
      >
        <label className="field">
          <span>Navn</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Muskelgruppe</span>
            <select value={primary} onChange={(e) => setPrimary(e.target.value as MuscleGroup)}>
              {Object.entries(MUSCLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Udstyr</span>
            <select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
              {Object.entries(EQUIPMENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Illustration</span>
          <select value={illustrationOf} onChange={(e) => setIllustrationOf(e.target.value)}>
            {EXERCISES.map((e) => (
              <option key={e.id} value={e.id}>
                Som {e.name}
              </option>
            ))}
          </select>
        </label>
        <div className="illus-preview">
          <ExerciseFigure illustration={base.illustration} animate />
        </div>
        <label className="field">
          <span>Beskrivelse (valgfrit)</span>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuller
          </button>
          <button className="btn btn-primary" disabled={!name.trim()}>
            Gem øvelse
          </button>
        </div>
      </form>
    </Modal>
  );
}
