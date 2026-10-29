
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

// Task-management endpoint validators: validation at the composition boundary
// protects callers other than the current HTTP server as well.
function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

function validReminderTimestamp(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export const taskOwnerInput: EndpointValidator = (value) => {
  if (!isRecord(value) || !hasExactKeys(value, ["owner", "task"]) ||
      !isId(value.owner) || !isId(value.task)) {
    return { ok: false, detail: "owner and task must be nonempty identifiers" };
  }
  return { ok: true };
};

export const taskEditInput: EndpointValidator = (value) => {
  if (!isRecord(value) || !hasExactKeys(value, ["owner", "task", "description"]) ||
      !isId(value.owner) || !isId(value.task) ||
      typeof value.description !== "string" ||
      value.description.trim().length === 0) {
    return { ok: false, detail: "owner, task, and nonempty description are required" };
  }
  return { ok: true };
};

export const taskReminderInput: EndpointValidator = (value) => {
  if (!isRecord(value) ||
      !hasExactKeys(value, ["owner", "task", "reminderAt", "reminderDateOnly"]) ||
      !isId(value.owner) || !isId(value.task) ||
      !validReminderTimestamp(value.reminderAt) ||
      typeof value.reminderDateOnly !== "boolean" ||
      (value.reminderAt === null && value.reminderDateOnly)) {
    return { ok: false, detail: "invalid reminder timestamp or reminder type" };
  }
  return { ok: true };
};

export const taskUpdatedOutput: EndpointValidator = (value) => {
  if (!isRecord(value) || !hasExactKeys(value, ["updated"]) || !isId(value.updated)) {
    return { ok: false, detail: "response must contain an updated task identifier" };
  }
  return { ok: true };
};

export const taskRemovedOutput: EndpointValidator = (value) => {
  if (!isRecord(value) || !hasExactKeys(value, ["removed"]) || !isId(value.removed)) {
    return { ok: false, detail: "response must contain a removed task identifier" };
  }
  return { ok: true };
};
