// src/api.ts
const BASE = 'http://localhost:8000'

async function req(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  login:          (u: string, p: string)   => req('POST', '/api/auth/login', { username: u, password: p }),
  dashboard:      ()                        => req('GET',  '/api/dashboard'),
  nurses:         (ward?: string, q?: string) => req('GET', `/api/nurses?${ward?`ward=${ward}`:''}${q?`&search=${q}`:''}`),
  addNurse:       (data: unknown)           => req('POST', '/api/nurses', data),
  uploadNurses:   (file: File) => {
    const form = new FormData(); form.append('file', file)
    return fetch(`${BASE}/api/nurses/upload`, { method: 'POST', body: form }).then(r => r.json())
  },
  schedule:       (ward?: string, week = 0) => req('GET', `/api/schedule?week=${week}${ward?`&ward=${ward}`:''}`),
  generate:       (gens: number, pop: number, days: number) =>
                    req('POST', '/api/schedule/generate', { generations: gens, pop_size: pop, days }),
  assignShift:    (nurse_id: string, day_index: number, shift: string) =>
                    req('POST', '/api/schedule/assign', { nurse_id, day_index, shift }),
  fatigue:        ()                        => req('GET',  '/api/fatigue'),
  reports:        ()                        => req('GET',  '/api/reports/summary'),
  settings:       ()                        => req('GET',  '/api/settings'),
  saveSettings:   (data: unknown)           => req('PUT',  '/api/settings', data),
  modelStatus:    ()                        => req('GET',  '/api/model/status'),
}