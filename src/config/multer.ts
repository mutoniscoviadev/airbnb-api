import multer from "multer";

const upload = multer({
  // Store files as Buffers in RAM — no disk writes needed
  storage: multer.memoryStorage(),

  // Only accept image files
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedMimeTypes.includes(file.mimetype)) {
      // Accept file
      cb(null, true);
    } else {
      // Reject file
      cb(new Error("Only jpeg, png, webp images are allowed"));
    }
  },

  // 5MB max file size
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;