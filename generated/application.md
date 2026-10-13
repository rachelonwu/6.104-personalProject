<!-- Generated from the Application assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Application — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### IntentionInferring

Defined in [IntentionInferring](../design/concepts/IntentionInferring.md), line 2.

#### Actions

- `infer(screenshot: Screenshot, description: String) : returns (inference: Inference)`
- `correct(inference: Inference, description: String) : returns ()`
  - Refuses `INFERENCE_NOT_FOUND`: The inference does not exist.
  - Refuses `INFERENCE_ALREADY_CONFIRMED`: The inference has already been confirmed.
- `confirm(inference: Inference) : returns ()`
  - Refuses `INFERENCE_NOT_FOUND`: The inference does not exist.
  - Refuses `INFERENCE_ALREADY_CONFIRMED`: The inference has already been confirmed.

#### Queries

- `_get(inference: Inference) : optional (screenshot: Screenshot, description: String, status: String)`

#### Instances

- `IntentionInferring` — instance of `IntentionInferring` — [SnapBack Application Types](../design/types.md), line 18.
  - `Screenshot` is `ScreenshotStoring.Screenshot` — [SnapBack Application Types](../design/types.md), line 19.

### ScreenshotStoring

Defined in [ScreenshotStoring](../design/concepts/ScreenshotStoring.md), line 2.

#### Actions

- `upload(owner: User, imageRef: String, uploadedAt: String) : returns (screenshot: Screenshot)`
- `remove(screenshot: Screenshot) : returns ()`
  - Refuses `SCREENSHOT_NOT_FOUND`: The screenshot does not exist.

#### Queries

- `_get(screenshot: Screenshot) : optional (owner: User, imageRef: String, uploadedAt: String)`

#### Instances

- `ScreenshotStoring` — instance of `ScreenshotStoring` — [SnapBack Application Types](../design/types.md), line 15.
  - `User` is `User` — [SnapBack Application Types](../design/types.md), line 16.

### TaskTracking

Defined in [TaskTracking](../design/concepts/TaskTracking.md), line 2.

#### Actions

- `create(owner: User, source: Source, description: String) : returns (task: Task)`
- `edit(task: Task, description: String) : returns ()`
  - Refuses `TASK_NOT_FOUND`: The task does not exist.
- `complete(task: Task) : returns ()`
  - Refuses `TASK_NOT_FOUND`: The task does not exist.
- `remove(task: Task) : returns ()`
  - Refuses `TASK_NOT_FOUND`: The task does not exist.

#### Queries

- `_get(task: Task) : optional (owner: User, source: Source, description: String, completed: Boolean)`
- `_listByOwner(owner: User) : many (task: Task, source: Source, description: String, completed: Boolean)`

#### Instances

- `TaskTracking` — instance of `TaskTracking` — [SnapBack Application Types](../design/types.md), line 21.
  - `Boolean` is `Boolean` — [SnapBack Application Types](../design/types.md), line 24.
  - `Source` is `IntentionInferring.Inference` — [SnapBack Application Types](../design/types.md), line 23.
  - `User` is `User` — [SnapBack Application Types](../design/types.md), line 22.

## Application types

Concrete types:

- `Boolean` — [SnapBack Application Types](../design/types.md), line 10.
- `User` — [SnapBack Application Types](../design/types.md), line 7.

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

