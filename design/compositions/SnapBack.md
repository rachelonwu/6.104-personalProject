
# SnapBack

SnapBack connects screenshot intention confirmation with task creation.
Users review inferred intentions and can correct their descriptions before
confirming them.

A user can [confirm an inference](reaction:SnapBack.Inferences.ConfirmInference)
only while the inference and its original screenshot still exist.
The application checks both records before performing confirmation.
If the inference or screenshot is missing, the endpoint returns an error
instead of confirming the inference.

```endpoints
SnapBack.Inferences.ConfirmInference at /inferences/confirm
```

When an inference is successfully confirmed, SnapBack
[automatically creates a task](reaction:TaskCreation.ConfirmedInferenceCreatesTask)
using the confirmed description. The task belongs to the original screenshot's
owner and retains a reference to the inference from which it originated.

Users may edit and complete tasks independently after creation.
