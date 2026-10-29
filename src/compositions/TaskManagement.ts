import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { where } from "@mit-sdg/sync-engine/language";
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
// Each endpoint independently checks ownership before mutating a task.
const EditTask = endpoint(
  "/tasks/edit",
  ({ owner, task, description }) =>
    receive({ owner, task, description }).then(
      where(TaskTracking._get({ task }).is({ owner }))
        .then(TaskTracking.edit({ task, description }))
        .then(respond({ updated: task }))
        .named("owned-task"),
    ),
  {
    input: { required: ["owner", "task", "description"] },
    validators: { input: taskEditInput, output: taskUpdatedOutput },
  },
);

const CompleteTask = endpoint(
  "/tasks/complete",
  ({ owner, task }) =>
    receive({ owner, task }).then(
      where(TaskTracking._get({ task }).is({ owner }))
        .then(TaskTracking.complete({ task }))
        .then(respond({ updated: task }))
        .named("owned-task"),
    ),
  {
    input: { required: ["owner", "task"] },
    validators: { input: taskOwnerInput, output: taskUpdatedOutput },
  },
);

const ReopenTask = endpoint(
  "/tasks/reopen",
  ({ owner, task }) =>
    receive({ owner, task }).then(
      where(TaskTracking._get({ task }).is({ owner }))
        .then(TaskTracking.reopen({ task }))
        .then(respond({ updated: task }))
        .named("owned-task"),
    ),
  {
    input: { required: ["owner", "task"] },
    validators: { input: taskOwnerInput, output: taskUpdatedOutput },
  },
);

const SetTaskReminder = endpoint(
  "/tasks/reminder",
  ({ owner, task, reminderAt, reminderDateOnly }) =>
    receive({ owner, task, reminderAt, reminderDateOnly }).then(
      where(TaskTracking._get({ task }).is({ owner }))
        .then(TaskTracking.setReminder({ task, reminderAt, reminderDateOnly }))
        .then(respond({ updated: task }))
        .named("owned-task"),
    ),
  {
    input: { required: ["owner", "task", "reminderAt", "reminderDateOnly"] },
    validators: { input: taskReminderInput, output: taskUpdatedOutput },
  },
);

const RemoveTask = endpoint(
  "/tasks/remove",
  ({ owner, task }) =>
    receive({ owner, task }).then(
      where(TaskTracking._get({ task }).is({ owner }))
        .then(TaskTracking.remove({ task }))
        .then(respond({ removed: task }))
        .named("owned-task"),
    ),
  {
    input: { required: ["owner", "task"] },
    validators: { input: taskOwnerInput, output: taskRemovedOutput },
  },
);

export const composition = {
  Tasks: { EditTask, CompleteTask, ReopenTask, SetTaskReminder, RemoveTask },
};
