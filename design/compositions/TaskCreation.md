# TaskCreation

TaskCreation connects confirmed screenshot intentions to tasks without coupling IntentionInferring to TaskTracking.

When `IntentionInferring.confirm` responds with an inference, its screenshot, and its confirmed description, the [ConfirmedInferenceCreatesTask synchronization](reaction:TaskCreation.ConfirmedInferenceCreatesTask) looks up the screenshot owner through `ScreenshotStoring._get` and invokes `TaskTracking.create` with that owner, the inference as the source, and the confirmed description.

The task therefore retains a reference to the inference and is associated with the owner of the original screenshot. TaskTracking remains responsible for task state, including completion and reminders; this synchronization only creates the initial task.

This is a reaction to a concept action, not a separate user-facing endpoint. The user-facing confirmation endpoint is documented in SnapBack.md.
