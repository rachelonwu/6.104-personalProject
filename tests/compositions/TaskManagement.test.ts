import { describe, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";

import { assembleApplication } from "../../src/assembly.js";
import { TaskTrackingConcept } from "../../src/concepts/TaskTracking.js";

function setup() {
  const tasks = new TaskTrackingConcept();
  const application = assembleApplication({ TaskTracking: tasks });
  const gateway = createGateway({ application });
  const { task } = tasks.create({
    owner: "studentA",
    source: "inference-1",
    description: "Apply for the internship",
  });
  return { tasks, gateway, task };
}

describe("TaskManagement composition", () => {
  test("the owner can edit, complete, and reopen a task", async () => {
    const { tasks, gateway, task } = setup();

    expect(await gateway.invoke("/tasks/edit", {
      owner: "studentA", task, description: "Submit internship application",
    })).toEqual({ ok: true, value: { updated: task } });

    expect(await gateway.invoke("/tasks/complete", {
      owner: "studentA", task,
    })).toEqual({ ok: true, value: { updated: task } });

    expect(tasks._get({ task })[0]).toMatchObject({
      owner: "studentA",
      description: "Submit internship application",
      completed: true,
    });

    expect(await gateway.invoke("/tasks/reopen", {
      owner: "studentA", task,
    })).toEqual({ ok: true, value: { updated: task } });
    expect(tasks._get({ task })[0].completed).toBe(false);
  });

  test("the owner can set and clear a date-only reminder", async () => {
    const { tasks, gateway, task } = setup();
    const reminderAt = "2026-11-01T12:00:00.000Z";

    expect(await gateway.invoke("/tasks/reminder", {
      owner: "studentA", task, reminderAt, reminderDateOnly: true,
    })).toEqual({ ok: true, value: { updated: task } });
    expect(tasks._get({ task })[0]).toMatchObject({
      reminderAt, reminderDateOnly: true,
    });

    expect(await gateway.invoke("/tasks/reminder", {
      owner: "studentA", task, reminderAt: null, reminderDateOnly: false,
    })).toEqual({ ok: true, value: { updated: task } });
    expect(tasks._get({ task })[0]).toMatchObject({
      reminderAt: null, reminderDateOnly: false,
    });
  });

  test("the owner can remove a task", async () => {
    const { tasks, gateway, task } = setup();
    expect(await gateway.invoke("/tasks/remove", {
      owner: "studentA", task,
    })).toEqual({ ok: true, value: { removed: task } });
    expect(tasks._get({ task })).toEqual([]);
  });

  test("a different owner cannot modify another user's task", async () => {
    const { tasks, gateway, task } = setup();
    const before = tasks._get({ task });

    const result = await gateway.invoke("/tasks/complete", {
      owner: "studentB", task,
    }, { timeoutMs: 1000 });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).toContain("TASK_NOT_FOUND");
    expect(tasks._get({ task })).toEqual(before);
  });
});
