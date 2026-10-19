
export class TaskNotFound extends Error {}

export class InvalidReminder extends Error {}

type Task = {
  task: string;
  owner: string;
  source: string;
  description: string;
  completed: boolean;
  reminderAt: string | null;
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
      reminderAt: null,
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

  setReminder({
    task,
    reminderAt,
  }: {
    task: string;
    reminderAt: string | null;
  }) {
    const found = this.tasks.find((t) => t.task === task);

    if (found === undefined) {
      throw new TaskNotFound("The task does not exist.");
    }

    validateReminder(reminderAt);
    found.reminderAt = reminderAt;

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
    reminderAt: string | null;
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
      reminderAt: found.reminderAt,
    }];
  }

  _listByOwner({ owner }: { owner: string }): Array<{
    task: string;
    source: string;
    description: string;
    completed: boolean;
    reminderAt: string | null;
  }> {
    return this.tasks
      .filter((t) => t.owner === owner)
      .map((t) => ({
        task: t.task,
        source: t.source,
        description: t.description,
        completed: t.completed,
        reminderAt: t.reminderAt,
      }));
  }
}
