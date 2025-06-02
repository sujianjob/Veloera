'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TaskStatusBadge } from '@/components/task-status'
import { apiClient } from '@/lib/api'
import { formatFileSize, formatDate, downloadFile } from '@/lib/utils'
import type { TranscriptionTask, TaskStatus } from '@/types/transcription'
import { 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  StopCircle,
  RefreshCw,
  Filter,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

export default function TasksPage() {
  const [tasks, setTasks] = useState<TranscriptionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [previewContent, setPreviewContent] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  const pageSize = 10

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        ...(statusFilter !== 'all' && { status: statusFilter })
      }
      
      const response = await apiClient.getTranscriptionTasks(params)
      setTasks(response.tasks)
      setTotal(response.total)
      setTotalPages(Math.ceil(response.total / pageSize))
    } catch (error) {
      console.error('获取任务列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [currentPage, statusFilter])

  const handleCancelTask = async (taskId: number) => {
    try {
      await apiClient.cancelTranscriptionTask(taskId)
      fetchTasks() // 刷新列表
    } catch (error) {
      console.error('取消任务失败:', error)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('确定要删除这个任务吗？')) return
    
    try {
      await apiClient.deleteTranscriptionTask(taskId)
      fetchTasks() // 刷新列表
    } catch (error) {
      console.error('删除任务失败:', error)
    }
  }

  const handleDownload = async (taskId: number, filename: string) => {
    try {
      const blob = await apiClient.downloadTranscriptionResult(taskId)
      const url = URL.createObjectURL(blob)
      downloadFile(url, filename)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载失败:', error)
    }
  }

  const handlePreview = async (taskId: number) => {
    setPreviewLoading(true)
    setPreviewOpen(true)
    try {
      const result = await apiClient.previewTranscriptionResult(taskId)
      setPreviewContent(result)
    } catch (error) {
      console.error('预览失败:', error)
      setPreviewContent('预览失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setPreviewLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task =>
    task.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">任务历史</h1>
              <Badge variant="secondary">{total} 个任务</Badge>
            </div>
            <Button onClick={fetchTasks} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* 搜索和筛选 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索文件名..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">全部状态</option>
                  <option value="pending">等待中</option>
                  <option value="processing">转录中</option>
                  <option value="completed">已完成</option>
                  <option value="failed">失败</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 任务列表 */}
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">没有找到任务</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium">{task.original_filename}</h3>
                        <TaskStatusBadge status={task.status} progress={task.progress} />
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-4">
                        <div>
                          <span className="font-medium">文件大小:</span>
                          <br />
                          {formatFileSize(task.file_size)}
                        </div>
                        <div>
                          <span className="font-medium">语言:</span>
                          <br />
                          {task.language === 'auto' ? '自动检测' : task.language}
                        </div>
                        <div>
                          <span className="font-medium">输出格式:</span>
                          <br />
                          {task.output_format.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium">创建时间:</span>
                          <br />
                          {formatDate(task.created_at)}
                        </div>
                      </div>

                      {task.error_message && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded mb-4">
                          <p className="text-sm text-destructive">{task.error_message}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {task.status === 'completed' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(task.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(task.id, `${task.original_filename}.${task.output_format}`)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {(task.status === 'pending' || task.status === 'processing') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelTask(task.id)}
                        >
                          <StopCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              
              <span className="text-sm text-muted-foreground">
                第 {currentPage} 页，共 {totalPages} 页
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* 预览对话框 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>转录结果预览</DialogTitle>
            <DialogDescription>
              查看转录结果内容
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-96 overflow-y-auto">
            {previewLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">加载中...</span>
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm font-mono">{previewContent}</pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
