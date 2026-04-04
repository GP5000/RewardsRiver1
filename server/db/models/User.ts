import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "publisher" | "advertiser" | "admin";

export interface IUser extends Document {
  email: string;
  passwordHash?: string; // if using credentials auth
  role: UserRole;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: ["publisher", "advertiser", "admin"],
      required: true,
      default: "publisher",
      index: true,
    },
    name: { type: String },
  },
  { timestamps: true }
);

// ✅ Named export `User` – this is what `import { User } from "@/server/db/models/User"` expects
export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
