import { SamsungDriver } from './samsung.js';
import { LgDriver } from './lg.js';
import { SonyDriver } from './sony.js';
import { RokuDriver } from './roku.js';
import { DemoDriver } from './demo.js';

export const DRIVERS = {
  samsung: { label: 'Samsung (Tizen, 2016+)', Driver: SamsungDriver },
  lg: { label: 'LG (webOS)', Driver: LgDriver },
  sony: { label: 'Sony Bravia', Driver: SonyDriver },
  roku: { label: 'Roku / Roku TV', Driver: RokuDriver },
  demo: { label: 'Demo-TV (til at prøve app\'en)', Driver: DemoDriver },
};

export function createDriver(tv, save) {
  const d = DRIVERS[tv.type];
  if (!d) throw new Error(`Ukendt TV-type: ${tv.type}`);
  return new d.Driver(tv, save);
}
