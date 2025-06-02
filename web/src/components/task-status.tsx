import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getTaskStatusColor, getTaskStatusText } from '@/lib/utils'
import type { TaskStatus } from '@/types/transcription'
import { 
  Clock, 
  Upload, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  StopCircle 
} from 'lucide-react'

interface TaskStatusProps {
  status: TaskStatus
  progress?: number
  showProgress?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function TaskStatusBadge({ 
  status, 
  progress = 0, 
  showProgress = false,
  size = 'md'
}: TaskStatusProps) {
  const getStatusIcon = (status: TaskStatus) => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
    
    switch (status) {
      case 'pending':
        return <Clock className={iconSize} />
      case 'uploading':
        return <Upload className={iconSize} />
      case 'processing':
        return <Loader2 className={`${iconSize} animate-spin`} />
      case 'completed':
        return <CheckCircle className={iconSize} />
      case 'failed':
        return <XCircle className={iconSize} />
      case 'cancelled':
        return <StopCircle className={iconSize} />
      default:
        return <Clock className={iconSize} />
    }
  }

  const getVariant = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'cancelled':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="flex flex-col space-y-2">
      <Badge 
        variant={getVariant(status)}
        className={`
          inline-flex items-center space-x-1
          ${size === 'sm' ? 'text-xs px-2 py-1' : ''}
          ${size === 'lg' ? 'text-sm px-3 py-1.5' : ''}
        `}
      >
        {getStatusIcon(status)}
        <span>{getTaskStatusText(status)}</span>
      </Badge>
      
      {showProgress && (status === 'processing' || status === 'uploading') && (
        <div className="w-full">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {progress}%
          </p>
        </div>
      )}
    </div>
  )
}

interface TaskStatusCardProps {
  status: TaskStatus
  progress?: number
  errorMessage?: string
  startedAt?: string
  completedAt?: string
}

export function TaskStatusCard({
  status,
  progress = 0,
  errorMessage,
  startedAt,
  completedAt
}: TaskStatusCardProps) {
  const getStatusDescription = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return '任务已创建，等待处理中...'
      case 'uploading':
        return '正在上传文件到服务器...'
      case 'processing':
        return '正在进行语音转录，请耐心等待...'
      case 'completed':
        return '转录已完成，您可以查看和下载结果'
      case 'failed':
        return errorMessage || '转录过程中发生错误'
      case 'cancelled':
        return '任务已被取消'
      default:
        return '未知状态'
    }
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return null
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN')
  }

  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-start justify-between mb-3">
        <TaskStatusBadge status={status} progress={progress} showProgress />
        
        <div className="text-right text-sm text-muted-foreground">
          {startedAt && (
            <div>开始时间: {formatTime(startedAt)}</div>
          )}
          {completedAt && (
            <div>完成时间: {formatTime(completedAt)}</div>
          )}
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground">
        {getStatusDescription(status)}
      </p>
      
      {status === 'processing' && (
        <div className="mt-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>进度</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}
      
      {status === 'failed' && errorMessage && (
        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded">
          <p className="text-sm text-destructive font-medium">错误详情:</p>
          <p className="text-sm text-destructive mt-1">{errorMessage}</p>
        </div>
      )}
    </div>
  )
}
