import { Schema, model, models, type HydratedDocument, type InferSchemaType, type Model } from "mongoose"

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["farmer", "expert", "admin"],
      default: "farmer",
    },
    organization: {
      type: String,
      trim: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

export type User = InferSchemaType<typeof userSchema>
export type UserDocument = HydratedDocument<User>

export const UserModel: Model<User> =
  (models.User as Model<User>) || model<User>("User", userSchema)
