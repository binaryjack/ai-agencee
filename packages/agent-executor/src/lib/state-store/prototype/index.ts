import { StateStore } from '../state-store.js';
import { clear } from './clear.js';
import { clearSync } from './clearSync.js';
import { exists } from './exists.js';
import { existsSync } from './existsSync.js';
import { load } from './load.js';
import { loadSync } from './loadSync.js';
import { save } from './save.js';
import { saveSync } from './saveSync.js';

Object.assign((StateStore as Function).prototype, {
  save,
  load,
  exists,
  clear,
  saveSync,
  loadSync,
  existsSync,
  clearSync,
});
