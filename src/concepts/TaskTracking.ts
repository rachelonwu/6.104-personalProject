
export class TaskNotFound extends Error {}

type Task = {
  task: string;
  owner: string;
  source: string;
  description: string;
  completed: boolean;
};

export class TaskTrackingConcept {
  private readonly tasks: Task[] = [];

  constructor(
    private readonly freshID: () => string = () => crypto.randomUUID(),
  ) {}

  create({
    owner,
    source,
    description,
  }: {
    owner: string;
    source: string;
    description: string;
  }) {
    const task = this.freshID();

    this.tasks.push({
      task,
      owner,
      source,
      description,
      completed: false,
    });

    return { task };
  }

  edit({
    task,
    description,
  }: {
    task: string;
    description: string;
  }) {
    const found = this.tasks.find((t) => t.task === task);

    if (found === undefined) {
      throw new TaskNotFound("The task does not exist.");
    }

    found.description = description;
    return {};
  }

  complete({ task }: { task: string }) {
    const found = this.tasks.find((t) => t.task === task);

    if (found === undefined) {
      throw new TaskNotFound("The task does not exist.");
    }

    found.completed = true;
    return {};
  }

  reopen({ task }: { task: string }) {
    const found = this.tasks.find((t) => t.task === task);

    if (found === undefined) {
      throw new TaskNotFound("The task does not exist.");
    }

    found.completed = false;
    return {};
  }

  remove({ task }: { task: string }) {
    const index = this.tasks.findIndex((t) => t.task === task);

    if (index === -1) {
      throw new TaskNotFound("The task does not exist.");
    }

    this.tasks.splice(index, 1);
    return {};
  }

  _get({ task }: { task: string }): Array<{
    owner: string;
    source: string;
    description: string;
    completed: boolean;
  }> {
    const found = this.tasks.find((t) => t.task === task);

    if (found === undefined) {
      return [];
    }

    return [{
      owner: found.owner,
      source: found.source,
      description: found.description,
      completed: found.completed,
    }];
  }

  _listByOwner({ owner }: { owner: string }): Array<{
    task: string;
    source: string;
    description: string;
    completed: boolean;
  }> {
    return this.tasks
      .filter((t) => t.owner === owner)
      .map((t) => ({
        task: t.task,
        source: t.source,
        description: t.description,
        completed: t.completed,
      }));
  }
}
