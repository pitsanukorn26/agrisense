import { z } from "zod"

export const supportedCrops = ["durian", "sugarcane", "rice"] as const
export const spreadLevels = ["low", "medium", "high"] as const

export const referenceLinkSchema = z.object({
  label: z.string().min(2),
  url: z.string().url(),
})

export const diseaseInputSchema = z.object({
  crop: z.enum(supportedCrops),
  nameTh: z.string().min(2),
  nameEn: z.string().min(2).optional(),
  pathogenType: z.string().min(2).optional(),
  overview: z.string().min(5).optional(),
  symptoms: z.array(z.string().min(2)).min(1),
  causes: z.array(z.string().min(2)).min(1),
  triggers: z.array(z.string().min(2)).optional(),
  prevention: z.array(z.string().min(2)).optional(),
  treatment: z.array(z.string().min(2)).min(1),
  severity: z.number().int().min(1).max(5).optional(),
  spreadRisk: z.enum(spreadLevels).optional(),
  tags: z.array(z.string().min(2)).optional(),
  sources: z.array(referenceLinkSchema).optional(),
})

export type DiseaseInput = z.infer<typeof diseaseInputSchema>
