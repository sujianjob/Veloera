'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TaskStatusCard } from '@/components/task-status'
import { apiClient } from '@/lib/api'
import { formatFileSize, formatDate, formatDuration, downloadFile, copyToClipboard } from '@/lib/utils'
import type { TranscriptionTask } from '@/types/transcription'
import { 
  ArrowLeft, 
  Download, 
  Copy, 
  RefreshCw,
  FileText,
  Clock,
  User,
  Settings,
  Mic,
  Video
} from 'lucide-react'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = parseInt(params.id as string)
  
  const [task, setTask] = useState<TranscriptionTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<string>('')
  const [loadingResult, setLoadingResult] = useState(false)

  const fetchTask = async () => {
    setLoading(true)
    try {
      const taskData = await apiClient.getTranscriptionTask(taskId)
      setTask(taskData)
      
      // 如果任务已完成，获取结果预览
      if (taskData.status === 'completed') {
        setLoadingResult(true)
        try {
          const resultText = await apiClient.previewTranscriptionResult(taskId)
          setResult(resultText)
        } catch (error) {
          console.error('获取结果预览失败:', error)
        } finally {
          setLoadingResult(false)
        }
      }
    } catch (error) {
      console.error('获取任务详情失败:', error)
      router.push('/tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (taskId) {
      fetchTask()
    }
  }, [taskId])

  const handleDownload = async () => {
    if (!task) return
    
    try {
      const blob = await apiClient.downloadTranscriptionResult(taskId)
      const url = URL.createObjectURL(blob)
      downloadFile(url, `${task.original_filename}.${task.output_format}`)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载失败:', error)
    }
  }

  const handleCopyResult = async () => {
    try {
      await copyToClipboard(result)
      // TODO: 显示成功提示
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">任务不存在</p>
          <Button onClick={() => router.push('/tasks')} className="mt-4">
            返回任务列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/tasks')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回列表
              </Button>
              <h1 className="text-2xl font-bold">任务详情</h1>
              <Badge variant="secondary">ID: {task.id}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={fetchTask} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
              {task.status === 'completed' && (
                <Button onClick={handleDownload} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  下载结果
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：任务信息 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 任务状态 */}
            <Card>
              <CardHeader>
                <CardTitle>任务状态</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskStatusCard
                  status={task.status}
                  progress={task.progress}
                  errorMessage={task.error_message}
                  startedAt={task.started_at}
                  completedAt={task.completed_at}
                />
              </CardContent>
            </Card>

            {/* 文件信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>文件信息</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">文件名:</span>
                  <span className="text-sm font-medium">{task.original_filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">大小:</span>
                  <span className="text-sm font-medium">{formatFileSize(task.file_size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">类型:</span>
                  <Badge variant="outline">
                    {task.file_type.startsWith('audio') ? (
                      <><Mic className="h-3 w-3 mr-1" />音频</>
                    ) : (
                      <><Video className="h-3 w-3 mr-1" />视频</>
                    )}
                  </Badge>
                </div>
                {task.duration && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">时长:</span>
                    <span className="text-sm font-medium">{formatDuration(task.duration)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 转录配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>转录配置</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">语言:</span>
                  <span className="text-sm font-medium">
                    {task.language === 'auto' ? '自动检测' : task.language}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">质量:</span>
                  <span className="text-sm font-medium">{task.quality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">输出格式:</span>
                  <span className="text-sm font-medium">{task.output_format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">时间戳:</span>
                  <span className="text-sm font-medium">{task.enable_timestamps ? '是' : '否'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">说话人识别:</span>
                  <span className="text-sm font-medium">{task.enable_speaker ? '是' : '否'}</span>
                </div>
              </CardContent>
            </Card>

            {/* 时间信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>时间信息</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">创建时间:</span>
                  <span className="text-sm font-medium">{formatDate(task.created_at)}</span>
                </div>
                {task.started_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">开始时间:</span>
                    <span className="text-sm font-medium">{formatDate(task.started_at)}</span>
                  </div>
                )}
                {task.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">完成时间:</span>
                    <span className="text-sm font-medium">{formatDate(task.completed_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：转录结果 */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>转录结果</CardTitle>
                  {result && (
                    <Button variant="outline" size="sm" onClick={handleCopyResult}>
                      <Copy className="h-4 w-4 mr-2" />
                      复制
                    </Button>
                  )}
                </div>
                {task.detected_language && (
                  <CardDescription>
                    检测到的语言: {task.detected_language}
                    {task.confidence_score && (
                      <span className="ml-2">置信度: {(task.confidence_score * 100).toFixed(1)}%</span>
                    )}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {task.status === 'completed' ? (
                  loadingResult ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">加载结果中...</span>
                    </div>
                  ) : result ? (
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm font-mono">{result}</pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      无法加载转录结果
                    </div>
                  )
                ) : task.status === 'failed' ? (
                  <div className="text-center py-8">
                    <p className="text-destructive">转录失败</p>
                    {task.error_message && (
                      <p className="text-sm text-muted-foreground mt-2">{task.error_message}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    转录尚未完成，请等待...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
