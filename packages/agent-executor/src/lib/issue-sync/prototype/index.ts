import { IssueSync } from '../issue-sync.js';
import { _body } from './_body.js';
import { _createJiraIssue } from './_createJiraIssue.js';
import { _createLinearIssue } from './_createLinearIssue.js';
import { _extraJiraFields } from './_extraJiraFields.js';
import { _title } from './_title.js';
import { attach } from './attach.js';
import { createIssueForRun } from './createIssueForRun.js';
import { detach } from './detach.js';

Object.assign((IssueSync as Function).prototype, {
  attach,
  detach,
  createIssueForRun,
  _createJiraIssue,
  _createLinearIssue,
  _title,
  _body,
  _extraJiraFields,
});
