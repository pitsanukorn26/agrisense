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
    const error = new Error(message) as Error & { status?: number }
    error.status = response.status
    throw error
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
    const error = new Error(message) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  return json as T
}

export const backend = {
  login: (body: any) =>
    backendFetch<{ data: any }>(`/api/auth/login`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  register: (body: any) =>
    backendFetch<{ data: any }>(`/api/auth/register`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
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
  listAdminUsers: (query: string) =>
    backendFetch<{ data: any[] }>(`/api/admin/users${query ? `?${query}` : ""}`),
  updateAdminUserRole: (id: string, body: any) =>
    backendFetch<{ data: any }>(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  listAdminLogs: (query: string) =>
    backendFetch<{ data: any[] }>(`/api/admin/logs${query ? `?${query}` : ""}`),
  createAdminLog: (body: any) =>
    backendFetch<{ data: any }>(`/api/admin/logs`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listReports: (query: string) =>
    backendFetch<{ data: any[] }>(`/api/admin/reports${query ? `?${query}` : ""}`),
  updateReport: (id: string, body: any) =>
    backendFetch<{ data: any }>(`/api/admin/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createReport: (body: any) =>
    backendFetch<{ data: any }>(`/api/reports`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listDiseases: (query: string) =>
    backendFetch<{ data: any[] }>(`/api/diseases${query ? `?${query}` : ""}`),
  createDisease: (body: any) =>
    backendFetch<{ data: any }>(`/api/diseases`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getDisease: (id: string) => backendFetch<{ data: any }>(`/api/diseases/${id}`),
  updateDisease: (id: string, body: any) =>
    backendFetch<{ data: any }>(`/api/diseases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  health: () => backendFetch<{ ok: boolean; message?: string }>(`/api/health`),
  uploadAvatar: (formData: FormData) =>
    backendFetchForm<{ data: any; message?: string }>(`/api/profile/avatar`, formData),
}
