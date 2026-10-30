
# SnapBack — Final Design Summary

**6.1040 Personal Project | Fall 2026**

## Overview

SnapBack helps users follow through on information they save in screenshots. Users upload a screenshot, receive an AI-generated action suggestion, review or edit it, and create a task with an optional reminder. Tasks stay connected to their original screenshots so users can refer back to the information they saved.

## Changes from P1: Concept Design

My initial idea focused on organizing screenshots generally. After receiving feedback, I narrowed the problem to screenshots saved because the user intends to act on something later.

I originally designed four concepts: `ScreenshotStoring`, `IntentionInferring`, `TaskTracking`, and `Reminding`. As the project developed, I incorporated reminders into `TaskTracking` and added `UserAuthentication` to support individual accounts and access control.

The final four concepts are:

- **ScreenshotStoring:** Stores screenshots and their metadata.
- **IntentionInferring:** Manages suggested actions and user corrections.
- **TaskTracking:** Manages tasks, completion, and optional reminders.
- **UserAuthentication:** Manages accounts and sessions.

I kept manual screenshot uploads rather than automatic photo-library syncing to focus on the main screenshot-to-task workflow.

## Changes from P3: Interaction and Visual Design

The early interface was functional but didn't clearly separate uploading screenshots from creating and managing tasks.

For P3, I redesigned SnapBack in Figma using a cream background with sage-green, periwinkle, berry, and butter-yellow accents. I adapted the design to my existing Vue application instead of replacing its working logic.

I also simplified the confirmation workflow. Rather than requiring separate correction and confirmation steps, users can edit the suggested action and select **Create Task**.

Finally, I made the upload and action creation sections collapsible. This reduced scrolling and made saved tasks easier to access without moving the workflow to multiple pages.

## Changes from P4: Architecture and Reliability

My P3 feedback pointed out that although I had MongoDB-backed concepts, it wasn't clear whether the deployed application used them.

I separated the assembly into an in-memory configuration for testing and a persistent configuration for deployment. The backend now starts with the MongoDB-backed versions of all four concepts.

I also refined the `SnapBack`, `TaskCreation`, and `TaskManagement` compositions to coordinate actions through synchronizations and enforce ownership restrictions. This reduced the amount of coordination handled directly in HTTP routes.

During testing, I found that the AI sometimes invented future event dates. For example, a Matcha Meetup screenshot listing October 6, 20, and 27 produced November 3. I updated the inference prompt to select the latest date explicitly shown instead of predicting another occurrence.

I kept the review step so users can correct AI suggestions before creating tasks.

## Testing and Validation

I tested concept actions, synchronizations, authentication, access control, and error cases.

- **62 automated tests passed**, including tests for duplicate task prevention, ownership restrictions, and login rate limiting.
- SyncEngine checks, TypeScript checks, and the production build passed.
- I verified screenshot and task persistence locally and in the deployed application.
- I tested the corrected AI inference on both local and deployed versions.

These checks helped identify problems that weren't obvious from testing only the normal user journey.

## Limitations and Reflection

Browser reminders currently require SnapBack to be open and notification permission to be enabled. Screenshot uploads are also manual.

P1 helped me narrow the problem, P3 improved the user experience, and P4 focused on making the implementation more reliable.

The main lesson from P4 was that getting the expected workflow to work wasn't enough. Testing persistence, access control, and unexpected AI behavior helped me catch issues that I otherwise would have missed.
