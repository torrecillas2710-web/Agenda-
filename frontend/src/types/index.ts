export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Memory {
  id: number
  category: string
  key: string
  value: string
  source: string
  updated_at: string
}

export interface Task {
  id: number
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  category?: string
  due_date?: string
  created_at: string
}

export interface UserProfile {
  id: number
  name: string
  email?: string
  timezone: string
  language: string
  is_owner: boolean
  created_at: string
}

export type ActivePanel = 'chat' | 'memory' | 'tasks' | 'dashboard'
