
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const SUPPORTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function prepareImageForUpload(file) {
  if (!(file instanceof File)) {
    throw new Error("Please select an image.");
  }

  const isAppleImage =
    /\.(heic|heif)$/i.test(file.name) ||
    ["image/heic", "image/heif"].includes(file.type);

  if (isAppleImage) {
    let converted;

    try {
      // Load the converter only when an Apple image is selected.
      const { default: heic2any } = await import("heic2any");

      const result = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });

      converted = Array.isArray(result) ? result[0] : result;
    } catch (err) {
        console.error("HEIC/HEIF conversion failed:", err);

        throw new Error(
            "This Apple image could not be converted. Try exporting it as JPEG or PNG."
        );
    }

    if (!converted) {
      throw new Error("Image conversion produced no output.");
    }

    const filename = file.name.replace(/\.(heic|heif)$/i, "");

    file = new File(
      [converted],
      `${filename}.jpg`,
      { type: "image/jpeg" }
    );
  }

  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error(
      "Please select a PNG, JPEG, WebP, GIF, HEIC, or HEIF image."
    );
  }

  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    throw new Error("Images must be between 1 byte and 10 MB.");
  }

  return file;
}
