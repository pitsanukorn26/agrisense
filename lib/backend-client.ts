const { BACKEND_API_URL } = process.env

export const backendProxyEnabled = Boolean(BACKEND_API_URL)

async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BACKEND_API_URL) {
    throw new Error("BACKEND_API_URL is not set")
  }

  const url = `${BACKEND_API_URL.replace(/\/$/, "")}${path}`
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  const json = (await response.json().catch(() => ({}))) as any

  if (!response.ok) {
    const message = json?.error || `Backend request failed: ${response.status}`
    throw new Error(message)
  }

  return json as T
}

async function backendFetchForm<T>(path: string, formData: FormData): Promise<T> {
  if (!BACKEND_API_URL) {
    throw new Error("BACKEND_API_URL is not set")
  }
  const url = `${BACKEND_API_URL.replace(/\/$/, "")}${path}`
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  })

  const json = (await response.json().catch(() => ({}))) as any

  if (!response.ok) {
    const message = json?.error || `Backend request failed: ${response.status}`
    throw new Error(message)
  }

  return json as T
}

export const backend = {
  getScan: (id: string) => backendFetch<{ data: any }>(`/api/scans/${id}`),
  listScans: (query: string) =>
    backendFetch<{ data: any[] }>(`/api/scans${query ? `?${query}` : ""}`),
  createScan: (body: any) =>
    backendFetch<{ data: any }>(`/api/scans`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateScan: (id: string, body: any) =>
    backendFetch<{ data: any }>(`/api/scans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteScan: (id: string) => backendFetch(`/api/scans/${id}`, { method: "DELETE" }),
  completeScan: (id: string, body: any) =>
    backendFetch<{ data: any }>(`/api/scans/${id}/complete`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  health: () => backendFetch<{ ok: boolean; message?: string }>(`/api/health`),
  uploadAvatar: (formData: FormData) =>
    backendFetchForm<{ data: any; message?: string }>(`/api/profile/avatar`, formData),
}
