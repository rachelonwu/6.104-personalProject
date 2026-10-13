
import type { Collection, Db } from "mongodb";
import { TaskNotFound } from "./TaskTracking.js";

type Task = {
  task: string;
  owner: string;
  source: string;
  description: string;
  completed: boolean;
};

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
  }>> {
    return this.tasks
      .find({ owner })
      .project({
        _id: 0,
        task: 1,
        source: 1,
        description: 1,
        completed: 1,
      })
      .toArray() as Promise<Array<{
        task: string;
        source: string;
        description: string;
        completed: boolean;
      }>>;
  }
}
