
# TaskTracking

## Purpose

Allow users to manage tasks created from saved screenshots, preventing intended actions from remaining buried in saved information or being forgotten before they are completed. TaskTracking owns task records that reference users and inference sources managed by other concepts.

## Principle

When an intention is identified from a screenshot, the system can create a task associated with that intention. Users can view their tasks, edit their descriptions, set or remove reminders, and mark tasks as completed or reopen them. Tasks remain available until the user removes them.

## Types

```types
external User
  The person who owns and manages a task. User accounts are managed by UserAuthentication.

external Source
  A reference to an inference managed by IntentionInferring.

external Boolean
  The completion state of a task, represented by true or false.

external ReminderTime
  An optional reminder timestamp, represented as a UTC ISO 8601 string or null.
```

## State

```state
a set of Tasks with
  an owner User
  a source Source
  a description String
  a completed Boolean
  a reminderAt ReminderTime
```

## Actions

```actions
create(owner: User, source: Source, description: String) : returns (task: Task)
  where true
  then
    add a new task with owner, source, description, completed false, and reminderAt null
    returns task

edit(task: Task, description: String) : returns ()
  where task is in Tasks
  then
    update task's description to description
    returns
  where task is not in Tasks
  then
    refuses TASK_NOT_FOUND "The task does not exist."

setReminder(task: Task, reminderAt: ReminderTime) : returns ()
  where task is in Tasks and reminderAt is a valid UTC ISO 8601 timestamp or null
  then
    update task's reminderAt to reminderAt
    returns
  where task is not in Tasks
  then
    refuses TASK_NOT_FOUND "The task does not exist."
  where reminderAt is not a valid UTC ISO 8601 timestamp or null
  then
    refuses INVALID_REMINDER "Reminder must be a valid UTC ISO timestamp or null."

complete(task: Task) : returns ()
  where task is in Tasks
  then
    update task's completed to true
    returns
  where task is not in Tasks
  then
    refuses TASK_NOT_FOUND "The task does not exist."

reopen(task: Task) : returns ()
  where task is in Tasks
  then
    update task's completed to false
    returns
  where task is not in Tasks
  then
    refuses TASK_NOT_FOUND "The task does not exist."

remove(task: Task) : returns ()
  where task is in Tasks
  then
    remove task from Tasks
    returns
  where task is not in Tasks
  then
    refuses TASK_NOT_FOUND "The task does not exist."
```

## Queries

```queries
_get(task: Task) : optional (owner: User, source: Source, description: String, completed: Boolean, reminderAt: ReminderTime)
  Returns the task's stored information when it exists.
  Returns no row when the task does not exist.

_listByOwner(owner: User) : many (task: Task, source: Source, description: String, completed: Boolean, reminderAt: ReminderTime)
  Returns all tasks belonging to the specified owner.
```
