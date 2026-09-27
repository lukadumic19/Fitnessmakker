import { useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { confirmAction } from '../components/Modal';
import { navigate } from '../router';
import { removeProfile, upsert, useProfileStore } from '../store';
import type { AppData } from '../types';
import { todayIso } from '../utils';
import { ProfileForm } from './ProfilePicker';

export function Settings() {
  const { profile, data, update, setProfileId, workouts, programs, body } = useProfileStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fitnessmakker-${todayIso()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppData;
      if (!Array.isArray(parsed.profiles) || !Array.isArray(parsed.workouts)) throw new Error('format');
      if (!(await confirmAction('Importen erstatter alle data i denne browser (alle profiler).', { confirmLabel: 'Importér' }))) return;
      update(() => ({ ...parsed, version: 1, programs: parsed.programs ?? [], body: parsed.body ?? [], customExercises: parsed.customExercises ?? [] }));
      setMsg(`Importeret: ${parsed.profiles.length} profiler og ${parsed.workouts.length} træninger.`);
      if (!parsed.profiles.some((p) => p.id === profile.id)) setProfileId(null);
    } catch {
      setMsg('Filen kunne ikke læses. Vælg en eksport fra Fitnessmakker.');
    }
  };

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div className="profile-head">
          <Avatar profile={profile} size={56} />
          <div>
            <p className="eyebrow">Profil</p>
            <h1 className="display">{profile.name}</h1>
          </div>
        </div>
        <button
          className="btn"
          onClick={() => {
            setProfileId(null);
            navigate('/');
          }}
        >
          <Icon name="logout" size={18} /> Skift profil
        </button>
      </header>

      <section className="card">
        <h2 className="section-title">Profiloplysninger</h2>
        <ProfileForm key={profile.id} initial={profile} submitLabel="Gem profil" onSave={(p) => update(upsert('profiles', p))} />
      </section>

      <section className="card">
        <h2 className="section-title">Data</h2>
        <p className="muted small">
          Alt gemmes lokalt i denne browser – intet sendes til en server. Tag en backup jævnligt, eller flyt data til en anden enhed
          med eksport/import.
        </p>
        <p className="small">
          {programs.length} programmer · {workouts.filter((w) => w.finishedAt).length} træninger · {body.length} målinger
        </p>
        <div className="btn-row">
          <button className="btn" onClick={exportData}>
            <Icon name="download" size={18} /> Eksportér alle data
          </button>
          <button
            className="btn"
            onClick={() => {
              const text = JSON.stringify(data);
              navigator.clipboard
                ?.writeText(text)
                .then(() => setMsg('Alle data er kopieret. Gem teksten i en fil (.json), så kan du importere den senere.'))
                .catch(() => setMsg('Kopiering blev blokeret af browseren. Brug “Eksportér” i stedet.'));
            }}
          >
            <Icon name="copy" size={18} /> Kopiér data
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={18} /> Importér
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importData(f);
              e.target.value = '';
            }}
          />
        </div>
        {msg && <p className="notice">{msg}</p>}
      </section>

      <section className="card card-danger">
        <h2 className="section-title">Slet profil</h2>
        <p className="muted small">Sletter {profile.name} og alle tilhørende programmer, træninger og målinger permanent.</p>
        <button
          className="btn btn-danger"
          onClick={async () => {
            if (await confirmAction(`Slet profilen “${profile.name}” og alle data? Det kan ikke fortrydes.`, { confirmLabel: 'Slet profil' })) {
              update(removeProfile(profile.id));
              setProfileId(null);
              navigate('/');
            }
          }}
        >
          <Icon name="trash" size={18} /> Slet profil
        </button>
      </section>
    </div>
  );
}
