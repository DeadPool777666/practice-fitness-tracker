import { useEffect, useState } from 'react'
import { AuthContext } from './authContext.js'
import { authApi } from '../services/api.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('fittrack-token')))

  useEffect(() => {
    if (!localStorage.getItem('fittrack-token')) return
    authApi.me()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => localStorage.removeItem('fittrack-token'))
      .finally(() => setLoading(false))
  }, [])

  async function authenticate(method, data) {
    const result = await authApi[method](data)
    localStorage.setItem('fittrack-token', result.token)
    setUser(result.user)
    return result.user
  }

  function logout() {
    localStorage.removeItem('fittrack-token')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login: (data) => authenticate('login', data), register: (data) => authenticate('register', data), logout }}>{children}</AuthContext.Provider>
}