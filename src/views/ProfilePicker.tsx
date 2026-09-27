import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { upsert, useStore } from '../store';
import type { Profile } from '../types';
import { nowIso, PROFILE_COLORS, uid } from '../utils';
import { navigate } from '../router';

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
  const [height, setHeight] = useState(initial?.heightCm?.toString() ?? '');

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
          heightCm: height ? Number(height) : undefined,
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
      <label className="field">
        <span>Højde i cm (valgfrit)</span>
        <input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value.replace(/[^\d]/g, ''))} />
      </label>
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
  const [creating, setCreating] = useState(data.profiles.length === 0);

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
