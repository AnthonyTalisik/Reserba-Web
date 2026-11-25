import { createContext, useContext, useState } from 'react'
import * as store from '../data/mockStore.js'
import { useStore } from '../hooks/useStore.js'

const KEY = 'reserba_uid'
const AuthContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  useStore()
  const [uid, setUid] = useState(() => {
    try { return sessionStorage.getItem(KEY) } catch { return null }
  })
  const user = uid ? store.userById(uid) || null : null

  function login(email, password) {
    const result = store.login(email, password)
    if (result.user) {
      try { sessionStorage.setItem(KEY, result.user.uid) } catch { /* ignore */ }
      setUid(result.user.uid)
    }
    return result
  }

  function logout() {
    try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
    setUid(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}
