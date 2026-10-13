
import type { EndpointValidator } from "@mit-sdg/sync-engine/boundary";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const confirmInferenceInput: EndpointValidator = (value) => {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    typeof value.inference !== "string" ||
    value.inference.length === 0 ||
    value.inference.length > 128
  ) {
    return {
      ok: false,
      detail: "inference must be a nonempty string of at most 128 characters",
    };
  }

  return { ok: true };
};

export const confirmInferenceOutput: EndpointValidator = (value) => {
  if (!isRecord(value) || Object.keys(value).length !== 1) {
    return {
      ok: false,
      detail: "response must contain a confirmation or error code",
    };
  }

  if (
    typeof value.confirmed === "string" &&
    value.confirmed.length > 0
  ) {
    return { ok: true };
  }

  if (
    value.error === "SCREENSHOT_NOT_FOUND" ||
    value.error === "INFERENCE_NOT_FOUND"
  ) {
    return { ok: true };
  }

  return {
    ok: false,
    detail: "response must contain a confirmation or recognized error code",
  };
};
