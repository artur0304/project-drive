import * as fs from "fs";
import * as path from "path";

const MAX_OUTPUT_BYTES = 30 * 1024 * 1024;
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Сохраняет base64, временную URL или локальный файл рядом с отчётом. */
export async function persistOutputArtifact(outputImage: string, outDir: string, renderId: string): Promise<string> {
  const imagesDir = path.join(outDir, "images");
  fs.mkdirSync(imagesDir, { recursive: true });

  if (outputImage.startsWith("data:")) {
    const match = /^data:([^;]+);base64,(.*)$/s.exec(outputImage);
    if (!match) throw new Error(`Invalid data URL for ${renderId}`);
    const extension = EXTENSION_BY_MIME[match[1].toLowerCase()];
    if (!extension) throw new Error(`Unsupported output image type for ${renderId}: ${match[1]}`);
    const bytes = Buffer.from(match[2], "base64");
    ensureSize(bytes.length, renderId);
    return writeArtifact(bytes, imagesDir, renderId, extension, outDir);
  }

  if (outputImage.startsWith("https://") || outputImage.startsWith("http://")) {
    const response = await fetch(outputImage, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Could not download ${renderId}: HTTP ${response.status}`);
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > MAX_OUTPUT_BYTES) throw new Error(`Output image is larger than 30 MB: ${renderId}`);
    const mime = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const extension = EXTENSION_BY_MIME[mime];
    if (!extension) throw new Error(`Unsupported downloaded image type for ${renderId}: ${mime || "unknown"}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    ensureSize(bytes.length, renderId);
    return writeArtifact(bytes, imagesDir, renderId, extension, outDir);
  }

  if (fs.existsSync(outputImage) && fs.statSync(outputImage).isFile()) {
    const bytes = fs.readFileSync(outputImage);
    ensureSize(bytes.length, renderId);
    return writeArtifact(bytes, imagesDir, renderId, extensionFromPath(outputImage), outDir);
  }

  // Mock demo использует demo:// и не содержит реального изображения.
  return outputImage;
}

function writeArtifact(bytes: Buffer, imagesDir: string, renderId: string, extension: string, outDir: string): string {
  const safeId = renderId.replace(/[^a-z0-9_-]/gi, "-");
  const file = path.join(imagesDir, `${safeId}.${extension}`);
  fs.writeFileSync(file, bytes);
  return path.relative(outDir, file).split(path.sep).join("/");
}

function ensureSize(bytes: number, renderId: string) {
  if (bytes <= 0) throw new Error(`Output image is empty: ${renderId}`);
  if (bytes > MAX_OUTPUT_BYTES) throw new Error(`Output image is larger than 30 MB: ${renderId}`);
}

function extensionFromPath(file: string): string {
  const extension = path.extname(file).slice(1).toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) return extension === "jpeg" ? "jpg" : extension;
  throw new Error(`Unsupported local output image type: ${extension || "unknown"}`);
}
