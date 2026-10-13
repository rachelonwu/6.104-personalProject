
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { assemblePersistentApplication } from "./persistentApplication.js";

const OWNER = "studentA";
const PORT = 3000;
const UPLOAD_DIRECTORY = join(process.cwd(), "uploads");

await mkdir(UPLOAD_DIRECTORY, { recursive: true });

const { application, screenshots, intentions, tasks } =
  await assemblePersistentApplication();

const gateway = createGateway({ application });

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:5173",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

Bun.serve({
  port: PORT,

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return json({});
    }

    try {
      if (method === "GET" && path === "/api/health") {
        return json({ status: "ok" });
      }

      if (method === "POST" && path === "/api/screenshots") {
        const form = await request.formData();
        const file = form.get("image");

        if (!(file instanceof File) || !file.type.startsWith("image/")) {
          return json({ error: "Please upload an image." }, 400);
        }

        const extension = file.name.split(".").pop() ?? "png";
        const filename = `${crypto.randomUUID()}.${extension}`;
        const filePath = join(UPLOAD_DIRECTORY, filename);

        await Bun.write(filePath, file);

        const result = await screenshots.upload({
          owner: OWNER,
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
      }

      if (method === "GET" && path.startsWith("/uploads/")) {
        const filename = path.slice("/uploads/".length);

        if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
          return json({ error: "Invalid filename." }, 400);
        }

        const file = Bun.file(join(UPLOAD_DIRECTORY, filename));

        if (!(await file.exists())) {
          return json({ error: "Image not found." }, 404);
        }

        return new Response(file);
      }

      if (method === "POST" && path === "/api/inferences") {
        const body = (await request.json()) as {
          screenshot?: string;
          description?: string;
        };

        if (!body.screenshot || !body.description?.trim()) {
          return json(
            { error: "Screenshot and description are required." },
            400,
          );
        }

        const existing = await screenshots._get({
          screenshot: body.screenshot,
        });

        if (existing.length === 0 || existing[0].owner !== OWNER) {
          return json({ error: "Screenshot not found." }, 404);
        }

        const result = await intentions.infer({
          screenshot: body.screenshot,
          description: body.description.trim(),
        });

        return json(result, 201);
      }

      if (
        method === "PATCH" &&
        /^\/api\/inferences\/[^/]+$/.test(path)
      ) {
        const inference = path.split("/")[3];

        const body = (await request.json()) as {
          description?: string;
        };

        if (!body.description?.trim()) {
          return json({ error: "Description is required." }, 400);
        }

        const existing = await intentions._get({ inference });

        if (existing.length === 0) {
          return json({ error: "Inference not found." }, 404);
        }

        const screenshot = await screenshots._get({
          screenshot: existing[0].screenshot,
        });

        if (screenshot.length === 0 || screenshot[0].owner !== OWNER) {
          return json({ error: "Screenshot not found." }, 404);
        }

        await intentions.correct({
          inference,
          description: body.description.trim(),
        });

        return json({ corrected: inference });
      }

      if (
        method === "POST" &&
        path === "/api/inferences/confirm"
      ) {
        const body = (await request.json()) as {
          inference?: string;
        };

        if (!body.inference) {
          return json({ error: "Inference is required." }, 400);
        }

        const existing = await intentions._get({
          inference: body.inference,
        });

        if (existing.length === 0) {
          return json({ error: "Inference not found." }, 404);
        }

        const screenshot = await screenshots._get({
          screenshot: existing[0].screenshot,
        });

        if (screenshot.length === 0 || screenshot[0].owner !== OWNER) {
          return json({ error: "Screenshot not found." }, 404);
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

      if (method === "GET" && path === "/api/tasks") {
        const taskList = await tasks._listByOwner({
          owner: OWNER,
        });

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
              screenshot[0].owner !== OWNER
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

      if (
        method === "PATCH" &&
        /^\/api\/tasks\/[^/]+$/.test(path)
      ) {
        const task = path.split("/")[3];

        const existing = await tasks._get({ task });

        if (existing.length === 0 || existing[0].owner !== OWNER) {
          return json({ error: "Task not found." }, 404);
        }

        const body = (await request.json()) as {
          description?: string;
          completed?: boolean;
        };

        if (typeof body.description === "string") {
          if (!body.description.trim()) {
            return json(
              { error: "Description cannot be empty." },
              400,
            );
          }

          await tasks.edit({
            task,
            description: body.description.trim(),
          });
        }

        if (body.completed === true) {
          await tasks.complete({ task });
        } else if (body.completed === false) {
          await tasks.reopen({ task });
        }

        return json({ updated: task });
      }

      if (
        method === "DELETE" &&
        /^\/api\/tasks\/[^/]+$/.test(path)
      ) {
        const task = path.split("/")[3];

        const existing = await tasks._get({ task });

        if (existing.length === 0 || existing[0].owner !== OWNER) {
          return json({ error: "Task not found." }, 404);
        }

        await tasks.remove({ task });

        return json({ removed: task });
      }

      return json({ error: "Route not found." }, 404);
    } catch (error) {
      console.error(error);

      return json(
        { error: errorMessage(error) },
        500,
      );
    }
  },
});

console.log(
  `SnapBack server running at http://localhost:${PORT}`,
);
