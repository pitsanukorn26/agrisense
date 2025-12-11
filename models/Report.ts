import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose"

const reportSchema = new Schema(
  {
    scan: { type: Schema.Types.ObjectId, ref: "Scan", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, required: true, trim: true, maxlength: 400 },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
      index: true,
    },
    resolutionNote: { type: String, trim: true },
    resolvedAt: { type: Date },
  },
  {
    timestamps: true,
  },
)

export type Report = InferSchemaType<typeof reportSchema>
export type ReportDocument = HydratedDocument<Report>

export const ReportModel: Model<Report> =
  (models.Report as Model<Report>) || model<Report>("Report", reportSchema)
