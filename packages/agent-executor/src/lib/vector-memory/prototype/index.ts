import { VectorMemory } from '../vector-memory.js';
import { clear } from './clear.js';
import { deleteEntry } from './deleteEntry.js';
import { deserialise } from './deserialise.js';
import { get } from './get.js';
import { namespaces } from './namespaces.js';
import { search } from './search.js';
import { serialise } from './serialise.js';
import { size } from './size.js';
import { store } from './store.js';

Object.assign((VectorMemory as Function).prototype, {
  store, delete: deleteEntry, clear, search, get,
  size, namespaces, serialise, deserialise,
});
