// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react"
import {
  getToken,
  setToken,
  clearToken,
  verifyToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
} from "../lib/api"

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      const token = getToken()
      if (!token) {
        console.log("No token found during auth initialization")
        if (isMounted) setLoading(false)
        return
      }

      const cachedUser = getStoredUser()
      if (cachedUser && isMounted) {
        setAuth({ token, user: cachedUser })
      }

      try {
        console.log("Verifying token during auth initialization")
        const { user } = await verifyToken()

        if (isMounted) {
          setStoredUser(user)
          setAuth({ token, user })
          setError(null)
        }
      } catch (err) {
        console.error("Auth initialization error:", err)
        if (err.status === 401 || err.status === 404) {
          clearToken()
          clearStoredUser()
          if (isMounted) setAuth(null)
        } else {
          if (isMounted) {
            setError(err.message)
            // Keep cached auth (if any) to avoid logging out on transient errors
            if (!cachedUser) {
              setAuth({ token, user: null })
            }
          }
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const login = (token, user) => {
    console.log("Logging in user:", user.email)
    setToken(token)
    setStoredUser(user)
    setAuth({ token, user })
    setError(null)
  }

  const logout = () => {
    console.log("Logging out user")
    clearToken()
    clearStoredUser()
    setAuth(null)
    setError(null)
  }

  const value = {
    auth,
    loading,
    error,
    login,
    logout,
    isAuthenticated: Boolean(auth?.token),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
