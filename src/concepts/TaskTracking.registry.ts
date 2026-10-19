
import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import {
  TaskTrackingConcept,
  TaskNotFound,
  InvalidReminder,
} from "./TaskTracking.js";
import spec from "@design/concepts/TaskTracking.md" with { type: "text" };

export const taskTracking = registerConcept({
  class: TaskTrackingConcept,
  spec,
  refusals: {
    TASK_NOT_FOUND: TaskNotFound,
    INVALID_REMINDER: InvalidReminder,
  },
});
