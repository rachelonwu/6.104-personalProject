# TaskManagement

TaskManagement coordinates task mutations without moving task state out of the independent TaskTracking concept. The HTTP boundary authenticates the request and supplies the authenticated user as `owner`; the client does not choose this value.

A user can [edit a task](reaction:TaskManagement.Tasks.EditTask) only when `TaskTracking._get` identifies that user as its owner. The endpoint then invokes `TaskTracking.edit`.

A user can [complete a task](reaction:TaskManagement.Tasks.CompleteTask) or [reopen a task](reaction:TaskManagement.Tasks.ReopenTask) under the same ownership condition. Completion state is owned by TaskTracking.

A user can [set or clear a reminder](reaction:TaskManagement.Tasks.SetTaskReminder) only for a task they own. Both `reminderAt` and `reminderDateOnly` are passed together to `TaskTracking.setReminder`, which enforces the valid-reminder invariant.

A user can [remove a task](reaction:TaskManagement.Tasks.RemoveTask) only if the task belongs to them. The endpoint invokes `TaskTracking.remove`.

```endpoints
TaskManagement.Tasks.EditTask at /tasks/edit
TaskManagement.Tasks.CompleteTask at /tasks/complete
TaskManagement.Tasks.ReopenTask at /tasks/reopen
TaskManagement.Tasks.SetTaskReminder at /tasks/reminder
TaskManagement.Tasks.RemoveTask at /tasks/remove
```

The public HTTP interface remains `PATCH /api/tasks/:id` and `DELETE /api/tasks/:id`. `main.ts` handles cookies, request parsing, and HTTP responses, then invokes these composition endpoints. The composition checks ownership independently of the HTTP route.

This phase does not yet move task listing and screenshot enrichment to a composition view. A PATCH with multiple fields still invokes multiple endpoints sequentially; those updates are not transactional. Those are follow-up architectural improvements, not capabilities claimed here.
