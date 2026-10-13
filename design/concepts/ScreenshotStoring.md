
# ScreenshotStoring

## Purpose

Allow users to save screenshots so they can access the original information later.

## Principle

After a user uploads a screenshot, the system stores a record containing its image reference, owner, and upload time. The user can retrieve the stored screenshot for reference or remove it when it is no longer needed.

## Types

```types
external User
  The person who uploads and owns a screenshot.
```

## State

```state
a set of Screenshots with
  an owner User
  an imageRef String
  an uploadedAt String
```

## Actions

```actions
upload(owner: User, imageRef: String, uploadedAt: String) : returns (screenshot: Screenshot)
  where true
  then
    add a new screenshot with owner, imageRef, and uploadedAt
    returns screenshot

remove(screenshot: Screenshot) : returns ()
  where screenshot is in Screenshots
  then
    remove screenshot from Screenshots
    returns
  where screenshot is not in Screenshots
  then
    refuses SCREENSHOT_NOT_FOUND "The screenshot does not exist."
```

## Queries

```queries
_get(screenshot: Screenshot) : optional (owner: User, imageRef: String, uploadedAt: String)
  Returns the screenshot's stored information when it exists.
  Returns no row when the screenshot does not exist.
```
