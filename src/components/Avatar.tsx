import type { Profile } from '../types';
import { initials } from '../utils';

export function Avatar({ profile, size = 40 }: { profile: Pick<Profile, 'name' | 'color'>; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ background: profile.color, width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(profile.name)}
    </span>
  );
}
