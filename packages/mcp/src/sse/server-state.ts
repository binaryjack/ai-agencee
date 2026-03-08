import * as http from 'http'

export let _serverInstance: http.Server | null = null;

export function setServerInstance(server: http.Server | null): void {
  _serverInstance = server;
}
