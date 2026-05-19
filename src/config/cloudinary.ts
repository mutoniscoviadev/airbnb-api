import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with env variables
cloudinary.config({
  cloud_name: process.env["CLOUDINARY_CLOUD_NAME"],
  api_key: process.env["CLOUDINARY_API_KEY"],
  api_secret: process.env["CLOUDINARY_API_SECRET"],
});

// Upload a file buffer to Cloudinary
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Upload failed"));
          return;
        }
        // Always use secure_url — HTTPS
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    // Write buffer to stream
    stream.end(buffer);
  });
};

// Delete a file from Cloudinary by publicId
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

// Get optimized URL with transformations
export const getOptimizedUrl = (
  url: string,
  width: number,
  height: number
): string => {
  // Insert transformation params into Cloudinary URL
  return url.replace(
    "/upload/",
    `/upload/w_${width},h_${height},c_fill,f_auto,q_auto/`
  );
};

export default cloudinary;