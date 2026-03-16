import { PythonMcpBridge, PythonMcpProvider } from '../python-mcp-bridge.js';
import { _handleLine } from './_handleLine.js';
import { _rejectAll } from './_rejectAll.js';
import { _rpc } from './_rpc.js';
import { _sendNotification } from './_sendNotification.js';
import { _write } from './_write.js';
import { asLLMProvider } from './asLLMProvider.js';
import { callTool } from './callTool.js';
import { complete } from './complete.js';
import { isAvailable } from './isAvailable.js';
import { listTools } from './listTools.js';
import { start } from './start.js';
import { stop } from './stop.js';

Object.assign((PythonMcpBridge as Function).prototype, {
  start,
  stop,
  listTools,
  callTool,
  asLLMProvider,
  _rpc,
  _sendNotification,
  _write,
  _handleLine,
  _rejectAll,
});

Object.assign((PythonMcpProvider as Function).prototype, {
  isAvailable,
  complete,
});
