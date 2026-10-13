
import { assemble, type ImplementationOverrides } from "@mit-sdg/sync-engine/assembly";
import { applicationConceptSet } from "./concepts.js";
import { composition as snapBackComposition } from "./compositions/SnapBack.js";
import { composition as taskCreationComposition } from "./compositions/TaskCreation.js";

export type SnapBackOverrides = ImplementationOverrides<typeof applicationConceptSet>;

export function assembleApplication(instances: SnapBackOverrides = {}) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      ...applicationConceptSet.implementations(),
      ...instances,
    },
    composition: {
      SnapBack: snapBackComposition,
      TaskCreation: taskCreationComposition,
    },
  });
}
