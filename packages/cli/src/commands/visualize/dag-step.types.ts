export interface DagStep {
  id?: string;
  agent?: string;
  lane?: string;
  dependsOn?: string[];
  barrier?: boolean;
  parallel?: boolean;
}
