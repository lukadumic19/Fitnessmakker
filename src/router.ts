import { useEffect, useState } from 'react';

const parse = () =>
  decodeURIComponent(window.location.hash.replace(/^#\/?/, ''))
    .split('/')
    .filter(Boolean);

export function useRoute() {
  const [parts, setParts] = useState<string[]>(parse);
  useEffect(() => {
    const on = () => {
      setParts(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parts;
}

export const navigate = (path: string) => {
  window.location.hash = path.startsWith('/') ? path : `/${path}`;
};

export const href = (path: string) => `#${path.startsWith('/') ? path : `/${path}`}`;
