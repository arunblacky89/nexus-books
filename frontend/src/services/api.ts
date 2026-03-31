import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token from storage on startup
const stored = localStorage.getItem('nexus-books-auth')
if (stored) {
  const { state } = JSON.parse(stored)
  if (state?.token) api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
}

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('nexus-books-auth')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
