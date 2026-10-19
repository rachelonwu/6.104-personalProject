
# SnapBack Application Types

SnapBack stores screenshots uploaded by users, records intentions inferred from those screenshots, and creates tasks that users can manage. Users create accounts and authenticate through UserAuthentication, which owns user identities and sessions.

```types
concrete Boolean
  A completion state represented by true or false.

concrete ReminderTime
  An optional reminder timestamp represented as a UTC ISO 8601 string or null.
```

```instances
instantiate UserAuthentication

instantiate ScreenshotStoring with
  User is UserAuthentication.User

instantiate IntentionInferring with
  Screenshot is ScreenshotStoring.Screenshot

instantiate TaskTracking with
  User is UserAuthentication.User
  Source is IntentionInferring.Inference
  Boolean is Boolean
  ReminderTime is ReminderTime
```
