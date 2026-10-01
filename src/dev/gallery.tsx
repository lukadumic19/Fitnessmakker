/**
 * Development gallery: every exercise with both poses side by side.
 * Open http://localhost:5173/gallery.html (optionally ?id1,id2 to filter,
 * #anim to animate). Not part of the production build.
 */
import { createRoot } from 'react-dom/client';
import { EXERCISES, exerciseMuscles } from '../data/exercises';
import { ExerciseFigure } from '../illustrations/ExerciseFigure';
import '../styles/app.css';
import '../styles/figure.css';

const ids = location.search.slice(1).split(',').filter(Boolean);
const list = ids.length ? EXERCISES.filter((e) => ids.includes(e.id)) : EXERCISES;
const labels = new URLSearchParams(location.hash.slice(1)).has('labels');
const cols = Number(new URLSearchParams(location.hash.slice(1)).get('cols') ?? 4);

createRoot(document.getElementById('root')!).render(
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 8, padding: 8 }}>
    {list.map((e) => (
      <div key={e.id} className="card" style={{ padding: 8 }}>
        <strong style={{ fontSize: 12 }}>
          {e.name} <span className="muted">({e.id})</span>
        </strong>
        <div style={{ display: 'flex', gap: 6, background: 'var(--surface-2)', borderRadius: 8 }}>
          {[0, 1].map((t) => (
            <div key={t} style={{ flex: 1, minWidth: 0 }}>
              <ExerciseFigure illustration={{ ...e.illustration, thumb: t as 0 | 1 }} muscles={exerciseMuscles(e)} labels={labels} />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>,
);
