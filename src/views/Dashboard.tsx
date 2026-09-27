import { Icon } from '../components/Icon';
import { ExerciseFigure } from '../illustrations/ExerciseFigure';
import { href } from '../router';
import { useProfileStore } from '../store';
import { e1rm, fmtKg, fmtNum, fmtRelative, nextProgramDay, setDone, startOfWeek, weekStreak, workoutVolume } from '../utils';
import { useStartWorkout } from './Programs';
import { WorkoutRow } from './Workouts';

const WEEKS = 12;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'God nat';
  if (h < 10) return 'Godmorgen';
  if (h < 17) return 'God eftermiddag';
  return 'God aften';
}

export function Dashboard() {
  const { profile, workouts, programs, body, exerciseById } = useProfileStore();
  const start = useStartWorkout();
  const finished = workouts.filter((w) => w.finishedAt);
  const active = workouts.find((w) => !w.finishedAt);
  const activeProgram = programs.find((p) => p.active);
  const next = activeProgram && nextProgramDay(activeProgram, workouts);

  const weekStart = startOfWeek().getTime();
  const thisWeek = finished.filter((w) => new Date(w.startedAt).getTime() >= weekStart);
  const perWeek = activeProgram?.days.length ?? 3;

  // Workouts per week, oldest first.
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const s = weekStart - (WEEKS - 1 - i) * 7 * 86400000;
    const e = s + 7 * 86400000;
    const list = finished.filter((w) => {
      const t = new Date(w.startedAt).getTime();
      return t >= s && t < e;
    });
    return { start: s, count: list.length, volume: list.reduce((a, w) => a + workoutVolume(w), 0) };
  });
  const maxCount = Math.max(perWeek, ...weeks.map((w) => w.count));

  const weights = body.filter((b) => b.weight != null);
  const lastWeight = weights[weights.length - 1];
  const monthAgo = Date.now() - 30 * 86400000;
  const baseWeight = weights.find((b) => new Date(b.date).getTime() >= monthAgo) ?? weights[0];
  const weightDelta = lastWeight && baseWeight && lastWeight !== baseWeight ? lastWeight.weight! - baseWeight.weight! : null;

  // Recent personal records (estimated 1RM beats all earlier sessions).
  const prs: { name: string; exerciseId: string; value: string; date: string }[] = [];
  const chrono = [...finished].reverse();
  const best = new Map<string, number>();
  for (const w of chrono) {
    for (const e of w.entries) {
      const ex = exerciseById(e.exerciseId);
      if (!ex || ex.timed) continue;
      const top = e.sets.filter(setDone).reduce(
        (m, s) => {
          const v = e1rm(s.weight ?? 0, s.reps ?? 0);
          return v > m.v ? { v, s } : m;
        },
        { v: 0, s: null as null | (typeof e.sets)[number] },
      );
      const prev = best.get(e.exerciseId);
      if (prev != null && top.v > prev && top.s) {
        prs.push({
          name: ex.name,
          exerciseId: ex.id,
          value: `${fmtNum(top.s.weight ?? 0)} kg × ${top.s.reps}`,
          date: w.startedAt,
        });
      }
      if (prev == null || top.v > prev) best.set(e.exerciseId, top.v);
    }
  }
  const recentPrs = prs.reverse().slice(0, 4);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{new Intl.DateTimeFormat('da-DK', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
          <h1 className="display">
            {greeting()}, {profile.name.split(' ')[0]}
          </h1>
          {profile.goal && <p className="muted goal">Mål: {profile.goal}</p>}
        </div>
      </header>

      <div className="hero-grid">
        {active ? (
          <a className="card card-accent hero-card" href={href('/traening/aktiv')}>
            <p className="eyebrow">Træning i gang</p>
            <h2>{active.name}</h2>
            <p className="muted">{active.entries.length} øvelser</p>
            <span className="btn btn-primary">Fortsæt træningen</span>
          </a>
        ) : next && activeProgram ? (
          <div className="card hero-card">
            <p className="eyebrow">Næste træning · {activeProgram.name}</p>
            <h2>{next.name}</h2>
            <div className="hero-figs">
              {next.exercises.slice(0, 5).map((pe) => {
                const ex = exerciseById(pe.exerciseId);
                return (
                  ex && (
                    <div key={pe.id} className="hero-fig" title={ex.name}>
                      <ExerciseFigure illustration={ex.illustration} />
                      <span>{ex.name}</span>
                      <small className="muted">
                        {pe.sets} × {pe.reps}
                      </small>
                    </div>
                  )
                );
              })}
            </div>
            <button className="btn btn-primary" onClick={() => start(activeProgram, next)}>
              <Icon name="play" size={16} /> Start {next.name}
            </button>
          </div>
        ) : (
          <div className="card hero-card">
            <p className="eyebrow">Kom i gang</p>
            <h2>Planlæg din træning</h2>
            <p className="muted">
              Opret et program med de øvelser, du vil lave – eller start en fri træning og log undervejs.
            </p>
            <div className="btn-row">
              <a className="btn btn-primary" href={href('/programmer')}>
                Opret program
              </a>
              <button className="btn" onClick={() => start()}>
                Fri træning
              </button>
            </div>
          </div>
        )}

        <div className="card week-card">
          <div className="week-head">
            <div>
              <p className="eyebrow">Denne uge</p>
              <p className="big-number">
                {thisWeek.length}
                <span className="muted"> / {perWeek}</span>
              </p>
              <p className="muted small">træninger</p>
            </div>
            <div className="streak">
              <Icon name="flame" size={18} />
              <span>
                <strong>{weekStreak(workouts)}</strong> {weekStreak(workouts) === 1 ? 'uge' : 'uger'} i træk
              </span>
            </div>
          </div>
          <div className="week-bars" role="img" aria-label={`Træninger per uge de sidste ${WEEKS} uger`}>
            {weeks.map((w, i) => (
              <div
                key={w.start}
                className={`week-bar ${i === WEEKS - 1 ? 'is-current' : ''}`}
                title={`Uge fra ${new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short' }).format(new Date(w.start))}: ${w.count} træninger, ${fmtKg(w.volume)}`}
              >
                <span style={{ height: `${Math.max(4, (w.count / maxCount) * 100)}%` }} className={w.count ? '' : 'is-zero'} />
              </div>
            ))}
          </div>
          <p className="muted small">Sidste {WEEKS} uger</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">Træninger i alt</span>
          <span className="stat-value">{finished.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Volumen denne uge</span>
          <span className="stat-value">{fmtKg(thisWeek.reduce((a, w) => a + workoutVolume(w), 0))}</span>
        </div>
        <a className="stat stat-link" href={href('/fremskridt')}>
          <span className="stat-label">Kropsvægt</span>
          <span className="stat-value">{lastWeight ? `${fmtNum(lastWeight.weight!)} kg` : '–'}</span>
          {weightDelta != null && (
            <span className="stat-sub">
              {weightDelta > 0 ? '+' : ''}
              {fmtNum(weightDelta)} kg siden {fmtRelative(baseWeight!.date).toLowerCase()}
            </span>
          )}
        </a>
        <div className="stat">
          <span className="stat-label">Seneste træning</span>
          <span className="stat-value">{finished[0] ? fmtRelative(finished[0].startedAt) : '–'}</span>
        </div>
      </div>

      <div className="two-col">
        <section>
          <div className="section-head">
            <h2 className="section-title">Seneste træninger</h2>
            <a className="link" href={href('/traening')}>
              Se alle
            </a>
          </div>
          {finished.length ? (
            <div className="workout-list">
              {finished.slice(0, 4).map((w) => (
                <WorkoutRow key={w.id} w={w} />
              ))}
            </div>
          ) : (
            <p className="muted empty-inline">Dine træninger vises her, når du har logget den første.</p>
          )}
        </section>
        <section>
          <div className="section-head">
            <h2 className="section-title">Nye rekorder</h2>
          </div>
          {recentPrs.length ? (
            <ul className="pr-list">
              {recentPrs.map((p, i) => (
                <li key={i}>
                  <a href={href(`/oevelser/${p.exerciseId}`)}>
                    <Icon name="trophy" size={18} />
                    <span className="grow">
                      <strong>{p.name}</strong>
                      <small className="muted">{fmtRelative(p.date)}</small>
                    </span>
                    <span>{p.value}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted empty-inline">Når du slår dine egne rekorder, dukker de op her.</p>
          )}
        </section>
      </div>
    </div>
  );
}
