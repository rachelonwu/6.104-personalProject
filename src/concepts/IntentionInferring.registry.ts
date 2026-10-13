
import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import {
  IntentionInferringConcept,
  InferenceNotFound,
  InferenceAlreadyConfirmed,
} from "./IntentionInferring.js";
import spec from "@design/concepts/IntentionInferring.md" with { type: "text" };

export const intentionInferring = registerConcept({
  class: IntentionInferringConcept,
  spec,
  refusals: {
    INFERENCE_NOT_FOUND: InferenceNotFound,
    INFERENCE_ALREADY_CONFIRMED: InferenceAlreadyConfirmed,
  },
});
