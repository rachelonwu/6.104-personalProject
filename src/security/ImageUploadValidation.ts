
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Allow some extra space for multipart form headers and boundaries.
export const MAX_UPLOAD_BODY_SIZE = MAX_IMAGE_SIZE + 64 * 1024;

const SUPPORTED_IMAGES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export class ImageUploadError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export async function readLimitedUpload(
  request: Request,
): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    throw new ImageUploadError(
      "Expected a multipart image upload.",
    );
  }

  const contentLength = request.headers.get("content-length");

  if (contentLength !== null) {
    const length = Number(contentLength);

    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      length > MAX_UPLOAD_BODY_SIZE
    ) {
      throw new ImageUploadError(
        "Upload request is too large.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new ImageUploadError("Upload body is missing.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      total += value.byteLength;

      if (total > MAX_UPLOAD_BODY_SIZE) {
        await reader.cancel().catch(() => {});

        throw new ImageUploadError(
          "Upload request is too large.",
          413,
        );
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const boundedRequest = new Request(
      "http://localhost/upload",
      {
        method: "POST",
        headers: {
          "Content-Type": contentType,
        },
        body: bytes,
      },
    );

    return await boundedRequest.formData();
  } catch {
    throw new ImageUploadError(
      "Invalid multipart upload.",
    );
  }
}

function hasBytes(
  bytes: Uint8Array,
  offset: number,
  expected: number[],
): boolean {
  return expected.every(
    (value, index) => bytes[offset + index] === value,
  );
}

function hasAscii(
  bytes: Uint8Array,
  offset: number,
  text: string,
): boolean {
  return [...text].every(
    (character, index) =>
      bytes[offset + index] === character.charCodeAt(0),
  );
}

function validImageSignature(
  bytes: Uint8Array,
  mimeType: string,
): boolean {
  switch (mimeType) {
    case "image/png":
      return hasBytes(bytes, 0, [
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
      ]);

    case "image/jpeg":
      return hasBytes(bytes, 0, [
        0xff, 0xd8, 0xff,
      ]);

    case "image/gif":
      return (
        hasAscii(bytes, 0, "GIF87a") ||
        hasAscii(bytes, 0, "GIF89a")
      );

    case "image/webp":
      return (
        hasAscii(bytes, 0, "RIFF") &&
        hasAscii(bytes, 8, "WEBP")
      );

    default:
      return false;
  }
}

export async function validateUploadedImage(
  file: FormDataEntryValue | null,
): Promise<{ file: File; extension: string }> {
  if (!(file instanceof File)) {
    throw new ImageUploadError(
      "Please upload an image.",
    );
  }

  const extension = SUPPORTED_IMAGES[file.type];

  if (!extension) {
    throw new ImageUploadError(
      "Unsupported image format.",
    );
  }

  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    throw new ImageUploadError(
      "Image must be between 1 byte and 10 MB.",
    );
  }

  const header = new Uint8Array(
    await file.slice(0, 16).arrayBuffer(),
  );

  if (!validImageSignature(header, file.type)) {
    throw new ImageUploadError(
      "The file content does not match its image format.",
    );
  }

  return { file, extension };
}
