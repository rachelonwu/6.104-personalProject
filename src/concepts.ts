
import { conceptSet } from "@mit-sdg/sync-engine/assembly";
import { screenshotStoring } from "./concepts/ScreenshotStoring.registry.js";
import { intentionInferring } from "./concepts/IntentionInferring.registry.js";
import { taskTracking } from "./concepts/TaskTracking.registry.js";

export const applicationConceptSet = conceptSet({
  ScreenshotStoring: screenshotStoring,
  IntentionInferring: intentionInferring,
  TaskTracking: taskTracking,
});

export const { concepts } = applicationConceptSet;
