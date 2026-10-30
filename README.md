# SnapBack

SnapBack is a web application that helps people act on information they save as screenshots. Instead of letting screenshots get buried in a photo library, users can upload them, generate an AI-suggested action, edit that suggestion, and save it as a task with an optional reminder.

## Project Resources

The public project repository contains the SnapBack implementation and the following project deliverables:

| Deliverable | Location |
| --- | --- |
| Application source code | [frontend/](frontend/) and [src/](src/) |
| Concept and application specifications | [design/](design/) |
| Automated concept, composition, and security tests | [tests/](tests/) |
| Saved automated test output | [test-output.txt](test-output.txt) |

[Visual design study slides](https://docs.google.com/presentation/d/1K_j7bY3KXAO_XBKbqDzAkAdU4lZlrLt-z_gYEMc0r3M/edit?usp=sharing)

[Updated User Journey](design/user-journey.md)


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

The application is served at `http://localhost:3000` in the local production-style setup. For frontend development, start a second terminal with `npx vite --host localhost` and open `http://localhost:5173`. Keep the backend running separately. Using `localhost` rather than `127.0.0.1` matches the default `PUBLIC_ORIGIN` and avoids an origin mismatch.

### Validate the Project

```bash
bun run check
bun run build
```

## Automated Tests

The latest local run passed **62 automated tests** with **150 assertions** across 9 discovered test files. One discovered file, `tests/compositions/PersistentSnapBack.test.ts`, currently contains no test cases. The suite covers concept behavior, application composition, MongoDB-backed authentication, and login rate limiting. Screenshot and task persistence have also been checked manually across a backend restart.

| Test Area | Coverage |
| --- | --- |
| ScreenshotStoring | Upload, retrieve, delete, and nonexistent screenshots |
| IntentionInferring | Infer, correct, confirm, repeated confirmation, and invalid operations |
| TaskTracking | Create, edit, complete, reopen, delete, reminders, and invalid operations |
| UserAuthentication | Registration, login, logout, duplicate accounts, and session behavior |
| Application composition | Creating tasks from confirmed suggestions and preventing duplicate tasks |
| MongoDB-backed authentication | Registration and sessions surviving concept reassembly, plus concurrent duplicate registration |
| Login rate limiting | Attempt limits, account isolation, concurrent requests, and expiration data |

### Running Tests

Use a separate test database. Some tests create or delete MongoDB records, and the MongoDB-backed test suites may create and drop temporary test databases. Do not run them against a production database.

1. Start your local MongoDB server.
2. Set `MONGODB_URI` to a valid local test connection string with the necessary credentials. The database should be separate from the application's normal database, for example `snapback_test`. If your MongoDB user authenticates against `admin` or another database, retain the appropriate `authSource` setting.
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
62 pass
0 fail
150 expect() calls
Ran 62 tests across 9 files.
```

## Concept Assembly and MongoDB Persistence

SnapBack has **four concepts**: `ScreenshotStoring`, `IntentionInferring`, `TaskTracking`, and `UserAuthentication`. Their actions and queries are defined separately from application coordination.

- `src/assembly.ts` defines the SyncEngine concept set and compositions. `assembleApplication()` uses in-memory implementations by default, allowing composition tests to run without MongoDB, but accepts implementation overrides.
- `src/persistentApplication.ts` connects to MongoDB, constructs `MongoScreenshotStoringConcept`, `MongoIntentionInferringConcept`, `MongoTaskTrackingConcept`, and `MongoUserAuthenticationConcept`, and passes all four as overrides to `assembleApplication()`.
- `src/main.ts` starts the HTTP server by calling `assemblePersistentApplication()`. Thus, the local backend started with `bun run start` uses the MongoDB-backed concepts, **not** the in-memory defaults. The same is true of a deployment only if it starts this entry point with a durable MongoDB connection.

This separation allows the same concept contracts and synchronizations to be used with in-memory implementations for tests and MongoDB implementations for the running server. The screenshot image bytes are handled separately by the screenshot storage service; concept records and metadata are stored in MongoDB.

**Persistence verification:** In a local manual test, a screenshot and a confirmed task remained available after stopping and restarting only the backend process while MongoDB continued running. MongoDB-backed authentication tests also verify that accounts and sessions survive concept reassembly. Persistence of the live deployed environment has not yet been independently verified.

## Compositions and Synchronizations

- `src/compositions/SnapBack.ts` defines the inference confirmation endpoint and checks that the inference's source screenshot exists and belongs to the authenticated owner before confirming it.
- `src/compositions/TaskCreation.ts` reacts to a successful inference confirmation and creates a task using the confirmed description and screenshot owner.
- `src/compositions/TaskManagement.ts` defines edit, complete, reopen, reminder, and removal endpoints. `TaskTracking` enforces ownership for these mutations.

**Known diagnostic advisory:** SyncEngine reports one `MISSING_ENDPOINT_FALLBACK` advisory for `/inferences/confirm`: the analyzer cannot prove that every admitted request reaches a response path. Concept checks and application diagnostics pass, and tested missing-source/unauthorized cases behave as expected. This remains a potential uncovered timeout path rather than a proven absence of runtime issues.

## Manual Regression Verification

The frontend was manually tested locally: uploading two screenshots, switching suggestions, switching screenshots during inference, confirming a suggestion, and refreshing to verify saved data. All six checks passed. These checks do not establish correctness under every possible request race or confirm the deployed environment's behavior.

## Project Structure

```text
frontend/           Vue frontend
src/                Backend, concepts, persistence, and application assembly
tests/concepts/     Concept tests
tests/compositions/ Application composition and persistence tests
tests/security/     Login rate-limiting tests
design/             Concept and application specifications
```
## Project Materials

- [Deployed Application](https://snapback.mit-sdg.dev)
- [Final Design Summary](design/final-design.md)
- [Final Demo Video](https://youtu.be/uEV34JdPQ58)
