import imageCompression from "browser-image-compression";

// Compress a photo IN THE BROWSER before uploading. Festivals have terrible
// signal, so we shrink to ~0.5 MB / 1600px WebP first. next/image then
// serves an even smaller, screen-sized version on the way back down.
export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/webp",
  });
}
