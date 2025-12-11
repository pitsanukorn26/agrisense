import { Schema, model, models, type InferSchemaType } from "mongoose"

const referenceSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const diseaseProfileSchema = new Schema(
  {
    crop: {
      type: String,
      required: true,
      enum: ["durian", "sugarcane", "rice"],
    },
    commonNameTh: { type: String, required: true, trim: true },
    commonNameEn: { type: String, trim: true },
    pathogenType: { type: String, trim: true },
    overview: { type: String, trim: true },
    symptoms: { type: [String], default: [] },
    causes: { type: [String], default: [] },
    triggers: { type: [String], default: [] },
    prevention: { type: [String], default: [] },
    treatment: { type: [String], default: [] },
    severity: { type: Number, min: 1, max: 5, default: 3 },
    spreadRisk: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    sources: { type: [referenceSchema], default: [] },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
)

diseaseProfileSchema.index({ crop: 1, commonNameTh: 1 }, { unique: true })
diseaseProfileSchema.index({
  commonNameTh: "text",
  commonNameEn: "text",
  overview: "text",
  symptoms: "text",
  causes: "text",
  tags: "text",
})

export type DiseaseProfileDocument = InferSchemaType<typeof diseaseProfileSchema>

export const DiseaseProfileModel =
  models.DiseaseProfile || model("DiseaseProfile", diseaseProfileSchema)
