
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.js";

import {
  confirmInferenceInput,
  confirmInferenceOutput,
} from "./validators.js";

const { ScreenshotStoring, IntentionInferring } = concepts;

/**
 * Confirm an inference only if its original screenshot still exists.
 *
 * Task creation is handled separately by the synchronization in
 * TaskCreation.ts.
 */
const ConfirmInference = endpoint(
  "/inferences/confirm",
  ({ inference, screenshot, owner }) =>
    receive({ inference, owner }).then(
      where(
        IntentionInferring._get({ inference }).is({ screenshot }),
        ScreenshotStoring._get({ screenshot }).is({ owner }),
      )
        .then(IntentionInferring.confirm({ inference }))
        .then(respond({ confirmed: inference }))
        .named("source-exists"),

      where(
        IntentionInferring._get({ inference }).is({ screenshot }),
        no(ScreenshotStoring._get({ screenshot }).is({ owner })),
      )
        .then(respond({ error: "SCREENSHOT_NOT_FOUND" }))
        .named("screenshot-missing"),

      where(no(IntentionInferring._get({ inference })))
        .then(respond({ error: "INFERENCE_NOT_FOUND" }))
        .named("inference-missing"),
    ),
  {
    input: { required: ["inference", "owner"] },
    validators: {
      input: confirmInferenceInput,
      output: confirmInferenceOutput,
    },
  },
);

export const composition = {
  Inferences: { ConfirmInference },
};
