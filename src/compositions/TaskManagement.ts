import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.js";
import {
  taskOwnerInput,
  taskEditInput,
  taskReminderInput,
  taskUpdatedOutput,
  taskRemovedOutput,
} from "./validators.js";

const { TaskTracking } = concepts;

// The owner is derived from the authenticated session by the HTTP boundary.
// TaskTracking actions enforce ownership atomically; endpoints forward the authenticated owner.
const EditTask = endpoint(
  "/tasks/edit",
  ({ owner, task, description }) =>
    receive({ owner, task, description })
      .then(TaskTracking.edit({ task, owner, description }))
      .then(respond({ updated: task })),
  {
    input: { required: ["owner", "task", "description"] },
    validators: { input: taskEditInput, output: taskUpdatedOutput },
  },
);

const CompleteTask = endpoint(
  "/tasks/complete",
  ({ owner, task }) =>
    receive({ owner, task })
      .then(TaskTracking.complete({ task, owner }))
      .then(respond({ updated: task })),
  {
    input: { required: ["owner", "task"] },
    validators: { input: taskOwnerInput, output: taskUpdatedOutput },
  },
);

const ReopenTask = endpoint(
  "/tasks/reopen",
  ({ owner, task }) =>
    receive({ owner, task })
      .then(TaskTracking.reopen({ task, owner }))
      .then(respond({ updated: task })),
  {
    input: { required: ["owner", "task"] },
    validators: { input: taskOwnerInput, output: taskUpdatedOutput },
  },
);

const SetTaskReminder = endpoint(
  "/tasks/reminder",
  ({ owner, task, reminderAt, reminderDateOnly }) =>
    receive({ owner, task, reminderAt, reminderDateOnly })
      .then(TaskTracking.setReminder({ task, owner, reminderAt, reminderDateOnly }))
      .then(respond({ updated: task })),
  {
    input: { required: ["owner", "task", "reminderAt", "reminderDateOnly"] },
    validators: { input: taskReminderInput, output: taskUpdatedOutput },
  },
);

const RemoveTask = endpoint(
  "/tasks/remove",
  ({ owner, task }) =>
    receive({ owner, task })
      .then(TaskTracking.remove({ task, owner }))
      .then(respond({ removed: task })),
  {
    input: { required: ["owner", "task"] },
    validators: { input: taskOwnerInput, output: taskRemovedOutput },
  },
);

export const composition = {
  Tasks: { EditTask, CompleteTask, ReopenTask, SetTaskReminder, RemoveTask },
};
