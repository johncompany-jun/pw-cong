// ローカル: /api (Vite プロキシ経由)
// 本番 (Cloudflare Pages): VITE_API_BASE_URL を設定 (例: https://pw-cong-api.xxx.workers.dev/api)
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

// API_BASE から末尾の /api を除いたベースURL（fetch直接呼び出しで ${API}/api/xxx と使われる箇所用）
export const API = API_BASE.replace(/\/api$/, '')

export function useApi() {
  function authHeaders(): HeadersInit {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(`${res.status}: ${data.error ?? 'エラーが発生しました'}`)
    }
    return data as T
  }

  async function postForm<T>(path: string, form: FormData): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: form,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(`${res.status}: ${(data as { error?: string }).error ?? 'エラーが発生しました'}`)
    return data as T
  }

  async function putForm<T>(path: string, form: FormData): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { ...authHeaders() },
      body: form,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(`${res.status}: ${(data as { error?: string }).error ?? 'エラーが発生しました'}`)
    return data as T
  }

  async function getBlob(path: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}${path}`, { headers: { ...authHeaders() } })
    if (!res.ok) throw new Error(`${res.status}: 取得に失敗しました`)
    return res.blob()
  }

  return {
    authHeaders,
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
    postForm,
    putForm,
    getBlob,
  }
}
