import axios from 'axios'
import type { Memory, Task, UserProfile } from '../types'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) ?? '',
})

export const chatAPI = {
  sendMessage: async (message: string, userId = 1) => {
    const res = await api.post('/api/chat/message', { message, user_id: userId })
    return res.data
  },
  getHistory: async (userId = 1, limit = 50) => {
    const res = await api.get(`/api/chat/history/${userId}?limit=${limit}`)
    return res.data
  },
  clearHistory: async (userId = 1) => {
    const res = await api.delete(`/api/chat/history/${userId}`)
    return res.data
  },
}

export const memoryAPI = {
  getAll: async (userId = 1): Promise<Memory[]> => {
    const res = await api.get(`/api/memory/${userId}`)
    return res.data
  },
  create: async (data: { category: string; key: string; value: string; user_id?: number }) => {
    const res = await api.post('/api/memory/', data)
    return res.data
  },
  delete: async (memoryId: number, userId = 1) => {
    const res = await api.delete(`/api/memory/${memoryId}/${userId}`)
    return res.data
  },
}

export const taskAPI = {
  getAll: async (userId = 1, status?: string): Promise<Task[]> => {
    const url = status ? `/api/tasks/${userId}?status=${status}` : `/api/tasks/${userId}`
    const res = await api.get(url)
    return res.data
  },
  create: async (data: {
    title: string
    description?: string
    priority?: string
    due_date?: string
    user_id?: number
    category?: string
  }) => {
    const res = await api.post('/api/tasks/', data)
    return res.data
  },
  updateStatus: async (taskId: number, status: string, userId = 1) => {
    const res = await api.patch(`/api/tasks/${taskId}/${userId}`, { status })
    return res.data
  },
}

export const profileAPI = {
  get: async (userId = 1): Promise<UserProfile> => {
    const res = await api.get(`/api/profile/${userId}`)
    return res.data
  },
  update: async (userId = 1, data: Partial<UserProfile>) => {
    const res = await api.patch(`/api/profile/${userId}`, data)
    return res.data
  },
}
