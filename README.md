
# SnapBack

SnapBack is a web application that helps users turn saved screenshots into actionable tasks. Instead of leaving important information buried in their photo libraries, users can upload a screenshot, identify what they want to do with it, and create a task they can return to later.


## Design

[Design Document](designDocument.md)

## Features

- Upload screenshots from your computer.
- Enter an intended action associated with a screenshot.
- Review and correct the intention before confirming it.
- Automatically create a task when an intention is confirmed.
- View tasks and their original screenshots.
- Edit task descriptions.
- Mark tasks as completed and reopen them.
- Delete tasks.
- Preserve tasks and completion states in MongoDB across application restarts.

## Concepts

SnapBack uses three concepts:

### ScreenshotStoring

Stores screenshot metadata, including the owner, image reference, and upload timestamp.

### IntentionInferring

Manages intentions associated with screenshots. An intention can be created, corrected, and confirmed.

### TaskTracking

Manages tasks created from confirmed intentions. Tasks can be edited, completed, reopened, and removed.

## Synchronization

The application uses SyncEngine to coordinate its concepts.

When an intention is confirmed, the TaskCreation synchronization creates a task associated with the confirmed inference and its screenshot owner.

The backend also exposes HTTP endpoints for the frontend to interact with the concepts.

## Technologies

- Vue 3 and Vite for the frontend
- TypeScript and Bun for the backend
- SyncEngine for concept registration and synchronization
- MongoDB for persistent storage
- Podman for running MongoDB locally

## Running Locally

### Prerequisites

Install:

- Bun
- Node.js and npm
- Podman with a working Compose provider

### 1. Install dependencies

From the project root:

```powershell
npm install
```

### 2. Start MongoDB

Start the MongoDB container using the included Compose configuration:

```powershell
podman compose up -d
```

This creates a local MongoDB instance with development credentials and a persistent data volume.

To stop MongoDB without deleting its data:

```powershell
podman compose down
```

### 3. Configure environment variables

Create a `.env` file in the project root containing:

```dotenv
MONGODB_URI=mongodb://dev:dev@127.0.0.1:27017/snapback?authSource=admin
```

These credentials are intended only for local development. The `.env` file is excluded from Git.

### 4. Start the backend

In one terminal, run:

```powershell
bun run start
```

The backend runs at http://localhost:3000.

### 5. Start the frontend

In another terminal, run:

```powershell
npx vite
```

Open http://localhost:5173.

## Running Tests

Run the test suite:

```powershell
bun test tests
```

The tests cover individual concept actions, concept synchronization, and MongoDB persistence.

To verify concept specifications, generated artifacts, and TypeScript types:

```powershell
bun run check
```

## Example Workflow

1. Upload a screenshot of an event or opportunity.
2. Enter an action you want to remember, such as "Register for the career fair."
3. Save the intention.
4. Review or correct its description.
5. Confirm the intention to create a task.
6. View the task and its associated screenshot.
7. Edit, complete, reopen, or delete the task as needed.

## Current Limitations

SnapBack is currently a local-development MVP.

- **Manual intention entry:** Users enter the intended action themselves. Automatic AI-based intention inference is not yet implemented.
- **Single-user setup:** The backend uses a fixed owner ID rather than authenticated user accounts.
- **Screenshot access controls:** Uploaded images are served without user-specific authorization checks. The application is not intended for public deployment in this state.
- **Screenshot deletion:** Screenshot removal exists at the concept level, but the web interface does not yet support deleting uploaded screenshots.
- **Local image storage:** Screenshot image files are stored in the local `uploads/` directory, while screenshot metadata and tasks are stored in MongoDB.

Future iterations may introduce automatic intention inference, user authentication, access controls, and screenshot management.
