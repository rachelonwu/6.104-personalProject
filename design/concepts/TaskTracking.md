
# TaskTracking

## Purpose

Allow users to manage tasks created from their saved screenshots.

## Principle

When an intention is identified from a screenshot, the system can create a task associated with that intention. Users can view their tasks, edit their descriptions, and mark tasks as completed or reopen them. Tasks remain available until the user removes them.

## Types

```types
external User
  The person who owns and manages a task.

external Source
  The inference from which a task was created.

external Boolean
  The completion state of a task, represented by true or false.
```

## State

```state
a set of Tasks with
  an owner User
  a source Source
  a description String
  a completed Boolean
```

## Actions

```actions
create(owner: User, source: Source, description: String) : returns (task: Task)
  where true
  then
    add a new task with owner, source, description, and completed false
    returns task

edit(task: Task, description: String) : returns ()
  where task is in Tasks
  then
    update task's description to description
    returns
  where task is not in Tasks
  then
    refuses TASK_NOT_FOUND "The task does not exist."

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
_get(task: Task) : optional (owner: User, source: Source, description: String, completed: Boolean)
  Returns the task's stored information when it exists.
  Returns no row when the task does not exist.

_listByOwner(owner: User) : many (task: Task, source: Source, description: String, completed: Boolean)
  Returns all tasks belonging to the specified owner.
```
