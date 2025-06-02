import axios, { AxiosInstance, AxiosResponse } from 'axios'
import type {
  TranscriptionTask,
  TranscriptionRequest,
  ApiResponse,
  PaginatedResponse,
  TaskListParams,
  SupportedLanguage,
  SupportedFormat,
  TranscriptionStats,
  SystemStats,
  Channel,
  EngineType,
  User
} from '@/types/transcription'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 从localStorage获取token
        const token = localStorage.getItem('access_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token过期，清除本地存储并跳转到登录页
          localStorage.removeItem('access_token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // 转录任务相关API
  async createTranscriptionTask(request: TranscriptionRequest): Promise<TranscriptionTask> {
    const formData = new FormData()
    formData.append('file', request.file)
    
    if (request.language) formData.append('language', request.language)
    if (request.model_name) formData.append('model_name', request.model_name)
    if (request.enable_timestamps !== undefined) {
      formData.append('enable_timestamps', request.enable_timestamps.toString())
    }
    if (request.enable_speaker !== undefined) {
      formData.append('enable_speaker', request.enable_speaker.toString())
    }
    if (request.output_format) formData.append('output_format', request.output_format)
    if (request.quality) formData.append('quality', request.quality)
    if (request.priority !== undefined) formData.append('priority', request.priority.toString())
    if (request.duration !== undefined) formData.append('duration', request.duration.toString())

    const response = await this.client.post<ApiResponse<TranscriptionTask>>(
      '/user/self/transcription/tasks',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async getTranscriptionTasks(params: TaskListParams = {}): Promise<PaginatedResponse<TranscriptionTask>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<TranscriptionTask>>>(
      '/user/self/transcription/tasks',
      { params }
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async getTranscriptionTask(id: number): Promise<TranscriptionTask> {
    const response = await this.client.get<ApiResponse<TranscriptionTask>>(
      `/user/self/transcription/tasks/${id}`
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async cancelTranscriptionTask(id: number): Promise<void> {
    const response = await this.client.put<ApiResponse>(
      `/user/self/transcription/tasks/${id}/cancel`
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
  }

  async deleteTranscriptionTask(id: number): Promise<void> {
    const response = await this.client.delete<ApiResponse>(
      `/user/self/transcription/tasks/${id}`
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
  }

  async downloadTranscriptionResult(id: number): Promise<Blob> {
    const response = await this.client.get(
      `/user/self/transcription/tasks/${id}/download`,
      {
        responseType: 'blob',
      }
    )

    return response.data
  }

  async previewTranscriptionResult(id: number): Promise<string> {
    const response = await this.client.get<string>(
      `/user/self/transcription/tasks/${id}/preview`,
      {
        responseType: 'text',
      }
    )

    return response.data
  }

  async getUserTranscriptionStats(): Promise<TranscriptionStats> {
    const response = await this.client.get<ApiResponse<TranscriptionStats>>(
      '/user/self/transcription/stats'
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  // 公共API
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    const response = await this.client.get<ApiResponse<SupportedLanguage[]>>(
      '/transcription/languages'
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async getSupportedFormats(): Promise<SupportedFormat[]> {
    const response = await this.client.get<ApiResponse<SupportedFormat[]>>(
      '/transcription/formats'
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  // 管理员API
  async getAllTranscriptionTasks(params: TaskListParams & { username?: string } = {}): Promise<PaginatedResponse<TranscriptionTask>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<TranscriptionTask>>>(
      '/transcription/tasks',
      { params }
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async getSystemTranscriptionStats(): Promise<SystemStats> {
    const response = await this.client.get<ApiResponse<SystemStats>>(
      '/transcription/stats'
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async getTranscriptionEngines(): Promise<Channel[]> {
    const response = await this.client.get<ApiResponse<Channel[]>>(
      '/transcription/engines'
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async getTranscriptionEngineTypes(): Promise<EngineType[]> {
    const response = await this.client.get<ApiResponse<EngineType[]>>(
      '/transcription/engines/types'
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async createTranscriptionEngine(engine: Partial<Channel>): Promise<Channel> {
    const response = await this.client.post<ApiResponse<Channel>>(
      '/transcription/engines',
      engine
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async updateTranscriptionEngine(id: number, engine: Partial<Channel>): Promise<Channel> {
    const response = await this.client.put<ApiResponse<Channel>>(
      `/transcription/engines/${id}`,
      engine
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async deleteTranscriptionEngine(id: number): Promise<void> {
    const response = await this.client.delete<ApiResponse>(
      `/transcription/engines/${id}`
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
  }

  async testTranscriptionEngine(id: number): Promise<void> {
    const response = await this.client.post<ApiResponse>(
      `/transcription/engines/${id}/test`
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
  }

  // 认证相关API
  async login(credentials: { username: string; password: string }): Promise<ApiResponse<{ access_token?: string }>> {
    const response = await this.client.post<ApiResponse<{ access_token?: string }>>(
      '/user/login',
      credentials
    )
    return response.data
  }

  async register(userData: {
    username: string;
    password: string;
    email?: string;
    verification_code?: string
  }): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/user/register', userData)
    return response.data
  }

  async logout(): Promise<void> {
    await this.client.get('/user/logout')
    localStorage.removeItem('access_token')
  }

  async sendVerificationCode(email: string): Promise<ApiResponse> {
    const response = await this.client.get<ApiResponse>(`/verification?email=${encodeURIComponent(email)}`)
    return response.data
  }

  // 用户相关API
  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<ApiResponse<User>>('/user/self')

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    const response = await this.client.put<ApiResponse<User>>('/user/self', userData)

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  // 充值相关API
  async topUpWithCode(code: string): Promise<ApiResponse<{ quota: number; is_gift: boolean }>> {
    const response = await this.client.post<ApiResponse<{ quota: number; is_gift: boolean }>>(
      '/user/topup',
      { key: code }
    )
    return response.data
  }

  async requestPayment(amount: number, paymentMethod: string): Promise<ApiResponse<{ url: string; params: any }>> {
    const response = await this.client.post<ApiResponse<{ url: string; params: any }>>(
      '/user/pay',
      { amount, payment_method: paymentMethod }
    )
    return response.data
  }

  async getPaymentAmount(amount: number): Promise<ApiResponse<string>> {
    const response = await this.client.post<ApiResponse<string>>(
      '/user/amount',
      { amount }
    )
    return response.data
  }

  async generateAccessToken(): Promise<ApiResponse<{ access_token: string }>> {
    const response = await this.client.get<ApiResponse<{ access_token: string }>>('/user/token')
    return response.data
  }

  // 管理员用户管理API
  async getAllUsers(params: { page?: number; page_size?: number; keyword?: string } = {}): Promise<PaginatedResponse<User>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<User>>>(
      '/users',
      { params }
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async getUserById(id: number): Promise<User> {
    const response = await this.client.get<ApiResponse<User>>(`/users/${id}`)

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    const response = await this.client.put<ApiResponse<User>>(`/users/${id}`, user)

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data!
  }

  async deleteUser(id: number): Promise<void> {
    const response = await this.client.delete<ApiResponse>(`/users/${id}`)

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
  }
}

export const apiClient = new ApiClient()
export default apiClient
