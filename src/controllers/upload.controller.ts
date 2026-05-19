import { Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary";
import { AuthRequest } from "../middlewares/auth.middleware";

// POST /users/:id/avatar - Upload profile picture
export const uploadAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt — id is now a string UUID
    const id = req.params.id;

    if (req.userId !== id) {
      res.status(403).json({ message: "You can only update your own avatar" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId);
    }

    const { url, publicId } = await uploadToCloudinary(
      req.file.buffer,
      "airbnb/avatars"
    );

    const updated = await prisma.user.update({
      where: { id },
      data: { avatar: url, avatarPublicId: publicId },
    });

    const { password: _, ...userWithoutPassword } = updated;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

// DELETE /users/:id/avatar - Remove profile picture
export const deleteAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id;

    if (req.userId !== id) {
      res.status(403).json({ message: "You can only delete your own avatar" });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.avatar) {
      res.status(400).json({ message: "No avatar to remove" });
      return;
    }

    await deleteFromCloudinary(user.avatarPublicId!);

    await prisma.user.update({
      where: { id },
      data: { avatar: null, avatarPublicId: null },
    });

    res.status(200).json({ message: "Avatar removed successfully" });
  } catch (error) {
    next(error);
  }
};

// POST /listings/:id/photos - Upload listing photos
export const uploadListingPhotos = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id;

    const listing = await prisma.listing.findFirst({ where: { id } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId) {
      res.status(403).json({ message: "You can only upload photos to your own listings" });
      return;
    }

    const existingCount = await prisma.listingPhoto.count({
      where: { listingId: id },
    });

    if (existingCount >= 5) {
      res.status(400).json({ message: "Maximum of 5 photos allowed per listing" });
      return;
    }

    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      res.status(400).json({ message: "No files uploaded" });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const remainingSlots = 5 - existingCount;
    const filesToProcess = files.slice(0, remainingSlots);

    const uploadPromises = filesToProcess.map(async (file) => {
      const { url, publicId } = await uploadToCloudinary(
        file.buffer,
        "airbnb/listings"
      );
      return prisma.listingPhoto.create({
        data: { url, publicId, listingId: id },
      });
    });

    await Promise.all(uploadPromises);

    const updatedListing = await prisma.listing.findUnique({
      where: { id },
      include: {
        photos: true,
        host: { select: { name: true, avatar: true } },
      },
    });

    res.status(200).json(updatedListing);
  } catch (error) {
    next(error);
  }
};

// DELETE /listings/:id/photos/:photoId - Delete a listing photo
export const deleteListingPhoto = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id;
    const photoId = req.params.photoId;

    const listing = await prisma.listing.findFirst({ where: { id } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId) {
      res.status(403).json({ message: "You can only delete photos from your own listings" });
      return;
    }

    const photo = await prisma.listingPhoto.findFirst({ where: { id: photoId } });
    if (!photo) {
      res.status(404).json({ message: "Photo not found" });
      return;
    }

    if (photo.listingId !== id) {
      res.status(403).json({ message: "Photo does not belong to this listing" });
      return;
    }

    await deleteFromCloudinary(photo.publicId);
    await prisma.listingPhoto.delete({ where: { id: photoId } });
    res.status(200).json({ message: "Photo deleted successfully" });
  } catch (error) {
    next(error);
  }
};