const { ATLAS_DATA_API_URL, ATLAS_DATA_API_KEY, ATLAS_DATA_SOURCE, ATLAS_DB } = process.env

const baseUrl = ATLAS_DATA_API_URL?.replace(/\/$/, "")

export const dataApiEnabled = Boolean(
  baseUrl && ATLAS_DATA_API_KEY && ATLAS_DATA_SOURCE && ATLAS_DB,
)

type ObjectIdFilter = { $oid: string }

type DataApiResponse<T> = {
  document?: T | null
  documents?: T[]
  matchedCount?: number
  modifiedCount?: number
  deletedCount?: number
  insertedId?: string
  error?: string
}

function buildPayload(payload: Record<string, unknown>) {
  return {
    dataSource: ATLAS_DATA_SOURCE,
    database: ATLAS_DB,
    ...payload,
  }
}

async function dataApiCall<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  if (!dataApiEnabled) {
    throw new Error("MongoDB Data API is not configured")
  }

  const response = await fetch(`${baseUrl}/action/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": ATLAS_DATA_API_KEY ?? "",
    },
    body: JSON.stringify(buildPayload(payload)),
  })

  const json = (await response.json()) as DataApiResponse<T>

  if (!response.ok || json.error) {
    const message =
      json.error || `MongoDB Data API ${action} failed with status ${response.status}`
    throw new Error(message)
  }

  return json as T
}

export const toObjectId = (id: string): ObjectIdFilter => ({ $oid: id })

export async function dataApiFindOne<T>(collection: string, filter: unknown) {
  const result = await dataApiCall<DataApiResponse<T>>("findOne", {
    collection,
    filter,
  })
  return result.document ?? null
}

export async function dataApiFindOneAndUpdate<T>(
  collection: string,
  filter: unknown,
  update: unknown,
  options?: Record<string, unknown>,
) {
  const result = await dataApiCall<DataApiResponse<T>>("findOneAndUpdate", {
    collection,
    filter,
    update,
    returnDocument: "after",
    ...options,
  })
  return result.document ?? null
}

export async function dataApiFindOneAndDelete<T>(collection: string, filter: unknown) {
  const result = await dataApiCall<DataApiResponse<T>>("findOneAndDelete", {
    collection,
    filter,
  })
  return result.document ?? null
}
