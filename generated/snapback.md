<!-- Generated from the SnapBack assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# SnapBack — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### IntentionInferring

Defined in [IntentionInferring](../design/concepts/IntentionInferring.md), line 1.

#### Actions

- `infer(screenshot: Screenshot, description: String) : returns (inference: Inference)`
- `correct(inference: Inference, description: String) : returns ()`
  - Refuses `INFERENCE_NOT_FOUND`: The inference does not exist.
  - Refuses `INFERENCE_ALREADY_CONFIRMED`: The inference has already been confirmed.
- `confirm(inference: Inference) : returns (screenshot: Screenshot, description: String)`
  - Refuses `INFERENCE_NOT_FOUND`: The inference does not exist.
  - Refuses `INFERENCE_ALREADY_CONFIRMED`: The inference has already been confirmed.

#### Queries

- `_get(inference: Inference) : optional (screenshot: Screenshot, description: String, status: String)`

#### Instances

- `IntentionInferring` — instance of `IntentionInferring` — [SnapBack Application Types](../design/types.md), line 20.
  - `Screenshot` is `ScreenshotStoring.Screenshot` — [SnapBack Application Types](../design/types.md), line 21.

### ScreenshotStoring

Defined in [ScreenshotStoring](../design/concepts/ScreenshotStoring.md), line 1.

#### Actions

- `upload(owner: User, imageRef: String, uploadedAt: String) : returns (screenshot: Screenshot)`
- `remove(screenshot: Screenshot, owner: User) : returns ()`
  - Refuses `SCREENSHOT_NOT_FOUND`: The screenshot does not exist.

#### Queries

- `_get(screenshot: Screenshot) : optional (owner: User, imageRef: String, uploadedAt: String)`

#### Instances

- `ScreenshotStoring` — instance of `ScreenshotStoring` — [SnapBack Application Types](../design/types.md), line 17.
  - `User` is `UserAuthentication.User` — [SnapBack Application Types](../design/types.md), line 18.

### TaskTracking

Defined in [TaskTracking](../design/concepts/TaskTracking.md), line 2.

#### Actions

- `create(owner: User, source: Source, description: String) : returns (task: Task)`
- `edit(task: Task, owner: User, description: String) : returns ()`
  - Refuses `TASK_NOT_FOUND`: The task does not exist.
- `setReminder(task: Task, owner: User, reminderAt: ReminderTime, reminderDateOnly: ReminderDateOnly) : returns ()`
  - Refuses `TASK_NOT_FOUND`: The task does not exist.
  - Refuses `INVALID_REMINDER`: Reminder must have a valid timestamp and reminder type.
- `complete(task: Task, owner: User) : returns ()`
  - Refuses `TASK_NOT_FOUND`: The task does not exist.
- `reopen(task: Task, owner: User) : returns ()`
  - Refuses `TASK_NOT_FOUND`: The task does not exist.
- `remove(task: Task, owner: User) : returns ()`
  - Refuses `TASK_NOT_FOUND`: The task does not exist.

#### Queries

- `_get(task: Task) : optional (owner: User, source: Source, description: String, completed: Boolean, reminderAt: ReminderTime, reminderDateOnly: ReminderDateOnly)`
- `_listByOwner(owner: User) : many (task: Task, source: Source, description: String, completed: Boolean, reminderAt: ReminderTime, reminderDateOnly: ReminderDateOnly)`

#### Instances

- `TaskTracking` — instance of `TaskTracking` — [SnapBack Application Types](../design/types.md), line 23.
  - `Boolean` is `Boolean` — [SnapBack Application Types](../design/types.md), line 26.
  - `ReminderDateOnly` is `Boolean` — [SnapBack Application Types](../design/types.md), line 28.
  - `ReminderTime` is `ReminderTime` — [SnapBack Application Types](../design/types.md), line 27.
  - `Source` is `IntentionInferring.Inference` — [SnapBack Application Types](../design/types.md), line 25.
  - `User` is `UserAuthentication.User` — [SnapBack Application Types](../design/types.md), line 24.

### UserAuthentication

Defined in [UserAuthentication](../design/concepts/UserAuthentication.md), line 1.

#### Actions

- `register(email: String, passwordHash: String) : returns (user: User)`
  - Refuses `EMAIL_ALREADY_REGISTERED`: An account with this email already exists.
- `login(user: User, tokenHash: String, expiresAt: String) : returns (session: Session)`
  - Refuses `USER_NOT_FOUND`: The user does not exist.
- `logout(session: Session) : returns ()`
  - Refuses `SESSION_NOT_FOUND`: The session does not exist.

#### Queries

- `_getUser(user: User) : optional (email: String, passwordHash: String)`
- `_getByEmail(email: String) : optional (user: User, passwordHash: String)`
- `_getSessionByTokenHash(tokenHash: String) : optional (session: Session, user: User, expiresAt: String)`

#### Instances

- `UserAuthentication` — instance of `UserAuthentication` — [SnapBack Application Types](../design/types.md), line 15.

## Application types

Concrete types:

- `Boolean` — [SnapBack Application Types](../design/types.md), line 7.
- `ReminderTime` — [SnapBack Application Types](../design/types.md), line 10.

## Reactions

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### SnapBack.Inferences.ConfirmInference:inference-missing

Authored path: `SnapBack.Inferences.ConfirmInference`.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 9.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 12.

```reaction
when RequestBoundary.request (inference, owner, path: "/inferences/confirm", requestId)
where
  no IntentionInferring._get (inference)
then
  RequestBoundary.respond (error: "INFERENCE_NOT_FOUND", requestId)
```

### SnapBack.Inferences.ConfirmInference:screenshot-missing

Authored path: `SnapBack.Inferences.ConfirmInference`.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 9.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 12.

```reaction
when RequestBoundary.request (inference, owner, path: "/inferences/confirm", requestId)
where
  IntentionInferring._get (inference) has (screenshot)
  no ScreenshotStoring._get (screenshot) has (owner)
then
  RequestBoundary.respond (error: "SCREENSHOT_NOT_FOUND", requestId)
```

### SnapBack.Inferences.ConfirmInference:source-exists

Authored path: `SnapBack.Inferences.ConfirmInference`.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 9.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 12.

```reaction
when RequestBoundary.request (inference, owner, path: "/inferences/confirm", requestId)
where
  IntentionInferring._get (inference) has (screenshot)
  ScreenshotStoring._get (screenshot) has (owner)
then
  IntentionInferring.confirm (inference)
```

### SnapBack.Inferences.ConfirmInference:source-exists#2

Authored path: `SnapBack.Inferences.ConfirmInference`.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 9.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 12.

```reaction
when IntentionInferring.confirm (inference), asked by SnapBack.Inferences.ConfirmInference:source-exists
where
  earlier, RequestBoundary.request (inference, owner, path: "/inferences/confirm", requestId)
then
  RequestBoundary.respond (confirmed: inference, requestId)
```

### TaskCreation.ConfirmedInferenceCreatesTask

Authored path: `TaskCreation.ConfirmedInferenceCreatesTask`.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 15.
- Covered by [TaskCreation](../design/compositions/TaskCreation.md), line 5.

```reaction
when IntentionInferring.confirm (inference, description, screenshot)
where
  ScreenshotStoring._get (screenshot) has (owner)
then
  TaskTracking.create (description, owner, source: inference)
```

### TaskManagement.Tasks.CompleteTask

Authored path: `TaskManagement.Tasks.CompleteTask`.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 7.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 15.

```reaction
when RequestBoundary.request (owner, path: "/tasks/complete", requestId, task)
then
  TaskTracking.complete (owner, task)
```

### TaskManagement.Tasks.CompleteTask#2

Authored path: `TaskManagement.Tasks.CompleteTask`.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 7.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 15.

```reaction
when TaskTracking.complete (owner, task), asked by TaskManagement.Tasks.CompleteTask
where
  earlier, RequestBoundary.request (owner, path: "/tasks/complete", requestId, task)
then
  RequestBoundary.respond (requestId, updated: task)
```

### TaskManagement.Tasks.EditTask

Authored path: `TaskManagement.Tasks.EditTask`.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 5.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 14.

```reaction
when RequestBoundary.request (description, owner, path: "/tasks/edit", requestId, task)
then
  TaskTracking.edit (description, owner, task)
```

### TaskManagement.Tasks.EditTask#2

Authored path: `TaskManagement.Tasks.EditTask`.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 5.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 14.

```reaction
when TaskTracking.edit (description, owner, task), asked by TaskManagement.Tasks.EditTask
where
  earlier, RequestBoundary.request (description, owner, path: "/tasks/edit", requestId, task)
then
  RequestBoundary.respond (requestId, updated: task)
```

### TaskManagement.Tasks.RemoveTask

Authored path: `TaskManagement.Tasks.RemoveTask`.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 11.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 18.

```reaction
when RequestBoundary.request (owner, path: "/tasks/remove", requestId, task)
then
  TaskTracking.remove (owner, task)
```

### TaskManagement.Tasks.RemoveTask#2

Authored path: `TaskManagement.Tasks.RemoveTask`.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 11.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 18.

```reaction
when TaskTracking.remove (owner, task), asked by TaskManagement.Tasks.RemoveTask
where
  earlier, RequestBoundary.request (owner, path: "/tasks/remove", requestId, task)
then
  RequestBoundary.respond (removed: task, requestId)
```

### TaskManagement.Tasks.ReopenTask

Authored path: `TaskManagement.Tasks.ReopenTask`.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 7.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 16.

```reaction
when RequestBoundary.request (owner, path: "/tasks/reopen", requestId, task)
then
  TaskTracking.reopen (owner, task)
```

### TaskManagement.Tasks.ReopenTask#2

Authored path: `TaskManagement.Tasks.ReopenTask`.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 7.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 16.

```reaction
when TaskTracking.reopen (owner, task), asked by TaskManagement.Tasks.ReopenTask
where
  earlier, RequestBoundary.request (owner, path: "/tasks/reopen", requestId, task)
then
  RequestBoundary.respond (requestId, updated: task)
```

### TaskManagement.Tasks.SetTaskReminder

Authored path: `TaskManagement.Tasks.SetTaskReminder`.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 9.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 17.

```reaction
when RequestBoundary.request (owner, path: "/tasks/reminder", reminderAt, reminderDateOnly, requestId, task)
then
  TaskTracking.setReminder (owner, reminderAt, reminderDateOnly, task)
```

### TaskManagement.Tasks.SetTaskReminder#2

Authored path: `TaskManagement.Tasks.SetTaskReminder`.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 9.
- Covered by [TaskManagement](../design/compositions/TaskManagement.md), line 17.

```reaction
when TaskTracking.setReminder (owner, reminderAt, reminderDateOnly, task), asked by TaskManagement.Tasks.SetTaskReminder
where
  earlier, RequestBoundary.request (owner, path: "/tasks/reminder", reminderAt, reminderDateOnly, requestId, task)
then
  RequestBoundary.respond (requestId, updated: task)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/inferences/confirm` — requires `inference`, `owner`
- `/tasks/complete` — requires `owner`, `task`
- `/tasks/edit` — requires `owner`, `task`, `description`
- `/tasks/reminder` — requires `owner`, `task`, `reminderAt`, `reminderDateOnly`
- `/tasks/remove` — requires `owner`, `task`
- `/tasks/reopen` — requires `owner`, `task`
