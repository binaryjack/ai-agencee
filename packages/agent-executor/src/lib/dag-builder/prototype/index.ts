import { DagBuilder, LaneBuilder } from '../dag-builder.js';
import { dagBarrier }         from './dagBarrier.js';
import { dagBudget }          from './dagBudget.js';
import { dagBuild }           from './dagBuild.js';
import { dagDescription }     from './dagDescription.js';
import { dagLane }            from './dagLane.js';
import { dagModelRouter }     from './dagModelRouter.js';
import { dagToJSON }          from './dagToJSON.js';
import { laneAgentFile }      from './laneAgentFile.js';
import { laneBarrier }        from './laneBarrier.js';
import { laneBuild }          from './laneBuild.js';
import { laneBuildDag }       from './laneBuildDag.js';
import { laneCapability }     from './laneCapability.js';
import { laneCheck }          from './laneCheck.js';
import { laneDependsOn }      from './laneDependsOn.js';
import { laneLane }           from './laneLane.js';
import { laneProvider }       from './laneProvider.js';
import { laneSupervisorFile } from './laneSupervisorFile.js';

Object.assign((LaneBuilder as Function).prototype, {
  check:          laneCheck,
  capability:     laneCapability,
  agentFile:      laneAgentFile,
  supervisorFile: laneSupervisorFile,
  provider:       laneProvider,
  dependsOn:      laneDependsOn,
  _build:         laneBuild,
  lane:           laneLane,
  barrier:        laneBarrier,
  build:          laneBuildDag,
});

Object.assign((DagBuilder as Function).prototype, {
  description:  dagDescription,
  budget:       dagBudget,
  modelRouter:  dagModelRouter,
  lane:         dagLane,
  barrier:      dagBarrier,
  build:        dagBuild,
  toJSON:       dagToJSON,
});
