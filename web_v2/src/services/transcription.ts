import { request } from './request';

export interface TranscriptionTask {
  id: number;
  original_filename: string;
  file_size: number;
  file_type: string;
  duration?: number;
  language: string;
  model_name?: string;
  enable_timestamps: boolean;
  enable_speaker: boolean;
  output_format: string;
  quality: string;
  status: string;
  progress: number;
  error_message?: string;
  result_text?: string;
  confidence_score?: number;
  detected_language?: string;
  quota_cost: number;
  billing_duration?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
  channel: {
    id: number;
    name: string;
    engine_type: number;
  };
}

export interface TranscriptionEngine {
  id: number;
  name: string;
  engine_type: number;
  status: number;
  max_file_size: number;
  max_duration: number;
  supported_formats: string;
  supported_languages: string;
  weight: number;
  group_name: string;
  created_at: string;
  updated_at: string;
}

export interface TranscriptionStats {
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  processing_tasks: number;
  total_duration: number;
  total_file_size: number;
  total_quota_cost: number;
}

export interface CreateTaskParams {
  file: File;
  language?: string;
  model_name?: string;
  enable_timestamps?: boolean;
  enable_speaker?: boolean;
  output_format?: string;
  quality?: string;
  priority?: number;
}

export interface GetTasksParams {
  page?: number;
  page_size?: number;
  status?: string;
}

export interface CreateEngineParams {
  name: string;
  engine_type: number;
  api_key: string;
  base_url?: string;
  max_file_size?: number;
  max_duration?: number;
  supported_formats?: string;
  supported_languages?: string;
  weight?: number;
  status?: number;
  group_name?: string;
}

export interface UpdateEngineParams {
  name?: string;
  api_key?: string;
  base_url?: string;
  max_file_size?: number;
  max_duration?: number;
  supported_formats?: string;
  supported_languages?: string;
  weight?: number;
  status?: number;
  group_name?: string;
}

// 转录任务相关 API
export const transcriptionAPI = {
  // 获取支持的语言列表
  getSupportedLanguages: () => {
    return request.get<Record<string, string>>('/api/transcription/languages');
  },

  // 获取支持的文件格式
  getSupportedFormats: () => {
    return request.get<{
      audio: string[];
      video: string[];
      all: string[];
    }>('/api/transcription/formats');
  },

  // 创建转录任务
  createTask: (formData: FormData) => {
    return request.post<TranscriptionTask>('/api/user/transcription/tasks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 获取用户转录任务列表
  getUserTasks: (params: GetTasksParams) => {
    return request.get<{
      tasks: TranscriptionTask[];
      total: number;
      page: number;
      page_size: number;
    }>('/api/user/transcription/tasks', { params });
  },

  // 获取转录任务详情
  getTask: (taskId: number) => {
    return request.get<TranscriptionTask>(`/api/user/transcription/tasks/${taskId}`);
  },

  // 预览转录结果
  previewResult: (taskId: number, format: string = 'text') => {
    return request.get<{ text: string }>(`/api/user/transcription/tasks/${taskId}/preview`, {
      params: { format },
    });
  },

  // 下载转录结果
  downloadResult: (taskId: number, format: string = 'json') => {
    return request.get(`/api/user/transcription/tasks/${taskId}/download`, {
      params: { format },
      responseType: 'blob',
    });
  },

  // 取消转录任务
  cancelTask: (taskId: number) => {
    return request.put<{ message: string }>(`/api/user/transcription/tasks/${taskId}/cancel`);
  },

  // 删除转录任务
  deleteTask: (taskId: number) => {
    return request.delete<{ message: string }>(`/api/user/transcription/tasks/${taskId}`);
  },

  // 获取用户转录统计
  getUserStats: () => {
    return request.get<TranscriptionStats>('/api/user/transcription/stats');
  },
};

// 管理员转录引擎管理 API
export const transcriptionAdminAPI = {
  // 获取所有转录任务（管理员）
  getAllTasks: (params: GetTasksParams & { username?: string }) => {
    return request.get<{
      tasks: TranscriptionTask[];
      total: number;
      page: number;
      page_size: number;
    }>('/api/transcription/tasks', { params });
  },

  // 获取系统转录统计
  getSystemStats: () => {
    return request.get<TranscriptionStats & {
      total_users: number;
      today_tasks: number;
      today_duration: number;
    }>('/api/transcription/stats');
  },

  // 获取转录引擎列表
  getEngines: () => {
    return request.get<TranscriptionEngine[]>('/api/transcription/engines');
  },

  // 获取支持的引擎类型
  getEngineTypes: () => {
    return request.get<Record<number, string>>('/api/transcription/engines/types');
  },

  // 创建转录引擎
  createEngine: (data: CreateEngineParams) => {
    return request.post<TranscriptionEngine>('/api/transcription/engines', data);
  },

  // 更新转录引擎
  updateEngine: (engineId: number, data: UpdateEngineParams) => {
    return request.put<TranscriptionEngine>(`/api/transcription/engines/${engineId}`, data);
  },

  // 删除转录引擎
  deleteEngine: (engineId: number) => {
    return request.delete<{ message: string }>(`/api/transcription/engines/${engineId}`);
  },

  // 测试转录引擎
  testEngine: (engineId: number) => {
    return request.post<{
      status: string;
      error?: string;
      test_time: number;
      auto_disabled?: boolean;
    }>(`/api/transcription/engines/${engineId}/test`);
  },

  // 批量更新引擎状态
  batchUpdateEngineStatus: (data: { channel_ids: number[]; status: number }) => {
    return request.put<{ updated_count: number }>('/api/transcription/engines/batch/status', data);
  },
};

// 转录相关工具函数
export const transcriptionUtils = {
  // 格式化文件大小
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 格式化时长
  formatDuration: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  },

  // 格式化日期时间
  formatDateTime: (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  },

  // 获取状态显示文本
  getStatusText: (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: '等待中',
      uploading: '上传中',
      processing: '转录中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  },

  // 获取状态颜色
  getStatusColor: (status: string): string => {
    const colorMap: Record<string, string> = {
      pending: 'default',
      uploading: 'blue',
      processing: 'orange',
      completed: 'green',
      failed: 'red',
      cancelled: 'default',
    };
    return colorMap[status] || 'default';
  },

  // 获取引擎类型名称
  getEngineTypeName: (engineType: number, engineTypes: Record<number, string>): string => {
    return engineTypes[engineType] || `引擎类型 ${engineType}`;
  },

  // 检查文件格式是否支持
  isSupportedFormat: (filename: string, supportedFormats: string[]): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? supportedFormats.includes(ext) : false;
  },

  // 检查文件大小是否符合限制
  isFileSizeValid: (fileSize: number, maxSize: number): boolean => {
    return fileSize <= maxSize;
  },

  // 估算转录费用
  estimateTranscriptionCost: (fileSize: number, duration?: number): number => {
    // 基础费用：每分钟100配额
    const baseCostPerMinute = 100;
    
    let estimatedDuration = duration;
    if (!estimatedDuration) {
      // 根据文件大小估算时长（粗略估算：1MB约1分钟）
      estimatedDuration = Math.max(60, Math.floor(fileSize / (1024 * 1024)) * 60);
    }
    
    const minutes = Math.ceil(estimatedDuration / 60);
    return minutes * baseCostPerMinute;
  },
};

export default transcriptionAPI;
