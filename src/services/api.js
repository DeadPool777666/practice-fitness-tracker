const API_ROOT = '/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('fittrack-token')
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${API_ROOT}${path}`, { ...options, headers })
  } catch {
    throw new Error('Не удалось связаться с сервером. Проверьте подключение и повторите попытку.')
  }
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || `Ошибка запроса (${response.status})`)
  }
  return response.status === 204 ? null : response.json()
}

export const authApi = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (profile) => request('/auth/register', { method: 'POST', body: JSON.stringify(profile) }),
  me: () => request('/auth/me'),
}

export const workoutsApi = {
  list: () => request('/workouts'),
  get: (id) => request(`/workouts/${encodeURIComponent(id)}`),
  create: (workout) => request('/workouts', { method: 'POST', body: JSON.stringify(workout) }),
  update: (id, workout) => request(`/workouts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(workout) }),
  remove: (id) => request(`/workouts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}