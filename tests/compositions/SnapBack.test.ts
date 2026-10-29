
import { describe, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";

import { assembleApplication } from "../../src/assembly.js";
import { ScreenshotStoringConcept } from "../../src/concepts/ScreenshotStoring.js";
import { IntentionInferringConcept } from "../../src/concepts/IntentionInferring.js";
import { TaskTrackingConcept } from "../../src/concepts/TaskTracking.js";

function setup() {
  const screenshots = new ScreenshotStoringConcept();
  const intentions = new IntentionInferringConcept();
  const tasks = new TaskTrackingConcept();

  const application = assembleApplication({
    ScreenshotStoring: screenshots,
    IntentionInferring: intentions,
    TaskTracking: tasks,
  });

  const gateway = createGateway({ application });

  return { screenshots, intentions, tasks, gateway };
}

describe("SnapBack composition", () => {
  test("confirming a corrected inference creates a task", async () => {
    const { screenshots, intentions, tasks, gateway } = setup();

    const { screenshot } = screenshots.upload({
      owner: "studentA",
      imageRef: "career-fair.png",
      uploadedAt: "2026-10-13T12:00:00Z",
    });

    const { inference } = intentions.infer({
      screenshot,
      description: "Look into the career fair",
    });

    expect(tasks._listByOwner({ owner: "studentA" })).toEqual([]);

    intentions.correct({
      inference,
      description: "Register for the career fair by Friday",
    });

    expect(tasks._listByOwner({ owner: "studentA" })).toEqual([]);

    const result = await gateway.invoke("/inferences/confirm", {
      inference,
    });

    expect(result).toEqual({
      ok: true,
      value: { confirmed: inference },
    });

    await gateway.whenIdle();

    const createdTasks = tasks._listByOwner({ owner: "studentA" });

    expect(createdTasks).toHaveLength(1);
    expect(createdTasks[0]).toEqual({
      task: expect.any(String),
      source: inference,
      description: "Register for the career fair by Friday",
      completed: false,
      reminderAt: null,
      reminderDateOnly: false,
    });

    expect(intentions._get({ inference })).toEqual([
      {
        screenshot,
        description: "Register for the career fair by Friday",
        status: "confirmed",
      },
    ]);
  });

  test("confirming an uncorrected inference creates a task", async () => {
    const { screenshots, intentions, tasks, gateway } = setup();

    const { screenshot } = screenshots.upload({
      owner: "studentA",
      imageRef: "conference.png",
      uploadedAt: "2026-10-13T12:00:00Z",
    });

    const { inference } = intentions.infer({
      screenshot,
      description: "Sign up for the conference",
    });

    const result = await gateway.invoke("/inferences/confirm", {
      inference,
    });

    expect(result).toEqual({
      ok: true,
      value: { confirmed: inference },
    });

    await gateway.whenIdle();

    expect(tasks._listByOwner({ owner: "studentA" })).toEqual([
      {
        task: expect.any(String),
        source: inference,
        description: "Sign up for the conference",
        completed: false,
        reminderAt: null,
        reminderDateOnly: false,
      },
    ]);
  });

  test("a missing screenshot prevents confirmation and task creation", async () => {
    const { screenshots, intentions, tasks, gateway } = setup();

    const { screenshot } = screenshots.upload({
      owner: "studentA",
      imageRef: "event.png",
      uploadedAt: "2026-10-13T12:00:00Z",
    });

    const { inference } = intentions.infer({
      screenshot,
      description: "Attend the event",
    });

    screenshots.remove({ screenshot });

    const result = await gateway.invoke("/inferences/confirm", {
      inference,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "domain",
        value: "SCREENSHOT_NOT_FOUND",
      },
    });

    await gateway.whenIdle();

    expect(tasks._listByOwner({ owner: "studentA" })).toEqual([]);

    expect(intentions._get({ inference })).toEqual([
      {
        screenshot,
        description: "Attend the event",
        status: "pending",
      },
    ]);
  });

  test("confirming an inference twice does not create duplicate tasks", async () => {
    const { screenshots, intentions, tasks, gateway } = setup();

    const { screenshot } = screenshots.upload({
      owner: "studentA",
      imageRef: "deadline.png",
      uploadedAt: "2026-10-13T12:00:00Z",
    });

    const { inference } = intentions.infer({
      screenshot,
      description: "Submit the application",
    });

    const firstResult = await gateway.invoke("/inferences/confirm", {
      inference,
    });

    expect(firstResult).toEqual({
      ok: true,
      value: { confirmed: inference },
    });

    await gateway.whenIdle();

    const firstTasks = tasks._listByOwner({ owner: "studentA" });
    expect(firstTasks).toHaveLength(1);

    const secondResult = await gateway.invoke(
      "/inferences/confirm",
      { inference },
      { timeoutMs: 1000 },
    );

    await gateway.whenIdle();

    const finalTasks = tasks._listByOwner({ owner: "studentA" });

    expect(finalTasks).toEqual(firstTasks);
    expect(finalTasks).toHaveLength(1);

    expect(secondResult).not.toEqual({
      ok: true,
      value: { confirmed: inference },
    });
  });
});
