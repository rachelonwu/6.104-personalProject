# IntentionInferring

## Purpose

Allow users to identify, correct, and confirm intentions associated with saved screenshots, preventing users from forgetting why they captured information or leaving intended actions unrecognized. IntentionInferring owns inference records that reference screenshots managed by ScreenshotStoring.

## Principle

When a screenshot is analyzed, the system records an inferred intention describing an action the user may want to take. The intention initially awaits review. The user can correct its description and must confirm the final intention before it is used to create a task.

## Types

```types
external Screenshot
  A screenshot stored and managed by ScreenshotStoring, from which an intention is inferred.
```

## State

```state
a set of Inferences with
  a screenshot Screenshot
  a description String
  a status String
```

## Actions

```actions
infer(screenshot: Screenshot, description: String) : returns (inference: Inference)
  where true
  then
    add a new inference with screenshot, description, and status "pending"
    returns inference

correct(inference: Inference, description: String) : returns ()
  where inference is in Inferences and inference's status is not "confirmed"
  then
    update inference's description to description
    update inference's status to "corrected"
    returns
  where inference is not in Inferences
  then
    refuses INFERENCE_NOT_FOUND "The inference does not exist."
  where inference is in Inferences and inference's status is "confirmed"
  then
    refuses INFERENCE_ALREADY_CONFIRMED "The inference has already been confirmed."

confirm(inference: Inference) : returns (screenshot: Screenshot, description: String)
  where inference is in Inferences and inference's status is not "confirmed"
  then
    bind screenshot to the Inference's screenshot
    bind description to the Inference's description
    update inference's status to "confirmed"
    returns screenshot, description
  where inference is not in Inferences
  then
    refuses INFERENCE_NOT_FOUND "The inference does not exist."
  where inference is in Inferences and inference's status is "confirmed"
  then
    refuses INFERENCE_ALREADY_CONFIRMED "The inference has already been confirmed."
```

## Queries

```queries
_get(inference: Inference) : optional (screenshot: Screenshot, description: String, status: String)
  Returns the inference's stored information when it exists.
  Returns no row when the inference does not exist.
```
