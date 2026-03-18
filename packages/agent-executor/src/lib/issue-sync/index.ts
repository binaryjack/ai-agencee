
export { IssueSync } from './issue-sync.js';
export type {
    CreatedIssue,
    IIssueSync,
    IssueSyncOptions,
    IssueSyncProvider,
    JiraOptions,
    LinearOptions
} from './issue-sync.js';

// Must import AFTER constructor export to avoid CJS circular-dep crash.
import './prototype/index.js'
