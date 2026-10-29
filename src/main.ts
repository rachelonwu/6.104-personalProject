import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { extname, join } from "node:path";
import {
  saveScreenshot,
  readScreenshot,
  deleteScreenshot,
} from "./services/ScreenshotStorage.js";
import { assemblePersistentApplication } from "./persistentApplication.js";
import { connectDatabase } from "./database.js";
import { EmailAlreadyRegistered } from "./concepts/UserAuthentication.js";
import { LoginRateLimiter } from "./security/LoginRateLimiter.js";
import {
  ImageUploadError,
  readLimitedUpload,
  validateUploadedImage,
} from "./security/ImageUploadValidation.js";
import {
  inferScreenshotIntention,
  ParleyInferenceError,
} from "./services/ParleyInference.js";
const PORT = Number(process.env.PORT ?? 3000);
const FRONTEND_ORIGIN =
  process.env.PUBLIC_ORIGIN ?? "http://localhost:5173";
const PRODUCTION = process.env.NODE_ENV === "production";
const COOKIE_NAME = PRODUCTION
  ? "__Host-snapback_session"
  : "snapback_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_AUTH_BODY_SIZE = 4096;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const {
  application,
  screenshots,
  intentions,
  tasks,
  authentication,
} = await assemblePersistentApplication();
const database = await connectDatabase();
const accountLoginLimiter = new LoginRateLimiter(
  database,
  RATE_LIMIT_WINDOW_MS,
  5,
);
const globalLoginLimiter = new LoginRateLimiter(
  database,
  RATE_LIMIT_WINDOW_MS,
  100,
);
const accountSignupLimiter = new LoginRateLimiter(
  database,
  RATE_LIMIT_WINDOW_MS,
  5,
);
const globalSignupLimiter = new LoginRateLimiter(
  database,
  RATE_LIMIT_WINDOW_MS,
  100,
);
// Limit AI requests to help protect Parley credits.
const accountInferenceLimiter = new LoginRateLimiter(
  database,
  RATE_LIMIT_WINDOW_MS,
  20,
);
const accountUploadLimiter = new LoginRateLimiter(
  database,
  RATE_LIMIT_WINDOW_MS,
  30,
);
const globalUploadLimiter = new LoginRateLimiter(
  database,
  RATE_LIMIT_WINDOW_MS,
  300,
);
const gateway = createGateway({ application });
const corsHeaders = {
  "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
};
function json(
  data: unknown,
  status = 200,
  headers: HeadersInit = {},
): Response {
  return Response.json(data, {
    status,
    headers: {
      ...corsHeaders,
      // Prevent caching of private API responses.
      "Cache-Control": "no-store",
      // Prevent browsers from guessing content types.
      "X-Content-Type-Options": "nosniff",
      // Limit information sent in the Referer header.
      "Referrer-Policy": "strict-origin-when-cross-origin",
      // Prevent this response from being embedded in a frame.
      "X-Frame-Options": "DENY",
      ...headers,
    },
  });
}
function getCookie(
  request: Request,
  name: string,
): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const entry of header.split(";")) {
    const [key, ...value] = entry.trim().split("=");
    if (key === name) {
      return value.join("=");
    }
  }
  return undefined;
}
function sessionCookie(token: string, maxAge: number): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (PRODUCTION) {
    parts.push("Secure");
  }
  return parts.join("; ");
}
async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
function validEmail(email: string): boolean {
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    email.length <= 254
  );
}
async function readAuthBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength < 0 ||
      contentLength > MAX_AUTH_BODY_SIZE
    ) {
      throw new Error("AUTH_BODY_TOO_LARGE");
    }
  }
  const reader = request.body?.getReader();
  if (!reader) {
    return null;
  }
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > MAX_AUTH_BODY_SIZE) {
        await reader.cancel().catch(() => {});
        throw new Error("AUTH_BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    return null;
  }
  return parsed as Record<string, unknown>;
}
function rateLimitResponse(retryAfterSeconds: number): Response {
  return json(
    { error: "Too many attempts. Please try again later." },
    429,
    { "Retry-After": String(retryAfterSeconds) },
  );
}
async function authenticatedSession(request: Request) {
  const token = getCookie(request, COOKIE_NAME);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }
  const matches = await authentication._getSessionByTokenHash({
    tokenHash: await hashToken(token),
  });
  if (matches.length === 0) {
    return null;
  }
  const session = matches[0];
  const expiresAt = Date.parse(session.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await authentication
      .logout({ session: session.session })
      .catch(() => {});
    return null;
  }
  return session;
}
async function createSession(user: string) {
  const token = Array.from(
    crypto.getRandomValues(new Uint8Array(32)),
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_MS,
  ).toISOString();
  await authentication.login({
    user,
    tokenHash,
    expiresAt,
  });
  return token;
}
function allowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin !== null) {
    return origin === FRONTEND_ORIGIN;
  }
  const referer = request.headers.get("referer");
  if (referer !== null) {
    try {
      return new URL(referer).origin === FRONTEND_ORIGIN;
    } catch {
      return false;
    }
  }
  // Reject requests without an allowed origin.
  return false;
}
function imageMimeType(filename: string): string | null {
  const types: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return types[extname(filename).toLowerCase()] ?? null;
}
async function serveFrontend(
  path: string,
  method: string,
): Promise<Response> {
  const dist = join(process.cwd(), "dist");
  // Only serve public frontend pages and assets.
  if (path.startsWith("/api/") || path.startsWith("/uploads/")) {
    return json({ error: "Route not found." }, 404);
  }
  const filename = path === "/" ? "index.html" : path.slice(1);
  // Prevent paths from escaping the public build directory.
  if (
    filename.includes("\\") ||
    filename.split("/").includes("..")
  ) {
    return json({ error: "Route not found." }, 404);
  }
  const file = Bun.file(join(dist, filename));
  if (await file.exists()) {
    return new Response(method === "HEAD" ? null : file, {
      headers: {
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  const index = Bun.file(join(dist, "index.html"));
  if (await index.exists()) {
    return new Response(method === "HEAD" ? null : index, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return json({ error: "Frontend build not found." }, 404);
}
Bun.serve({
  hostname: process.env.HOST ?? "0.0.0.0",
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "GET" && path === "/health") {
      return new Response("OK", { status: 200 });
    }
    if (
      (method === "GET" || method === "HEAD") &&
      !path.startsWith("/api/") &&
      !path.startsWith("/uploads/")
    ) {
      return serveFrontend(path, method);
    }
    if (method === "OPTIONS") {
      if (!allowedOrigin(request)) {
        return json({ error: "Origin not allowed." }, 403);
      }
      return json({});
    }
    try {
      if (
        !["GET", "HEAD", "OPTIONS"].includes(method) &&
        !allowedOrigin(request)
      ) {
        return json({ error: "Origin not allowed." }, 403);
      }
      if (method === "GET" && path === "/api/health") {
        return json({ status: "ok" });
      }
      // Account registration
      if (method === "POST" && path === "/api/auth/register") {
        const globalLimit = await globalSignupLimiter.consume(
          "signup:global",
        );
        if (!globalLimit.allowed) {
          return rateLimitResponse(globalLimit.retryAfterSeconds);
        }
        const body = await readAuthBody(request);
        if (
          !body ||
          typeof body.email !== "string" ||
          typeof body.password !== "string"
        ) {
          return json(
            { error: "Email and password are required." },
            400,
          );
        }
        const email = normalizeEmail(body.email);
        const password = body.password;
        if (!validEmail(email)) {
          return json(
            { error: "Enter a valid email address." },
            400,
          );
        }
        if (password.length < 12 || password.length > 128) {
          return json(
            {
              error:
                "Password must contain between 12 and 128 characters.",
            },
            400,
          );
        }
        const accountLimit = await accountSignupLimiter.consume(
          `signup:account:${await hashToken(email)}`,
        );
        if (!accountLimit.allowed) {
          return rateLimitResponse(accountLimit.retryAfterSeconds);
        }
        const passwordHash = await Bun.password.hash(password);
        let user: string;
        try {
          const result = await authentication.register({
            email,
            passwordHash,
          });
          user = result.user;
        } catch (error) {
          if (error instanceof EmailAlreadyRegistered) {
            return json(
              {
                error:
                  "Unable to create an account with these details.",
              },
              409,
            );
          }
          throw error;
        }
        const token = await createSession(user);
        return json(
          { user: { id: user, email } },
          201,
          {
            "Set-Cookie": sessionCookie(
              token,
              SESSION_DURATION_MS / 1000,
            ),
          },
        );
      }
      // Account login
      if (method === "POST" && path === "/api/auth/login") {
        const globalLimit = await globalLoginLimiter.consume(
          "login:global",
        );
        if (!globalLimit.allowed) {
          return rateLimitResponse(globalLimit.retryAfterSeconds);
        }
        const body = await readAuthBody(request);
        if (
          !body ||
          typeof body.email !== "string" ||
          typeof body.password !== "string"
        ) {
          return json(
            { error: "Invalid email or password." },
            401,
          );
        }
        const email = normalizeEmail(body.email);
        const password = body.password;
        if (
          !validEmail(email) ||
          password.length === 0 ||
          password.length > 128
        ) {
          return json(
            { error: "Invalid email or password." },
            401,
          );
        }
        const accountLimit = await accountLoginLimiter.consume(
          `login:account:${await hashToken(email)}`,
        );
        if (!accountLimit.allowed) {
          return rateLimitResponse(accountLimit.retryAfterSeconds);
        }
        const matches = await authentication._getByEmail({ email });
        const account = matches[0];
        if (
          !account ||
          !(await Bun.password.verify(
            password,
            account.passwordHash,
          ))
        ) {
          return json(
            { error: "Invalid email or password." },
            401,
          );
        }
        const token = await createSession(account.user);
        return json(
          { user: { id: account.user, email } },
          200,
          {
            "Set-Cookie": sessionCookie(
              token,
              SESSION_DURATION_MS / 1000,
            ),
          },
        );
      }
      const session = await authenticatedSession(request);
      // Restore session
      if (method === "GET" && path === "/api/auth/me") {
        if (!session) {
          return json({ error: "Not authenticated." }, 401);
        }
        const matches = await authentication._getUser({
          user: session.user,
        });
        if (matches.length === 0) {
          return json({ error: "Not authenticated." }, 401);
        }
        return json({
          user: {
            id: session.user,
            email: matches[0].email,
          },
        });
      }
      // Logout
      if (method === "POST" && path === "/api/auth/logout") {
        if (session) {
          await authentication.logout({
            session: session.session,
          });
        }
        return json(
          { loggedOut: true },
          200,
          { "Set-Cookie": sessionCookie("", 0) },
        );
      }
      // All remaining routes require authentication.
      if (!session) {
        return json({ error: "Not authenticated." }, 401);
      }
      const owner = session.user;
      // Upload screenshot
      if (method === "POST" && path === "/api/screenshots") {
        const accountLimit = await accountUploadLimiter.consume(
          `upload:account:${owner}`,
        );
        if (!accountLimit.allowed) {
          return rateLimitResponse(accountLimit.retryAfterSeconds);
        }
        const globalLimit = await globalUploadLimiter.consume(
          "upload:global",
        );
        if (!globalLimit.allowed) {
          return rateLimitResponse(globalLimit.retryAfterSeconds);
        }
        const form = await readLimitedUpload(request);
        const { file, extension } = await validateUploadedImage(
          form.get("image"),
        );
        const filename = `${crypto.randomUUID()}.${extension}`;
        await saveScreenshot(filename, file);
        try {
          const result = await screenshots.upload({
            owner,
            imageRef: filename,
            uploadedAt: new Date().toISOString(),
          });
          return json(
            {
              screenshot: result.screenshot,
              imageUrl: `/uploads/${filename}`,
            },
            201,
          );
        } catch (error) {
          await deleteScreenshot(filename).catch(() => {});
          throw error;
        }
      }
      // Private screenshot access
      if (method === "GET" && path.startsWith("/uploads/")) {
        const filename = path.slice("/uploads/".length);
        if (!/^[a-f0-9-]{36}\.(png|jpg|webp|gif)$/.test(filename)) {
          return json({ error: "Image not found." }, 404);
        }
        const screenshot = await database
          .collection<{ owner: string; imageRef: string }>(
            "screenshots",
          )
          .findOne({ imageRef: filename, owner });
        if (!screenshot) {
          return json({ error: "Image not found." }, 404);
        }
        const imageBytes = await readScreenshot(filename);
        if (!imageBytes) {
          return json({ error: "Image not found." }, 404);
        }
        return new Response(
          new Blob([Uint8Array.from(imageBytes)], {
            type: imageMimeType(filename) ?? "application/octet-stream",
          }),
          {
          headers: {
            ...corsHeaders,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "X-Frame-Options": "DENY",
            "Content-Security-Policy":
              "default-src 'none'; sandbox",
              "Content-Type": imageMimeType(filename) ?? "application/octet-stream",
          },
        });
      }
      // AI screenshot suggestion using MIT Parley
      if (
        method === "POST" &&
        path === "/api/inferences/suggest"
      ) {
        const body = await readAuthBody(request);
        if (!body || typeof body.screenshot !== "string") {
          return json(
            { error: "Screenshot is required." },
            400,
          );
        }
        // Verify ownership before accessing the file
        // or making a billable AI request.
        const existing = await screenshots._get({
          screenshot: body.screenshot,
        });
        if (
          existing.length === 0 ||
          existing[0].owner !== owner
        ) {
          return json(
            { error: "Screenshot not found." },
            404,
          );
        }
        const filename = existing[0].imageRef;
        if (!/^[a-f0-9-]{36}\.(png|jpg|webp|gif)$/.test(filename)) {
          return json(
            { error: "Screenshot format is unsupported." },
            400,
          );
        }
        const mimeType = imageMimeType(filename);
        if (!mimeType) {
          return json(
            { error: "Screenshot format is unsupported." },
            400,
          );
        }
        const imageBytes = await readScreenshot(filename);
        if (!imageBytes) {
          return json(
            { error: "Screenshot file not found." },
            404,
          );
        }
        const inferenceLimit =
          await accountInferenceLimiter.consume(
            `inference:account:${owner}`,
          );
        if (!inferenceLimit.allowed) {
          return rateLimitResponse(
            inferenceLimit.retryAfterSeconds,
          );
        }
        try {
          const suggestion = await inferScreenshotIntention(
            imageBytes,
            mimeType,
          );
          return json(suggestion);
        } catch (error) {
          if (error instanceof ParleyInferenceError) {
            console.error(
              "Parley inference error:",
              error.message,
            );
            return json(
              {
                error:
                  "AI suggestion is temporarily unavailable. You can enter your intention manually.",
              },
              502,
            );
          }
          throw error;
        }
      }
      // Create an inference
      if (method === "POST" && path === "/api/inferences") {
        const body = (await request.json()) as {
          screenshot?: string;
          description?: string;
        };
        if (!body.screenshot || !body.description?.trim()) {
          return json(
            {
              error:
                "Screenshot and description are required.",
            },
            400,
          );
        }
        const existing = await screenshots._get({
          screenshot: body.screenshot,
        });
        if (
          existing.length === 0 ||
          existing[0].owner !== owner
        ) {
          return json(
            { error: "Screenshot not found." },
            404,
          );
        }
        const result = await intentions.infer({
          screenshot: body.screenshot,
          description: body.description.trim(),
        });
        return json(result, 201);
      }
      // Correct an inference
      if (
        method === "PATCH" &&
        /^\/api\/inferences\/[^/]+$/.test(path)
      ) {
        const inference = path.split("/")[3];
        const body = (await request.json()) as {
          description?: string;
        };
        if (!body.description?.trim()) {
          return json(
            { error: "Description is required." },
            400,
          );
        }
        const existing = await intentions._get({ inference });
        if (existing.length === 0) {
          return json(
            { error: "Inference not found." },
            404,
          );
        }
        const screenshot = await screenshots._get({
          screenshot: existing[0].screenshot,
        });
        if (
          screenshot.length === 0 ||
          screenshot[0].owner !== owner
        ) {
          return json(
            { error: "Inference not found." },
            404,
          );
        }
        await intentions.correct({
          inference,
          description: body.description.trim(),
        });
        return json({ corrected: inference });
      }
      // Confirm an inference and create a task
      if (
        method === "POST" &&
        path === "/api/inferences/confirm"
      ) {
        const body = (await request.json()) as {
          inference?: string;
        };
        if (!body.inference) {
          return json(
            { error: "Inference is required." },
            400,
          );
        }
        const existing = await intentions._get({
          inference: body.inference,
        });
        if (existing.length === 0) {
          return json(
            { error: "Inference not found." },
            404,
          );
        }
        const screenshot = await screenshots._get({
          screenshot: existing[0].screenshot,
        });
        if (
          screenshot.length === 0 ||
          screenshot[0].owner !== owner
        ) {
          return json(
            { error: "Inference not found." },
            404,
          );
        }
        const result = await gateway.invoke(
          "/inferences/confirm",
          { inference: body.inference },
        );
        if (!result.ok) {
          return json({ error: result.error }, 400);
        }
        await gateway.whenIdle();
        return json(result.value);
      }
      // List tasks belonging to the current user
      if (method === "GET" && path === "/api/tasks") {
        const taskList = await tasks._listByOwner({ owner });
        const tasksWithScreenshots = await Promise.all(
          taskList.map(async (task) => {
            const inference = await intentions._get({
              inference: task.source,
            });
            if (inference.length === 0) {
              return { ...task, imageUrl: null };
            }
            const screenshot = await screenshots._get({
              screenshot: inference[0].screenshot,
            });
            if (
              screenshot.length === 0 ||
              screenshot[0].owner !== owner
            ) {
              return { ...task, imageUrl: null };
            }
            return {
              ...task,
              imageUrl: `/uploads/${screenshot[0].imageRef}`,
            };
          }),
        );
        return json({ tasks: tasksWithScreenshots });
      }
      // Edit, complete, or set a reminder for a task
      if (
        method === "PATCH" &&
        /^\/api\/tasks\/[^/]+$/.test(path)
      ) {
        const task = path.split("/")[3];
        const existing = await tasks._get({ task });
        if (
          existing.length === 0 ||
          existing[0].owner !== owner
        ) {
          return json({ error: "Task not found." }, 404);
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json(
            { error: "Invalid JSON request." },
            400,
          );
        }
        if (
          typeof body !== "object" ||
          body === null ||
          Array.isArray(body)
        ) {
          return json(
            { error: "Invalid task update." },
            400,
          );
        }
        const update = body as Record<string, unknown>;
        const allowedFields = [
          "description",
          "completed",
          "reminderAt",
          "reminderDateOnly",
        ];
        if (
          Object.keys(update).length === 0 ||
          Object.keys(update).some(
            (field) => !allowedFields.includes(field),
          )
        ) {
          return json(
            { error: "Invalid task update fields." },
            400,
          );
        }
        // Validate every supplied field before changing anything.
        if ("description" in update) {
          if (
            typeof update.description !== "string" ||
            !update.description.trim()
          ) {
            return json(
              { error: "Description cannot be empty." },
              400,
            );
          }
        }
        if (
          "completed" in update &&
          typeof update.completed !== "boolean"
        ) {
          return json(
            { error: "Completed must be a boolean." },
            400,
          );
        }
        if ("reminderAt" in update) {
          const reminderAt = update.reminderAt;
          if (reminderAt !== null) {
            if (
              typeof reminderAt !== "string" ||
              !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
                reminderAt,
              ) ||
              !Number.isFinite(Date.parse(reminderAt)) ||
              new Date(reminderAt).toISOString() !== reminderAt
            ) {
              return json(
                {
                  error:
                    "Reminder must be a valid UTC ISO timestamp or null.",
                },
                400,
              );
            }
          }
        }
        if (
          "reminderDateOnly" in update &&
          typeof update.reminderDateOnly !== "boolean"
        ) {
          return json({ error: "reminderDateOnly must be a boolean." }, 400);
        }
        if (
          update.reminderDateOnly === true &&
          (
            ("reminderAt" in update
              ? update.reminderAt
              : existing[0].reminderAt) === null
          )
        ) {
          return json(
            { error: "Date-only reminders require a reminder timestamp." },
            400,
          );
        }
        // All supplied values are valid; apply the updates.
        if (typeof update.description === "string") {
          const result = await gateway.invoke("/tasks/edit", {
            owner, task, description: update.description.trim(),
          });
          if (!result.ok) return json({ error: result.error }, 400);
        }
        if (update.completed === true) {
          const result = await gateway.invoke("/tasks/complete", { owner, task });
          if (!result.ok) return json({ error: result.error }, 400);
        } else if (update.completed === false) {
          const result = await gateway.invoke("/tasks/reopen", { owner, task });
          if (!result.ok) return json({ error: result.error }, 400);
        }
        if ("reminderAt" in update || "reminderDateOnly" in update) {
          const reminderAt =
            "reminderAt" in update
              ? (update.reminderAt as string | null)
              : existing[0].reminderAt;

          const reminderDateOnly =
            reminderAt === null
              ? false
              : "reminderDateOnly" in update
                ? (update.reminderDateOnly as boolean)
                : existing[0].reminderDateOnly;

          const result = await gateway.invoke("/tasks/reminder", {
            owner, task, reminderAt, reminderDateOnly,
          });
          if (!result.ok) return json({ error: result.error }, 400);
        }
        return json({ updated: task });
      }
      // Delete a task
      if (
        method === "DELETE" &&
        /^\/api\/tasks\/[^/]+$/.test(path)
      ) {
        const task = path.split("/")[3];
        const existing = await tasks._get({ task });
        if (
          existing.length === 0 ||
          existing[0].owner !== owner
        ) {
          return json({ error: "Task not found." }, 404);
        }
        const result = await gateway.invoke("/tasks/remove", { owner, task });
        if (!result.ok) return json({ error: result.error }, 400);
        return json({ removed: task });
      }
            return json({ error: "Route not found." }, 404);
    } catch (error) {
      if (error instanceof ImageUploadError) {
        return json(
          { error: error.message },
          error.status,
        );
      }
      if (
        error instanceof Error &&
        error.message === "AUTH_BODY_TOO_LARGE"
      ) {
        return json(
          { error: "Request body is too large." },
          413,
        );
      }
      if (error instanceof SyntaxError) {
        return json(
          { error: "Invalid JSON request." },
          400,
        );
      }
      console.error(error);
      return json(
        { error: "An unexpected server error occurred." },
        500,
      );
    }
  },
});
console.log(
  `SnapBack server running at http://localhost:${PORT}`,
);
