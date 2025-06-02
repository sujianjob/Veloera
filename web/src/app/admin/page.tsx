'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { apiClient } from '@/lib/api'
import { formatFileSize, formatDuration } from '@/lib/utils'
import type { SystemStats, TranscriptionTask } from '@/types/transcription'
import {
  Users,
  FileText,
  Clock,
  HardDrive,
  TrendingUp,
  Activity,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [recentTasks, setRecentTasks] = useState<TranscriptionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setRefreshing(true)
      
      // 获取系统统计
      const systemStats = await apiClient.getSystemTranscriptionStats()
      setStats(systemStats)
      
      // 获取最近的任务
      const tasksResponse = await apiClient.getAllTranscriptionTasks({
        page: 1,
        page_size: 10
      })
      setRecentTasks(tasksResponse.tasks)
      
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const getTaskStatusStats = () => {
    const statusCounts = recentTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      completed: statusCounts.completed || 0,
      processing: statusCounts.processing || 0,
      failed: statusCounts.failed || 0,
      pending: statusCounts.pending || 0
    }
  }

  const taskStats = getTaskStatusStats()
  const totalRecentTasks = recentTasks.length

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">管理仪表板</h1>
          <p className="text-muted-foreground">系统概览和关键指标</p>
        </div>
        <Button onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总任务数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              今日新增 {stats?.today_tasks || 0} 个
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              活跃用户
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总处理时长</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(stats?.total_duration || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              今日 {formatDuration(stats?.today_duration || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总文件大小</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(stats?.total_file_size || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              累计处理
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 任务状态分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>最近任务状态</span>
            </CardTitle>
            <CardDescription>
              最近 {totalRecentTasks} 个任务的状态分布
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">已完成</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{taskStats.completed}</span>
                <div className="w-20">
                  <Progress 
                    value={totalRecentTasks > 0 ? (taskStats.completed / totalRecentTasks) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm">处理中</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{taskStats.processing}</span>
                <div className="w-20">
                  <Progress 
                    value={totalRecentTasks > 0 ? (taskStats.processing / totalRecentTasks) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">失败</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{taskStats.failed}</span>
                <div className="w-20">
                  <Progress 
                    value={totalRecentTasks > 0 ? (taskStats.failed / totalRecentTasks) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">等待中</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{taskStats.pending}</span>
                <div className="w-20">
                  <Progress 
                    value={totalRecentTasks > 0 ? (taskStats.pending / totalRecentTasks) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 最近任务 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>最近任务</span>
            </CardTitle>
            <CardDescription>
              最新的转录任务
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm truncate">
                      {task.original_filename}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {task.user?.username || 'Unknown'} • {formatFileSize(task.file_size)}
                    </div>
                  </div>
                  <Badge 
                    variant={
                      task.status === 'completed' ? 'default' :
                      task.status === 'failed' ? 'destructive' :
                      'secondary'
                    }
                    className="text-xs"
                  >
                    {task.status}
                  </Badge>
                </div>
              ))}
              
              {recentTasks.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  暂无任务
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>快速操作</span>
          </CardTitle>
          <CardDescription>
            常用的管理操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <a href="/admin/tasks">
                <FileText className="h-6 w-6" />
                <span>管理任务</span>
              </a>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <a href="/admin/engines">
                <Database className="h-6 w-6" />
                <span>转录引擎</span>
              </a>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <a href="/admin/users">
                <Users className="h-6 w-6" />
                <span>用户管理</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
