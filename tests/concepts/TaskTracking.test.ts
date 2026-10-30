
import { describe, expect, test } from "bun:test";
import {
  TaskTrackingConcept,
  TaskNotFound,
  InvalidReminder,
} from "../../src/concepts/TaskTracking.js";

describe("TaskTracking", () => {
  test("create adds a new incomplete task without a reminder", () => {
    const concept = new TaskTrackingConcept(() => "task-001");

    const result = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    expect(result).toEqual({ task: "task-001" });

    expect(concept._get({ task: "task-001" })).toEqual([
      {
        owner: "studentA",
        source: "inference-001",
        description: "Attend career fair",
        completed: false,
        reminderAt: null,
        reminderDateOnly: false,
      },
    ]);
  });

  test("edit updates the task description", () => {
    const concept = new TaskTrackingConcept(() => "task-001");

    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    concept.edit({
      owner: "studentA",
      task,
      description: "Prepare for and attend career fair",
    });

    expect(concept._get({ task })[0]?.description).toBe(
      "Prepare for and attend career fair",
    );
  });

  test("setReminder assigns a reminder to a task", () => {
    const concept = new TaskTrackingConcept(() => "task-001");

    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    const reminderAt = "2026-10-21T22:00:00.000Z";

    concept.setReminder({ owner: "studentA", task, reminderAt, reminderDateOnly: false });

    expect(concept._get({ task })[0]?.reminderAt).toBe(reminderAt);
  });

  test("setReminder updates an existing reminder", () => {
    const concept = new TaskTrackingConcept(() => "task-001");

    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    concept.setReminder({
      owner: "studentA",
      task,
      reminderAt: "2026-10-21T22:00:00.000Z",
    reminderDateOnly: false,
    });

    concept.setReminder({
      owner: "studentA",
      task,
      reminderAt: "2026-10-22T18:00:00.000Z",
    reminderDateOnly: false,
    });

    expect(concept._get({ task })[0]?.reminderAt).toBe(
      "2026-10-22T18:00:00.000Z",
    );
  });

  test("setReminder removes a reminder when given null", () => {
    const concept = new TaskTrackingConcept(() => "task-001");

    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    concept.setReminder({
      owner: "studentA",
      task,
      reminderAt: "2026-10-21T22:00:00.000Z",
    reminderDateOnly: false,
    });

    concept.setReminder({ owner: "studentA", task, reminderAt: null, reminderDateOnly: false });

    expect(concept._get({ task })[0]?.reminderAt).toBeNull();
  });

  test("setReminder rejects invalid timestamps", () => {
    const concept = new TaskTrackingConcept(() => "task-001");

    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    expect(() =>
      concept.setReminder({
      owner: "studentA",
        task,
        reminderAt: "not-a-date",
        reminderDateOnly: false,
      }),
    ).toThrow(InvalidReminder);

    expect(() =>
      concept.setReminder({
      owner: "studentA",
        task,
        reminderAt: "2026-02-30T22:00:00.000Z",
        reminderDateOnly: false,
      }),
    ).toThrow(InvalidReminder);

    expect(concept._get({ task })[0]?.reminderAt).toBeNull();
  });

  test("setReminder rejects nonexistent tasks", () => {
    const concept = new TaskTrackingConcept();

    expect(() =>
      concept.setReminder({
      owner: "studentA",
        task: "missing-task",
        reminderAt: "2026-10-21T22:00:00.000Z",
        reminderDateOnly: false,
      }),
    ).toThrow(TaskNotFound);
  });

  test("complete marks a task as completed", () => {
    const concept = new TaskTrackingConcept(() => "task-001");

    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    concept.complete({ owner: "studentA", task });

    expect(concept._get({ task })[0]?.completed).toBe(true);
  });

  test("reopen marks a completed task as incomplete", () => {
    const concept = new TaskTrackingConcept(() => "task-001");

    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    concept.complete({ owner: "studentA", task });
    expect(concept._get({ task })[0]?.completed).toBe(true);

    concept.reopen({ owner: "studentA", task });
    expect(concept._get({ task })[0]?.completed).toBe(false);

    concept.complete({ owner: "studentA", task });
    expect(concept._get({ task })[0]?.completed).toBe(true);
  });

  test("remove deletes an existing task", () => {
    const concept = new TaskTrackingConcept(() => "task-001");

    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    concept.remove({ owner: "studentA", task });

    expect(concept._get({ task })).toEqual([]);
  });

  test("operations on nonexistent tasks throw TaskNotFound", () => {
    const concept = new TaskTrackingConcept();

    expect(() =>
      concept.edit({
      owner: "studentA",
        task: "missing-task",
        description: "Updated description",
      }),
    ).toThrow(TaskNotFound);

    expect(() =>
      concept.complete({ owner: "studentA", task: "missing-task" }),
    ).toThrow(TaskNotFound);

    expect(() =>
      concept.reopen({ owner: "studentA", task: "missing-task" }),
    ).toThrow(TaskNotFound);

    expect(() =>
      concept.remove({ owner: "studentA", task: "missing-task" }),
    ).toThrow(TaskNotFound);
  });

  test("_listByOwner returns only the specified user's tasks", () => {
    let nextID = 0;
    const concept = new TaskTrackingConcept(
      () => `task-${++nextID}`,
    );

    concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    concept.create({
      owner: "studentB",
      source: "inference-002",
      description: "Study for exam",
    });

    concept.create({
      owner: "studentA",
      source: "inference-003",
      description: "Submit internship application",
    });

    expect(concept._listByOwner({ owner: "studentA" })).toEqual([
      {
        task: "task-1",
        source: "inference-001",
        description: "Attend career fair",
        completed: false,
        reminderAt: null,
        reminderDateOnly: false,
      },
      {
        task: "task-3",
        source: "inference-003",
        description: "Submit internship application",
        completed: false,
        reminderAt: null,
        reminderDateOnly: false,
      },
    ]);

    expect(concept._listByOwner({ owner: "studentC" })).toEqual([]);
  });
  test("setReminder stores a date-only reminder and clears both fields", () => {
    const concept = new TaskTrackingConcept(() => "task-001");
    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Submit assignment",
    });
    const reminderAt = "2026-11-01T13:00:00.000Z";

    concept.setReminder({ owner: "studentA", task, reminderAt, reminderDateOnly: true });
    expect(concept._get({ task })[0]).toMatchObject({
      reminderAt,
      reminderDateOnly: true,
    });

    concept.setReminder({ owner: "studentA", task, reminderAt: null, reminderDateOnly: false });
    expect(concept._get({ task })[0]).toMatchObject({
      reminderAt: null,
      reminderDateOnly: false,
    });
  });

  test("setReminder rejects date-only without a timestamp and preserves state", () => {
    const concept = new TaskTrackingConcept(() => "task-001");
    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Submit assignment",
    });

    expect(() =>
      concept.setReminder({ owner: "studentA", task, reminderAt: null, reminderDateOnly: true }),
    ).toThrow(InvalidReminder);
    expect(concept._get({ task })[0]).toMatchObject({
      reminderAt: null,
      reminderDateOnly: false,
    });
  });

  test("editing and completing a task preserve its reminder type", () => {
    const concept = new TaskTrackingConcept(() => "task-001");
    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Submit assignment",
    });
    const reminderAt = "2026-11-01T13:00:00.000Z";
    concept.setReminder({ owner: "studentA", task, reminderAt, reminderDateOnly: true });
    concept.edit({ owner: "studentA", task, description: "Submit final assignment" });
    concept.complete({ owner: "studentA", task });
    concept.reopen({ owner: "studentA", task });

    expect(concept._get({ task })[0]).toMatchObject({
      description: "Submit final assignment",
      completed: false,
      reminderAt,
      reminderDateOnly: true,
    });
  });


  test("mutations reject a different owner without changing task state", () => {
    const concept = new TaskTrackingConcept(() => "task-001");
    const { task } = concept.create({ owner: "studentA", source: "inference-001", description: "Original" });
    const before = concept._get({ task });
    expect(() => concept.edit({ task, owner: "studentB", description: "Changed" })).toThrow(TaskNotFound);
    expect(() => concept.complete({ task, owner: "studentB" })).toThrow(TaskNotFound);
    expect(() => concept.reopen({ task, owner: "studentB" })).toThrow(TaskNotFound);
    expect(() => concept.setReminder({ task, owner: "studentB", reminderAt: null, reminderDateOnly: false })).toThrow(TaskNotFound);
    expect(() => concept.remove({ task, owner: "studentB" })).toThrow(TaskNotFound);
    expect(concept._get({ task })).toEqual(before);
  });
});
