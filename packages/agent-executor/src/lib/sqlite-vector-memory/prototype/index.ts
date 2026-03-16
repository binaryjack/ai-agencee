import { SqliteVectorMemory } from '../sqlite-vector-memory.js';
import { _open }             from './_open.js';
import { clear }             from './clear.js';
import { close }             from './close.js';
import { deleteEntry }       from './deleteEntry.js';
import { instanceCosineSim } from './instanceCosineSim.js';
import { instanceToFloat32 } from './instanceToFloat32.js';
import { search }            from './search.js';
import { size }              from './size.js';
import { store }             from './store.js';

Object.assign((SqliteVectorMemory as Function).prototype, {
  _open:      _open,
  store:      store,
  search:     search,
  delete:     deleteEntry,
  clear:      clear,
  size:       size,
  close:      close,
  _toFloat32: instanceToFloat32,
  _cosineSim: instanceCosineSim,
});
