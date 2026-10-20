
# SnapBack

SnapBack is a web application that helps people act on information they save as screenshots. Instead of letting screenshots get buried in a photo library, users can upload them, generate an AI-suggested action, edit that suggestion, and save it as a task with an optional reminder.

## P3 Submission Materials

The public project repository contains the SnapBack implementation and the following P3 deliverables:

| Deliverable | Location |
| --- | --- |
| Application source code | [frontend/](frontend/) and [src/](src/) |
| Concept and application specifications | [design/](design/) |
| Automated concept, composition, and security tests | [tests/](tests/) |
| Saved automated test output | [test-output.txt](test-output.txt) |

[Visual design study slides](https://docs.google.com/presentation/d/1K_j7bY3KXAO_XBKbqDzAkAdU4lZlrLt-z_gYEMc0r3M/edit?usp=sharing)

[Updated User Journey](design/user-journey.md)

Narrated screen recording  TODO: Add the YouTube URL here

**Deployed application:** https://snapback.mit-sdg.dev


## Features

- Create an account, sign in, and sign out.
- Upload screenshots and view previously uploaded screenshots.
- Generate an AI suggestion based on a screenshot and revise the suggested action before saving it.
- Create, edit, complete, reopen, and delete tasks.
- Set, change, or remove task reminders.
- View tasks associated with the signed-in account.
- Receive browser notifications for due reminders while the application is open, when notification permission is granted.

## Tech Stack

- **Frontend:** Vue 3, Vite, TypeScript
- **Backend:** Bun, TypeScript, SyncEngine
- **Database:** MongoDB
- **AI:** MIT Parley (Claude Haiku 4.5)
- **Screenshot storage:** Local storage during development; S3-compatible object storage in production

## Getting Started

### Prerequisites

- Bun
- A running MongoDB instance
- Access to the AI service for live screenshot inference

### Install Dependencies

```bash
bun install
```

### Configure the Environment

Create a local `.env` file and configure the environment variables used by the application. At minimum, the backend needs a MongoDB connection string and an AI service API key for live inference:

```dotenv
MONGODB_URI=mongodb://localhost:27017/snapback
PARLEY_API_KEY=your_api_key_here
```

Your MongoDB URI may also require credentials and an `authSource` parameter, depending on how your local server is configured. Do not commit `.env` or real credentials to Git.

For production, configure the S3-compatible storage environment variables supported by the hosting provider, including `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, and `S3_REGION`. Set `PUBLIC_ORIGIN` to the deployed application's public URL.

### Run Locally

Start the backend:

```bash
bun run start
```

The application is served at `http://localhost:3000` in the local production-style setup. For frontend development, use the Vite development command configured for the project.

### Validate the Project

```bash
bun run check
bun run build
```

## Automated Tests

SnapBack has **54 automated tests across 8 files**, with **131 assertions** in the most recent successful run. The suite covers concept behavior, application composition, MongoDB persistence, authentication, and login rate limiting.

| Test Area | Coverage |
| --- | --- |
| ScreenshotStoring | Upload, retrieve, delete, and nonexistent screenshots |
| IntentionInferring | Infer, correct, confirm, repeated confirmation, and invalid operations |
| TaskTracking | Create, edit, complete, reopen, delete, reminders, and invalid operations |
| UserAuthentication | Registration, login, logout, duplicate accounts, and session behavior |
| Application composition | Creating tasks from confirmed suggestions and preventing duplicate tasks |
| MongoDB persistence | Task and authentication state surviving application/concept reassembly |
| Login rate limiting | Attempt limits, account isolation, concurrent requests, and expiration data |

### Running Tests

Use a separate test database. Some tests create or delete MongoDB records, and the MongoDB-backed test suites may create and drop temporary test databases. Do not run them against a production database.

1. Start your local MongoDB server.
2. Set `MONGODB_URI` to a valid local test connection string with the necessary credentials. The database should be separate from the application's normal database, for example `snapback_p3_test`. If your MongoDB user authenticates against `admin` or another database, retain the appropriate `authSource` setting.
3. Run:

```bash
bun test
```

To save the output on Windows PowerShell:

```powershell
bun test *> test-output.txt
```

The most recent successful run reported:

```text
54 pass
0 fail
131 expect() calls
Ran 54 tests across 8 files.
```

## Project Structure

```text
frontend/           Vue frontend
src/                Backend, concepts, persistence, and application assembly
tests/concepts/     Concept tests
tests/compositions/ Application composition and persistence tests
tests/security/     Login rate-limiting tests
design/             Concept and application specifications
```

## Notes

- Screenshot access and task data are tied to authenticated accounts.
- Browser reminders depend on notification permissions and the application being open; they are not guaranteed background push notifications.
- Never commit `.env`, API keys, database credentials, or private screenshot data.
