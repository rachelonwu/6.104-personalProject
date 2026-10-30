# TaskManagement

TaskManagement coordinates task mutations without moving task state out of the independent TaskTracking concept. The HTTP boundary authenticates the request and supplies the authenticated user as `owner`; the client does not choose this value.

A user can [edit a task](reaction:TaskManagement.Tasks.EditTask) by invoking `TaskTracking.edit` with the authenticated owner. The concept action checks ownership before updating state.

A user can [complete a task](reaction:TaskManagement.Tasks.CompleteTask) or [reopen a task](reaction:TaskManagement.Tasks.ReopenTask) through owner-checked TaskTracking actions. Completion state is owned by TaskTracking.

A user can [set or clear a reminder](reaction:TaskManagement.Tasks.SetTaskReminder) through the owner-checked concept action. Both `reminderAt` and `reminderDateOnly` are passed together to `TaskTracking.setReminder`, which enforces the valid-reminder invariant.

A user can [remove a task](reaction:TaskManagement.Tasks.RemoveTask) through the owner-checked concept action. The endpoint invokes `TaskTracking.remove`.

```endpoints
TaskManagement.Tasks.EditTask at /tasks/edit
TaskManagement.Tasks.CompleteTask at /tasks/complete
TaskManagement.Tasks.ReopenTask at /tasks/reopen
TaskManagement.Tasks.SetTaskReminder at /tasks/reminder
TaskManagement.Tasks.RemoveTask at /tasks/remove
```

The public HTTP interface remains `PATCH /api/tasks/:id` and `DELETE /api/tasks/:id`. `main.ts` handles cookies, request parsing, and HTTP responses, then invokes these composition endpoints. The composition passes the authenticated owner to TaskTracking, which enforces ownership independently of the HTTP route. Missing or unowned tasks are refused with the same `TASK_NOT_FOUND` code. In the MongoDB implementation, authorization and mutation use one atomic filter.

This phase does not yet move task listing and screenshot enrichment to a composition view. A PATCH with multiple fields still invokes multiple endpoints sequentially; those updates are not transactional. Those are follow-up architectural improvements, not capabilities claimed here.
