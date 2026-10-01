import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { NumberWheel } from '../components/Wheel';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { upsert, useStore } from '../store';
import type { Profile } from '../types';
import { nowIso, PROFILE_COLORS, uid } from '../utils';
import { navigate } from '../router';
import { demoData } from '../data/demo';

export function ProfileForm({
  initial,
  onSave,
  onCancel,
  submitLabel,
}: {
  initial?: Profile;
  onSave: (p: Profile) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PROFILE_COLORS[0]);
  const [goal, setGoal] = useState(initial?.goal ?? '');
  const [height, setHeight] = useState<number | null>(initial?.heightCm ?? null);

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
          id: initial?.id ?? uid(),
          createdAt: initial?.createdAt ?? nowIso(),
          name: name.trim(),
          color,
          goal: goal.trim() || undefined,
          heightCm: height ?? undefined,
        });
      }}
    >
      <label className="field">
        <span>Navn</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required placeholder="Fx Luka" />
      </label>
      <div className="field">
        <span>Farve</span>
        <div className="swatches">
          {PROFILE_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={`swatch ${c === color ? 'is-active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Vælg farve ${c}`}
            />
          ))}
        </div>
      </div>
      <label className="field">
        <span>Mål (valgfrit)</span>
        <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Fx stærkere dødløft, 5 km under 25 min" />
      </label>
      <div className="field wheel-compact height-wheel">
        <NumberWheel label="Højde (valgfrit)" unit="cm" value={height} onChange={setHeight} min={120} max={230} fallback={178} optional />
      </div>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annuller
          </button>
        )}
        <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function ProfilePicker() {
  const { data, update, setProfileId } = useStore();
  const [creating, setCreating] = useState(false);

  const choose = (id: string) => {
    setProfileId(id);
    navigate('/');
  };

  return (
    <div className="picker">
      <div className="picker-inner">
        <div className="brand brand-lg">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="dumbbell" size={22} />
          </span>
          Fitnessmakker
        </div>
        <h1 className="display">{data.profiles.length ? 'Hvem træner i dag?' : 'Velkommen'}</h1>
        <p className="muted">
          {data.profiles.length
            ? 'Vælg din profil for at se dine programmer og din træning.'
            : 'Opret en profil for at komme i gang. Du kan tilføje flere profiler senere.'}
        </p>

        <div className="picker-grid">
          {data.profiles.map((p) => (
            <button key={p.id} className="picker-card" onClick={() => choose(p.id)}>
              <Avatar profile={p} size={72} />
              <span className="picker-name">{p.name}</span>
              <span className="picker-meta">
                {data.workouts.filter((w) => w.profileId === p.id && w.finishedAt).length} træninger
              </span>
            </button>
          ))}
          <button className="picker-card picker-add" onClick={() => setCreating(true)}>
            <span className="picker-add-icon">
              <Icon name="plus" size={28} />
            </span>
            <span className="picker-name">Ny profil</span>
          </button>
        </div>
        {!data.profiles.some((p) => p.name === 'Eksempel') && (
          <button
            className="btn btn-ghost picker-demo"
            onClick={() => {
              const demo = demoData();
              update(demo.apply);
              choose(demo.profileId);
            }}
          >
            Prøv med eksempeldata
          </button>
        )}
      </div>

      {creating && (
        <Modal title="Ny profil" onClose={() => setCreating(false)}>
          <ProfileForm
            submitLabel="Opret profil"
            onCancel={() => setCreating(false)}
            onSave={(p) => {
              update(upsert('profiles', p));
              setCreating(false);
              choose(p.id);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
