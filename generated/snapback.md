<!-- Generated from the SnapBack assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# SnapBack — assembled read-back

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
- `confirm(inference: Inference) : returns (screenshot: Screenshot, description: String)`
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
- `reopen(task: Task) : returns ()`
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

### SnapBack.Inferences.ConfirmInference:inference-missing

Authored path: `SnapBack.Inferences.ConfirmInference`.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 8.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 15.

```reaction
when RequestBoundary.request (inference, path: "/inferences/confirm", requestId)
where
  no IntentionInferring._get (inference)
then
  RequestBoundary.respond (error: "INFERENCE_NOT_FOUND", requestId)
```

### SnapBack.Inferences.ConfirmInference:screenshot-missing

Authored path: `SnapBack.Inferences.ConfirmInference`.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 8.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 15.

```reaction
when RequestBoundary.request (inference, path: "/inferences/confirm", requestId)
where
  IntentionInferring._get (inference) has (screenshot)
  no ScreenshotStoring._get (screenshot)
then
  RequestBoundary.respond (error: "SCREENSHOT_NOT_FOUND", requestId)
```

### SnapBack.Inferences.ConfirmInference:source-exists

Authored path: `SnapBack.Inferences.ConfirmInference`.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 8.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 15.

```reaction
when RequestBoundary.request (inference, path: "/inferences/confirm", requestId)
where
  IntentionInferring._get (inference) has (screenshot)
  ScreenshotStoring._get (screenshot)
then
  IntentionInferring.confirm (inference)
```

### SnapBack.Inferences.ConfirmInference:source-exists#2

Authored path: `SnapBack.Inferences.ConfirmInference`.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 8.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 15.

```reaction
when IntentionInferring.confirm (inference), asked by SnapBack.Inferences.ConfirmInference:source-exists
where
  earlier, RequestBoundary.request (inference, path: "/inferences/confirm", requestId)
then
  RequestBoundary.respond (confirmed: inference, requestId)
```

### TaskCreation.ConfirmedInferenceCreatesTask

Authored path: `TaskCreation.ConfirmedInferenceCreatesTask`.
- Covered by [SnapBack](../design/compositions/SnapBack.md), line 19.

```reaction
when IntentionInferring.confirm (inference, description, screenshot)
where
  ScreenshotStoring._get (screenshot) has (owner)
then
  TaskTracking.create (description, owner, source: inference)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/inferences/confirm` — requires `inference`
