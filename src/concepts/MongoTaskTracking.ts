
import type { Collection, Db } from "mongodb";
import {
  TaskNotFound,
  InvalidReminder,
} from "./TaskTracking.js";

type Task = {
  task: string;
  owner: string;
  source: string;
  description: string;
  completed: boolean;
  reminderAt?: string | null;
};

function validateReminder(reminderAt: string | null): void {
  if (reminderAt === null) {
    return;
  }

  if (
    typeof reminderAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(reminderAt) ||
    !Number.isFinite(Date.parse(reminderAt)) ||
    new Date(reminderAt).toISOString() !== reminderAt
  ) {
    throw new InvalidReminder(
      "Reminder must be a valid UTC ISO timestamp or null.",
    );
  }
}

export class MongoTaskTrackingConcept {
  private readonly tasks: Collection<Task>;

  constructor(
    database: Db,
    private readonly freshID: () => string = () => crypto.randomUUID(),
  ) {
    this.tasks = database.collection<Task>("tasks");
  }

  async create({
    owner,
    source,
    description,
  }: {
    owner: string;
    source: string;
    description: string;
  }) {
    const task = this.freshID();

    await this.tasks.insertOne({
      task,
      owner,
      source,
      description,
      completed: false,
      reminderAt: null,
    });

    return { task };
  }

  async edit({
    task,
    description,
  }: {
    task: string;
    description: string;
  }) {
    const result = await this.tasks.updateOne(
      { task },
      { $set: { description } },
    );

    if (result.matchedCount === 0) {
      throw new TaskNotFound("The task does not exist.");
    }

    return {};
  }

  async setReminder({
    task,
    reminderAt,
  }: {
    task: string;
    reminderAt: string | null;
  }) {
    validateReminder(reminderAt);

    const result = await this.tasks.updateOne(
      { task },
      { $set: { reminderAt } },
    );

    if (result.matchedCount === 0) {
      throw new TaskNotFound("The task does not exist.");
    }

    return {};
  }

  async complete({ task }: { task: string }) {
    const result = await this.tasks.updateOne(
      { task },
      { $set: { completed: true } },
    );

    if (result.matchedCount === 0) {
      throw new TaskNotFound("The task does not exist.");
    }

    return {};
  }

  async reopen({ task }: { task: string }) {
    const result = await this.tasks.updateOne(
      { task },
      { $set: { completed: false } },
    );

    if (result.matchedCount === 0) {
      throw new TaskNotFound("The task does not exist.");
    }

    return {};
  }

  async remove({ task }: { task: string }) {
    const result = await this.tasks.deleteOne({ task });

    if (result.deletedCount === 0) {
      throw new TaskNotFound("The task does not exist.");
    }

    return {};
  }

  async _get({
    task,
  }: {
    task: string;
  }): Promise<Array<{
    owner: string;
    source: string;
    description: string;
    completed: boolean;
    reminderAt: string | null;
  }>> {
    const found = await this.tasks.findOne({ task });

    if (found === null) {
      return [];
    }

    return [{
      owner: found.owner,
      source: found.source,
      description: found.description,
      completed: found.completed,
      reminderAt: found.reminderAt ?? null,
    }];
  }

  async _listByOwner({
    owner,
  }: {
    owner: string;
  }): Promise<Array<{
    task: string;
    source: string;
    description: string;
    completed: boolean;
    reminderAt: string | null;
  }>> {
    const found = await this.tasks
      .find({ owner })
      .project({
        _id: 0,
        task: 1,
        source: 1,
        description: 1,
        completed: 1,
        reminderAt: 1,
      })
      .toArray();

    return found.map((task) => ({
      task: task.task,
      source: task.source,
      description: task.description,
      completed: task.completed,
      reminderAt: task.reminderAt ?? null,
    }));
  }
}
