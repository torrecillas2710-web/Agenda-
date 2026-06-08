import { create } from 'zustand'
import type { Message, Memory, Task, UserProfile, ActivePanel } from '../types'
import { chatAPI, memoryAPI, taskAPI, profileAPI } from '../services/api'

interface JarvisStore {
  isOnline: boolean
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  messages: Message[]
  memories: Memory[]
  tasks: Task[]
  profile: UserProfile | null
  activePanel: ActivePanel
  tokensUsed: number
  error: string | null

  setListening: (v: boolean) => void
  setSpeaking: (v: boolean) => void
  setActivePanel: (p: ActivePanel) => void
  setError: (e: string | null) => void

  sendMessage: (content: string) => Promise<string>
  loadHistory: () => Promise<void>
  loadMemories: () => Promise<void>
  loadTasks: () => Promise<void>
  loadProfile: () => Promise<void>
  deleteMemory: (id: number) => Promise<void>
  addMemory: (category: string, key: string, value: string) => Promise<void>
  updateTaskStatus: (taskId: number, status: string) => Promise<void>
  createTask: (data: { title: string; description?: string; priority?: string; due_date?: string }) => Promise<void>
  initialize: () => Promise<void>
}

export const useJarvisStore = create<JarvisStore>((set, get) => ({
  isOnline: false,
  isListening: false,
  isSpeaking: false,
  isProcessing: false,
  messages: [],
  memories: [],
  tasks: [],
  profile: null,
  activePanel: 'chat',
  tokensUsed: 0,
  error: null,

  setListening: (v) => set({ isListening: v }),
  setSpeaking: (v) => set({ isSpeaking: v }),
  setActivePanel: (p) => set({ activePanel: p }),
  setError: (e) => set({ error: e }),

  sendMessage: async (content: string) => {
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    set((s) => ({ messages: [...s.messages, userMsg], isProcessing: true, error: null }))

    try {
      const data = await chatAPI.sendMessage(content)
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: data.timestamp,
      }
      set((s) => ({
        messages: [...s.messages, assistantMsg],
        isProcessing: false,
        tokensUsed: s.tokensUsed + (data.tokens_used || 0),
      }))
      if (data.memory_updates_count > 0) await get().loadMemories()
      if (data.tasks_created_count > 0) await get().loadTasks()
      return data.response
    } catch (err: any) {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Error de conexión con el servidor JARVIS. Verifica que el backend esté activo.\n\n\`${err?.message || 'Error desconocido'}\``,
        timestamp: new Date().toISOString(),
      }
      set((s) => ({ messages: [...s.messages, errMsg], isProcessing: false }))
      return errMsg.content
    }
  },

  loadHistory: async () => {
    try {
      const history = await chatAPI.getHistory()
      const messages: Message[] = history.map((m: any, i: number) => ({
        id: `h-${i}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }))
      set({ messages })
    } catch {}
  },

  loadMemories: async () => {
    try {
      const memories = await memoryAPI.getAll()
      set({ memories })
    } catch {}
  },

  loadTasks: async () => {
    try {
      const tasks = await taskAPI.getAll()
      set({ tasks })
    } catch {}
  },

  loadProfile: async () => {
    try {
      const profile = await profileAPI.get()
      set({ profile })
    } catch {}
  },

  deleteMemory: async (id: number) => {
    await memoryAPI.delete(id)
    await get().loadMemories()
  },

  addMemory: async (category, key, value) => {
    await memoryAPI.create({ category, key, value })
    await get().loadMemories()
  },

  updateTaskStatus: async (taskId, status) => {
    await taskAPI.updateStatus(taskId, status)
    await get().loadTasks()
  },

  createTask: async (data) => {
    await taskAPI.create(data)
    await get().loadTasks()
  },

  initialize: async () => {
    try {
      await Promise.all([
        get().loadProfile(),
        get().loadHistory(),
        get().loadMemories(),
        get().loadTasks(),
      ])
      set({ isOnline: true })
    } catch {
      set({ isOnline: false })
    }
  },
}))
