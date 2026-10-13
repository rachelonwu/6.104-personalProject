
import { reaction, when } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.js";

const { ScreenshotStoring, IntentionInferring, TaskTracking } = concepts;

/**
 * Automatically create a task whenever an inference is confirmed.
 *
 * The confirmed description comes directly from the confirm action's
 * result. The screenshot lookup supplies the task owner.
 */
const ConfirmedInferenceCreatesTask = reaction(
  ({ inference, screenshot, description, owner }) =>
    when(
      IntentionInferring.confirm({ inference }).responds({
        screenshot,
        description,
      }),
    )
      .where(
        ScreenshotStoring._get({ screenshot }).is({ owner }),
      )
      .then(
        TaskTracking.create({
          owner,
          source: inference,
          description,
        }),
      ),
);

export const composition = {
  ConfirmedInferenceCreatesTask,
};
