import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose"

const diseaseSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    commonName: {
      type: String,
      required: true,
      trim: true,
    },
    scientificName: {
      type: String,
      trim: true,
    },
    crop: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    causes: {
      type: [String],
      default: [],
    },
    treatments: {
      type: [String],
      default: [],
    },
    prevention: {
      type: [String],
      default: [],
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    references: {
      type: [
        new Schema(
          {
            title: { type: String },
            url: { type: String },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    modelHints: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
)

diseaseSchema.index({ crop: 1, commonName: 1 })
diseaseSchema.index({ tags: 1 })

export type Disease = InferSchemaType<typeof diseaseSchema>
export type DiseaseDocument = HydratedDocument<Disease>

export const DiseaseModel: Model<Disease> =
  (models.Disease as Model<Disease>) || model<Disease>("Disease", diseaseSchema)
