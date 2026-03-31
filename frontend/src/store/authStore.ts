import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

interface User {
  id: number; username: string; email: string;
  first_name: string; last_name: string; role: string;
  organization_name?: string;
}

interface AuthState {
  user: User | null; token: string | null; refresh: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, token: null, refresh: null,
      isAuthenticated: () => !!get().token,
      login: async (username, password) => {
        const res = await api.post('/auth/login/', { username, password })
        const { access, refresh, user } = res.data
        set({ token: access, refresh, user })
        api.defaults.headers.common['Authorization'] = `Bearer ${access}`
      },
      logout: () => {
        set({ user: null, token: null, refresh: null })
        delete api.defaults.headers.common['Authorization']
      },
    }),
    { name: 'nexus-books-auth' }
  )
)
