import { _serverInstance, setServerInstance } from './server-state.js'

export function stopSseServer(): void {
  if (_serverInstance) {
    _serverInstance.close();
    setServerInstance(null);
  }
}
