import { S3Client } from "bun";
import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const UPLOAD_DIRECTORY = join(process.cwd(), "uploads");

const useS3 = process.env.NODE_ENV === "production";
const s3 = useS3 ? new S3Client() : null;

function storageKey(filename: string): string {
  return `uploads/${filename}`;
}

export async function saveScreenshot(
  filename: string,
  image: Blob,
): Promise<void> {
  if (s3) {
    await s3.write(storageKey(filename), image);
    return;
  }

  await mkdir(UPLOAD_DIRECTORY, { recursive: true });
  await Bun.write(join(UPLOAD_DIRECTORY, filename), image);
}

export async function readScreenshot(
  filename: string,
): Promise<Uint8Array | null> {
  if (s3) {
    const file = s3.file(storageKey(filename));

    if (!(await file.exists())) {
      return null;
    }

    return new Uint8Array(await file.arrayBuffer());
  }

  const file = Bun.file(join(UPLOAD_DIRECTORY, filename));

  if (!(await file.exists())) {
    return null;
  }

  return new Uint8Array(await file.arrayBuffer());
}

export async function deleteScreenshot(
  filename: string,
): Promise<void> {
  if (s3) {
    await s3.delete(storageKey(filename));
    return;
  }

  await unlink(join(UPLOAD_DIRECTORY, filename)).catch(() => {});
}
