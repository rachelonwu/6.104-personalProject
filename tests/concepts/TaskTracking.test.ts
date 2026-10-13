
import { describe, expect, test } from "bun:test";
import {
  TaskTrackingConcept,
  TaskNotFound,
} from "../../src/concepts/TaskTracking.js";

describe("TaskTracking", () => {
  test("create adds a new incomplete task", () => {
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
      task,
      description: "Prepare for and attend career fair",
    });

    expect(concept._get({ task })[0]?.description).toBe(
      "Prepare for and attend career fair",
    );
  });

  test("complete marks a task as completed", () => {
    const concept = new TaskTrackingConcept(() => "task-001");

    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    concept.complete({ task });

    expect(concept._get({ task })[0]?.completed).toBe(true);
  });

  test("remove deletes an existing task", () => {
    const concept = new TaskTrackingConcept(() => "task-001");

    const { task } = concept.create({
      owner: "studentA",
      source: "inference-001",
      description: "Attend career fair",
    });

    concept.remove({ task });

    expect(concept._get({ task })).toEqual([]);
  });

  test("operations on nonexistent tasks throw TaskNotFound", () => {
    const concept = new TaskTrackingConcept();

    expect(() =>
      concept.edit({
        task: "missing-task",
        description: "Updated description",
      }),
    ).toThrow(TaskNotFound);

    expect(() =>
      concept.complete({ task: "missing-task" }),
    ).toThrow(TaskNotFound);

    expect(() =>
      concept.remove({ task: "missing-task" }),
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
      },
      {
        task: "task-3",
        source: "inference-003",
        description: "Submit internship application",
        completed: false,
      },
    ]);

    expect(concept._listByOwner({ owner: "studentC" })).toEqual([]);
  });
});
