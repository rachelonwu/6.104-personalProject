# ScreenshotStoring

## Purpose

Allow users to save and retrieve screenshots, preventing important information from becoming difficult to find or losing its connection to the actions users intended to take. ScreenshotStoring owns screenshot records, while the actual image files are managed by the application's storage layer.

## Principle

After a user uploads a screenshot, the system stores a record containing its image reference, owner, and upload time. The user can retrieve the stored screenshot for reference or remove it when it is no longer needed.

## Types

```types
external User
  The person who uploads and owns a screenshot. User accounts are managed by UserAuthentication.
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

remove(screenshot: Screenshot, owner: User) : returns ()
  where screenshot is in Screenshots and screenshot.owner is owner
  then
    remove screenshot from Screenshots
    returns
  where screenshot is not in Screenshots or screenshot.owner is not owner
  then
    refuses SCREENSHOT_NOT_FOUND "The screenshot does not exist."
```

## Queries

```queries
_get(screenshot: Screenshot) : optional (owner: User, imageRef: String, uploadedAt: String)
  Returns the screenshot's stored information when it exists.
  Returns no row when the screenshot does not exist.
```
