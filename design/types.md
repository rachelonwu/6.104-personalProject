
# SnapBack Application Types

SnapBack stores screenshots uploaded by users, records intentions inferred from those screenshots, and creates tasks that users can manage. For the P2 prototype, user identities are supplied by the application without a login system.

```types
concrete User
  A user of SnapBack.

concrete Boolean
  A completion state represented by true or false.
```

```instances
instantiate ScreenshotStoring with
  User is User

instantiate IntentionInferring with
  Screenshot is ScreenshotStoring.Screenshot

instantiate TaskTracking with
  User is User
  Source is IntentionInferring.Inference
  Boolean is Boolean
```
