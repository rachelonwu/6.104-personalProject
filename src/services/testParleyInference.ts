
import { inferScreenshotIntention } from "./ParleyInference.js";
import { resolve } from "node:path";

const imagePath = process.argv[2];

if (!imagePath) {
  console.error(
    "Usage: bun run src/services/testParleyInference.ts <image-path>",
  );
  process.exit(1);
}

const absolutePath = resolve(imagePath);

const extension = absolutePath.split(".").pop()?.toLowerCase();

const mimeTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

const mimeType = mimeTypes[extension ?? ""];

if (!mimeType) {
  console.error("Unsupported image format.");
  process.exit(1);
}

try {
  console.log("Sending screenshot to MIT Parley...");

  const description = await inferScreenshotIntention(
    absolutePath,
    mimeType,
  );

  console.log("\nAI-generated task:");
  console.log(description);
} catch (error) {
  console.error(
    "Inference failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
}
