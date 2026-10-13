
import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import {
  ScreenshotStoringConcept,
  ScreenshotNotFound,
} from "./ScreenshotStoring.js";

import spec from "@design/concepts/ScreenshotStoring.md" with { type: "text" };

export const screenshotStoring = registerConcept({
  class: ScreenshotStoringConcept,
  spec,
  refusals: {
    SCREENSHOT_NOT_FOUND: ScreenshotNotFound,
  },
});
