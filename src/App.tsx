import { Avatar } from './components/Avatar';
import { Icon } from './components/Icon';
import { href, useRoute } from './router';
import { useStore } from './store';
import { Dashboard } from './views/Dashboard';
import { Library } from './views/Library';
import { ProfilePicker } from './views/ProfilePicker';
import { ProgramEditor, Programs } from './views/Programs';
import { Progress } from './views/Progress';
import { Settings } from './views/Settings';
import { ActiveWorkout, WorkoutDetail, Workouts } from './views/Workouts';

const NAV = [
  { path: '/', key: '', label: 'Oversigt', icon: 'home' },
  { path: '/traening', key: 'traening', label: 'Træning', icon: 'dumbbell' },
  { path: '/programmer', key: 'programmer', label: 'Programmer', icon: 'list' },
  { path: '/oevelser', key: 'oevelser', label: 'Øvelser', icon: 'grid' },
  { path: '/fremskridt', key: 'fremskridt', label: 'Fremskridt', icon: 'chart' },
];

export default function App() {
  const { profile, data } = useStore();
  const route = useRoute();

  if (!profile || route[0] === 'profiler') return <ProfilePicker />;

  const section = route[0] ?? '';
  const active = data.workouts.find((w) => w.profileId === profile.id && !w.finishedAt);

  let view: React.ReactNode;
  switch (section) {
    case 'traening':
      view =
        route[1] === 'aktiv' ? <ActiveWorkout /> : route[1] ? <WorkoutDetail id={route[1]} /> : <Workouts />;
      break;
    case 'programmer':
      view = route[1] ? <ProgramEditor id={route[1]} /> : <Programs />;
      break;
    case 'oevelser':
      view = <Library openId={route[1]} />;
      break;
    case 'fremskridt':
      view = <Progress />;
      break;
    case 'profil':
      view = <Settings />;
      break;
    default:
      view = <Dashboard />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href={href('/')}>
          <span className="brand-mark" aria-hidden="true">
            <Icon name="dumbbell" size={18} />
          </span>
          Fitnessmakker
        </a>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.key} href={href(n.path)} className={`nav-item ${section === n.key ? 'is-active' : ''}`}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
        {active && section !== 'traening' && (
          <a className="active-pill" href={href('/traening/aktiv')}>
            <span className="pulse" /> Træning i gang
          </a>
        )}
        <a className={`profile-chip ${section === 'profil' ? 'is-active' : ''}`} href={href('/profil')}>
          <Avatar profile={profile} size={34} />
          <span>
            <strong>{profile.name}</strong>
            <small>Profil & data</small>
          </span>
        </a>
      </aside>

      <header className="topbar">
        <a className="brand" href={href('/')}>
          <span className="brand-mark" aria-hidden="true">
            <Icon name="dumbbell" size={16} />
          </span>
          Fitnessmakker
        </a>
        <a href={href('/profil')} aria-label="Profil og data">
          <Avatar profile={profile} size={32} />
        </a>
      </header>

      <main className="main">{view}</main>

      <nav className="tabbar">
        {NAV.map((n) => (
          <a key={n.key} href={href(n.path)} className={`tab ${section === n.key ? 'is-active' : ''}`}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>
      {active && section !== 'traening' && (
        <a className="active-fab" href={href('/traening/aktiv')}>
          <span className="pulse" /> Træning i gang
        </a>
      )}
    </div>
  );
}
