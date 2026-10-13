
import { describe, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";

import { assemblePersistentApplication } from "../../src/persistentApplication.js";
import { closeDatabase } from "../../src/database.js";

describe("SnapBack MongoDB persistence", () => {
  test("confirming an inference creates a task that survives reassembly", async () => {
    const {
      application,
      screenshots,
      intentions,
      tasks,
    } = await assemblePersistentApplication();

    const gateway = createGateway({ application });

    const owner = `test-user-${crypto.randomUUID()}`;

    const { screenshot } = await screenshots.upload({
      owner,
      imageRef: "persistent-test.png",
      uploadedAt: new Date().toISOString(),
    });

    const { inference } = await intentions.infer({
      screenshot,
      description: "Look into the event",
    });

    await intentions.correct({
      inference,
      description: "Register for the event by Friday",
    });

    expect(await tasks._listByOwner({ owner })).toEqual([]);

    const result = await gateway.invoke("/inferences/confirm", {
      inference,
    });

    expect(result).toEqual({
      ok: true,
      value: { confirmed: inference },
    });

    await gateway.whenIdle();

    const createdTasks = await tasks._listByOwner({ owner });

    expect(createdTasks).toHaveLength(1);
    expect(createdTasks[0]).toMatchObject({
      source: inference,
      description: "Register for the event by Friday",
      completed: false,
    });

    const restarted = await assemblePersistentApplication();

    const persistedTasks = await restarted.tasks._listByOwner({ owner });

    expect(persistedTasks).toEqual(createdTasks);
  });
});
