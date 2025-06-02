// 转录任务状态
export type TaskStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled'

// 输出格式
export type OutputFormat = 'json' | 'srt' | 'txt' | 'vtt'

// 质量等级
export type QualityLevel = 'low' | 'medium' | 'high'

// 优先级
export type Priority = 1 | 2 | 3 | 4

// 转录任务
export interface TranscriptionTask {
  id: number
  user_id: number
  token_id?: number
  channel_id: number
  
  // 文件信息
  original_filename: string
  file_path: string
  file_size: number
  file_type: string
  duration?: number
  
  // 转录配置
  language: string
  model_name: string
  enable_timestamps: boolean
  enable_speaker: boolean
  output_format: OutputFormat
  quality: QualityLevel
  priority: Priority
  
  // 任务状态
  status: TaskStatus
  progress: number
  error_message?: string
  error_code?: string
  
  // 结果信息
  result_text?: string
  result_file_path?: string
  confidence_score?: number
  detected_language?: string
  
  // 计费信息
  quota_cost: number
  billing_duration?: number
  billing_type: string
  
  // 时间戳
  created_at: string
  started_at?: string
  completed_at?: string
  updated_at: string
  
  // 关联信息
  user?: User
  token?: Token
  channel?: Channel
  files?: FileStorage[]
}

// 用户信息
export interface User {
  id: number
  username: string
  email?: string
  display_name?: string
  role: number
  status: number
  quota: number
  used_quota: number
  request_count: number
  group: string
  access_token?: string
  created_time: number
  updated_time: number
}

// Token信息
export interface Token {
  id: number
  user_id: number
  key: string
  name: string
  status: number
  quota: number
  used_quota: number
  unlimited_quota: boolean
  expired_time: number
  created_time: number
  accessed_time: number
}

// 渠道/引擎信息
export interface Channel {
  id: number
  name: string
  type: number
  engine_type: number
  key: string
  base_url?: string
  max_file_size: number
  max_duration: number
  supported_formats: string
  supported_languages: string
  weight?: number
  status: number
  group: string
  created_time: number
}

// 文件存储
export interface FileStorage {
  id: number
  user_id: number
  task_id?: number
  file_type: string
  original_name: string
  stored_name: string
  file_path: string
  file_size: number
  mime_type?: string
  expires_at?: string
  created_at: string
}

// 转录请求参数
export interface TranscriptionRequest {
  file: File
  language?: string
  model_name?: string
  enable_timestamps?: boolean
  enable_speaker?: boolean
  output_format?: OutputFormat
  quality?: QualityLevel
  priority?: Priority
  duration?: number
}

// API响应格式
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  code?: string
}

// 分页响应
export interface PaginatedResponse<T> {
  tasks: T[]
  total: number
  page: number
  page_size: number
}

// 任务列表查询参数
export interface TaskListParams {
  page?: number
  page_size?: number
  status?: TaskStatus
}

// 支持的语言
export interface SupportedLanguage {
  code: string
  name: string
}

// 支持的格式
export interface SupportedFormat {
  extension: string
  mime_type: string
  category: 'audio' | 'video'
}

// 转录统计
export interface TranscriptionStats {
  total_tasks: number
  completed_tasks: number
  failed_tasks: number
  processing_tasks: number
  total_duration: number
  total_file_size: number
  total_quota_cost: number
}

// 系统统计（管理员）
export interface SystemStats {
  total_tasks: number
  total_users: number
  total_duration: number
  total_file_size: number
  today_tasks: number
  today_duration: number
}

// 转录引擎类型
export interface EngineType {
  id: number
  name: string
  description?: string
}

// 错误代码
export const ERROR_CODES = {
  FILE_NOT_SUPPORTED: 'FILE_NOT_SUPPORTED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  DURATION_TOO_LONG: 'DURATION_TOO_LONG',
  INSUFFICIENT_QUOTA: 'INSUFFICIENT_QUOTA',
  ENGINE_UNAVAILABLE: 'ENGINE_UNAVAILABLE',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  INVALID_FORMAT: 'INVALID_FORMAT',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
} as const

// 错误消息映射
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.FILE_NOT_SUPPORTED]: '不支持的文件格式',
  [ERROR_CODES.FILE_TOO_LARGE]: '文件大小超出限制',
  [ERROR_CODES.DURATION_TOO_LONG]: '音视频时长超出限制',
  [ERROR_CODES.INSUFFICIENT_QUOTA]: '配额不足',
  [ERROR_CODES.ENGINE_UNAVAILABLE]: '转录引擎不可用',
  [ERROR_CODES.TRANSCRIPTION_FAILED]: '转录失败',
  [ERROR_CODES.FILE_NOT_FOUND]: '文件不存在',
  [ERROR_CODES.TASK_NOT_FOUND]: '任务不存在',
  [ERROR_CODES.INVALID_FORMAT]: '无效的输出格式',
  [ERROR_CODES.UPLOAD_FAILED]: '文件上传失败',
}
