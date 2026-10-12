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
    const error = new Error(result.error || `Ошибка запроса (${response.status})`)
    error.status = response.status
    error.code = result.code
    throw error
  }
  return response.status === 204 ? null : response.json()
}

const json = (method, body) => ({ method, body: JSON.stringify(body) })
const id = (value) => encodeURIComponent(value)

export const authApi = {
  login: (credentials) => request('/auth/login', json('POST', credentials)),
  register: (profile) => request('/auth/register', json('POST', profile)),
  me: () => request('/auth/me'),
}

export const workoutsApi = {
  list: () => request('/workouts'),
  get: (workoutId) => request(`/workouts/${id(workoutId)}`),
  create: (workout) => request('/workouts', json('POST', workout)),
  update: (workoutId, workout) => request(`/workouts/${id(workoutId)}`, json('PUT', workout)),
  remove: (workoutId) => request(`/workouts/${id(workoutId)}`, { method: 'DELETE' }),
  share: (workoutId, shared) => request(`/workouts/${id(workoutId)}/share`, json('PUT', { shared })),
}

export const progressApi = {
  get: () => request('/progress'),
  notifications: () => request('/notifications'),
  readNotifications: () => request('/notifications/read', { method: 'POST' }),
}

export const goalsApi = {
  list: () => request('/goals'),
  create: (goal) => request('/goals', json('POST', goal)),
  update: (goalId, goal) => request(`/goals/${id(goalId)}`, json('PUT', goal)),
  remove: (goalId) => request(`/goals/${id(goalId)}`, { method: 'DELETE' }),
}

export const exercisesApi = {
  list: () => request('/exercises'),
  get: (exerciseId) => request(`/exercises/${id(exerciseId)}`),
  favorites: () => request('/favorites'),
  addFavorite: (exerciseId) => request('/favorites', json('POST', { exerciseId })),
  removeFavorite: (exerciseId) => request(`/favorites/${id(exerciseId)}`, { method: 'DELETE' }),
}

export const challengesApi = {
  list: () => request('/challenges'),
  join: (challengeId) => request(`/challenges/${id(challengeId)}/join`, { method: 'POST' }),
  leave: (challengeId) => request(`/challenges/${id(challengeId)}/join`, { method: 'DELETE' }),
}

export const planningApi = {
  templates: () => request('/templates'),
  createTemplate: (template) => request('/templates', json('POST', template)),
  updateTemplate: (templateId, template) => request(`/templates/${id(templateId)}`, json('PUT', template)),
  removeTemplate: (templateId) => request(`/templates/${id(templateId)}`, { method: 'DELETE' }),
  planner: () => request('/planner'),
  setDay: (weekday, plan) => request(`/planner/${weekday}`, json('PUT', plan)),
  clearDay: (weekday) => request(`/planner/${weekday}`, { method: 'DELETE' }),
}

export const socialApi = {
  searchUsers: (query) => request(`/users?q=${encodeURIComponent(query)}`),
  profile: (userId) => request(`/users/${id(userId)}`),
  friends: () => request('/friends'),
  addFriend: (userId) => request('/friends', json('POST', { userId })),
  removeFriend: (userId) => request(`/friends/${id(userId)}`, { method: 'DELETE' }),
  sharedWorkout: (workoutId) => request(`/public/workouts/${id(workoutId)}`),
}

export const accountApi = {
  update: (data) => request('/me', json('PUT', data)),
  changePassword: (data) => request('/me/password', json('POST', data)),
  billing: () => request('/billing'),
  subscribe: (plan) => request('/billing/subscribe', json('POST', { plan })),
  cancel: () => request('/billing/cancel', { method: 'POST' }),
}

export const adminApi = {
  stats: () => request('/admin/stats'),
  users: () => request('/admin/users'),
  updateUser: (userId, data) => request(`/admin/users/${id(userId)}`, json('PATCH', data)),
  workouts: () => request('/admin/workouts'),
  createExercise: (data) => request('/admin/exercises', json('POST', data)),
  updateExercise: (exerciseId, data) => request(`/admin/exercises/${id(exerciseId)}`, json('PUT', data)),
  removeExercise: (exerciseId) => request(`/admin/exercises/${id(exerciseId)}`, { method: 'DELETE' }),
  createChallenge: (data) => request('/admin/challenges', json('POST', data)),
  updateChallenge: (challengeId, data) => request(`/admin/challenges/${id(challengeId)}`, json('PUT', data)),
  removeChallenge: (challengeId) => request(`/admin/challenges/${id(challengeId)}`, { method: 'DELETE' }),
}
