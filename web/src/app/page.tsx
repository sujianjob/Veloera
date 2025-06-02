'use client'

import { useState, useEffect } from 'react'
import { FileUpload } from '@/components/file-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TaskStatusCard } from '@/components/task-status'
import { apiClient } from '@/lib/api'
import { formatFileSize, formatDuration } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { TranscriptionRequest, TranscriptionTask, OutputFormat, QualityLevel, User } from '@/types/transcription'
import {
  Mic,
  Video,
  Settings,
  History,
  Upload,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  LogIn,
  Wallet
} from 'lucide-react'

export default function Home() {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [currentTask, setCurrentTask] = useState<TranscriptionTask | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 转录配置
  const [language, setLanguage] = useState('auto')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('json')
  const [quality, setQuality] = useState<QualityLevel>('medium')
  const [enableTimestamps, setEnableTimestamps] = useState(true)
  const [enableSpeaker, setEnableSpeaker] = useState(false)

  // 检查用户登录状态
  useEffect(() => {
    const checkUserStatus = async () => {
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          const userData = await apiClient.getCurrentUser()
          setUser(userData)
          setIsLoggedIn(true)
        } catch (error) {
          console.error('获取用户信息失败:', error)
          localStorage.removeItem('access_token')
          setIsLoggedIn(false)
        }
      }
    }

    checkUserStatus()
  }, [])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  const handleFileRemove = () => {
    setSelectedFile(null)
  }

  const handleSubmit = async () => {
    if (!selectedFile) return

    // 检查登录状态
    if (!isLoggedIn) {
      toast({
        variant: "destructive",
        title: "请先登录",
        description: "您需要登录后才能使用转录服务",
      })
      return
    }

    // 检查配额
    if (user && user.quota <= user.used_quota) {
      toast({
        variant: "destructive",
        title: "配额不足",
        description: "您的配额已用完，请充值后再试",
      })
      return
    }

    setIsUploading(true)
    try {
      const request: TranscriptionRequest = {
        file: selectedFile,
        language,
        output_format: outputFormat,
        quality,
        enable_timestamps: enableTimestamps,
        enable_speaker: enableSpeaker,
        priority: 2
      }

      const task = await apiClient.createTranscriptionTask(request)
      setCurrentTask(task)
      setSelectedFile(null)

      toast({
        title: "任务创建成功",
        description: `文件 ${selectedFile.name} 已开始转录`,
      })

      // 刷新用户信息以更新配额
      if (isLoggedIn) {
        try {
          const userData = await apiClient.getCurrentUser()
          setUser(userData)
        } catch (error) {
          console.error('刷新用户信息失败:', error)
        }
      }
    } catch (error) {
      console.error('创建转录任务失败:', error)
      toast({
        variant: "destructive",
        title: "创建任务失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mic className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Veloera</h1>
              <Badge variant="secondary">音视频转录</Badge>
            </div>
            <nav className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <a href="/tasks">
                  <History className="h-4 w-4 mr-2" />
                  任务历史
                </a>
              </Button>

              {isLoggedIn && user?.role >= 10 && (
                <Button variant="ghost" size="sm" asChild>
                  <a href="/admin">
                    <Settings className="h-4 w-4 mr-2" />
                    管理后台
                  </a>
                </Button>
              )}

              {isLoggedIn ? (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" asChild>
                    <a href="/profile">
                      <UserIcon className="h-4 w-4 mr-2" />
                      {user?.username}
                    </a>
                  </Button>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Wallet className="h-3 w-3" />
                    <span>{user?.quota - user?.used_quota || 0}</span>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" asChild>
                  <a href="/login">
                    <LogIn className="h-4 w-4 mr-2" />
                    登录
                  </a>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：文件上传和配置 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 文件上传 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>上传音视频文件</span>
                </CardTitle>
                <CardDescription>
                  支持多种音视频格式，最大文件大小 100MB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                  selectedFile={selectedFile || undefined}
                  disabled={isUploading}
                />
              </CardContent>
            </Card>

            {/* 转录配置 */}
            <Card>
              <CardHeader>
                <CardTitle
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>转录配置</span>
                  </div>
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="language">语言</Label>
                      <select
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md"
                      >
                        <option value="auto">自动检测</option>
                        <option value="zh">中文</option>
                        <option value="en">英语</option>
                        <option value="ja">日语</option>
                        <option value="ko">韩语</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="quality">质量</Label>
                      <select
                        id="quality"
                        value={quality}
                        onChange={(e) => setQuality(e.target.value as QualityLevel)}
                        className="w-full mt-1 p-2 border rounded-md"
                      >
                        <option value="low">快速</option>
                        <option value="medium">标准</option>
                        <option value="high">高精度</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="format">输出格式</Label>
                      <select
                        id="format"
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                        className="w-full mt-1 p-2 border rounded-md"
                      >
                        <option value="json">JSON</option>
                        <option value="txt">纯文本</option>
                        <option value="srt">SRT字幕</option>
                        <option value="vtt">VTT字幕</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={enableTimestamps}
                        onChange={(e) => setEnableTimestamps(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">包含时间戳</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={enableSpeaker}
                        onChange={(e) => setEnableSpeaker(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">说话人识别</span>
                    </label>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 提交按钮 */}
            <div className="flex justify-center">
              <Button
                onClick={handleSubmit}
                disabled={!selectedFile || isUploading}
                size="lg"
                className="w-full md:w-auto"
              >
                {isUploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    开始转录
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 右侧：任务状态和信息 */}
          <div className="space-y-6">
            {/* 用户配额信息 */}
            {isLoggedIn && user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wallet className="h-5 w-5" />
                    <span>配额信息</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>剩余配额:</span>
                    <span className="font-medium">{user.quota - user.used_quota}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>总配额:</span>
                    <span className="text-muted-foreground">{user.quota}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href="/profile">
                      <Wallet className="h-4 w-4 mr-2" />
                      管理配额
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 当前任务状态 */}
            {currentTask && (
              <Card>
                <CardHeader>
                  <CardTitle>当前任务</CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskStatusCard
                    status={currentTask.status}
                    progress={currentTask.progress}
                    errorMessage={currentTask.error_message}
                    startedAt={currentTask.started_at}
                    completedAt={currentTask.completed_at}
                  />
                </CardContent>
              </Card>
            )}

            {/* 文件信息 */}
            {selectedFile && (
              <Card>
                <CardHeader>
                  <CardTitle>文件信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">文件名:</span>
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">大小:</span>
                    <span className="text-sm font-medium">{formatFileSize(selectedFile.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">类型:</span>
                    <Badge variant="outline">
                      {selectedFile.type.startsWith('audio/') ? (
                        <><Mic className="h-3 w-3 mr-1" />音频</>
                      ) : (
                        <><Video className="h-3 w-3 mr-1" />视频</>
                      )}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 使用说明 */}
            <Card>
              <CardHeader>
                <CardTitle>使用说明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-primary">1.</span>
                  <span>选择或拖拽音视频文件到上传区域</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-primary">2.</span>
                  <span>根据需要调整转录配置选项</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-primary">3.</span>
                  <span>点击"开始转录"按钮提交任务</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-primary">4.</span>
                  <span>等待转录完成后下载结果</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
