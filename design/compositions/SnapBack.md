# SnapBack

SnapBack connects saved screenshots, user-reviewed intentions, and actionable tasks. The independent concepts are ScreenshotStoring (saved screenshot metadata), IntentionInferring (inference descriptions and confirmation), TaskTracking (tasks, completion, and reminders), and UserAuthentication (accounts and sessions).

## Confirmation workflow

Users upload a screenshot, request an AI suggestion, and review or correct the proposed description. Screenshot upload, AI invocation, and inference creation/correction currently enter through HTTP routes in `main.ts`; these are not yet all authored composition endpoints. The AI suggestion is optional, and users may enter their intention manually.

An authenticated user can [confirm an inference](reaction:SnapBack.Inferences.ConfirmInference) only while the inference and its original screenshot still exist. The endpoint checks the inference, screenshot existence, and screenshot owner before invoking `IntentionInferring.confirm`. Missing or non-owned screenshots yield an error instead of a confirmation. This guarded read is not yet a statically total endpoint path, so the SyncEngine fallback advisory remains until a separately verified total workflow is implemented.

```endpoints
SnapBack.Inferences.ConfirmInference at /inferences/confirm
```

When an inference is confirmed, the [task-creation synchronization](reaction:TaskCreation.ConfirmedInferenceCreatesTask) uses the screenshot owner and confirmed description to create a task in TaskTracking. This reaction is authored in `TaskCreation.ts` and documented in `TaskCreation.md`.

## Task management

Task changes are coordinated by the TaskManagement composition. Its endpoints forward the authenticated owner to TaskTracking actions, which enforce ownership atomically. See `TaskManagement.md` for editing, completion, reopening, reminders, and removal.

The HTTP server is responsible for sessions, request validation, rate limiting, image streaming, and HTTP responses. Task-list screenshot enrichment is currently performed in `main.ts` and is a planned move to a composition view; this document does not claim that the view has already been implemented.

## Security boundary

The HTTP server derives the user ID from the authenticated session rather than trusting a user ID supplied by the browser. TaskTracking mutation actions enforce task ownership. The existing inference-confirmation endpoint verifies record existence; its screenshot-ownership check is also enforced by the composition using the authenticated owner supplied by the HTTP boundary.
