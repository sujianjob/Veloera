'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { apiClient } from '@/lib/api'
import { formatFileSize, formatDuration, formatDate } from '@/lib/utils'
import type { SystemStats, TranscriptionTask } from '@/types/transcription'
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Clock,
  HardDrive,
  Activity,
  RefreshCw,
  Calendar,
  Zap,
  Target,
  Award
} from 'lucide-react'

export default function StatsPage() {
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
      
      // 获取最近的任务用于分析
      const tasksResponse = await apiClient.getAllTranscriptionTasks({
        page: 1,
        page_size: 100
      })
      setRecentTasks(tasksResponse.tasks)
      
    } catch (error) {
      console.error('获取统计数据失败:', error)
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

  // 计算各种统计指标
  const getTaskStats = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const todayTasks = recentTasks.filter(task => 
      new Date(task.created_at) >= today
    )
    const weekTasks = recentTasks.filter(task => 
      new Date(task.created_at) >= thisWeek
    )
    const monthTasks = recentTasks.filter(task => 
      new Date(task.created_at) >= thisMonth
    )

    const statusCounts = recentTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const successRate = recentTasks.length > 0 
      ? ((statusCounts.completed || 0) / recentTasks.length * 100).toFixed(1)
      : '0'

    return {
      today: todayTasks.length,
      week: weekTasks.length,
      month: monthTasks.length,
      statusCounts,
      successRate: parseFloat(successRate),
      avgFileSize: recentTasks.length > 0 
        ? recentTasks.reduce((sum, task) => sum + task.file_size, 0) / recentTasks.length
        : 0,
      totalDuration: recentTasks.reduce((sum, task) => sum + (task.duration || 0), 0)
    }
  }

  const taskStats = getTaskStats()

  // 获取热门文件格式
  const getPopularFormats = () => {
    const formatCounts = recentTasks.reduce((acc, task) => {
      const ext = task.original_filename.split('.').pop()?.toLowerCase() || 'unknown'
      acc[ext] = (acc[ext] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(formatCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
  }

  const popularFormats = getPopularFormats()

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">系统统计</h1>
          <p className="text-muted-foreground">详细的系统使用情况和性能指标</p>
        </div>
        <Button onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总任务数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              今日 +{taskStats.today}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.successRate}%</div>
            <Progress value={taskStats.successRate} className="mt-2" />
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
            <CardTitle className="text-sm font-medium">平均文件大小</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(taskStats.avgFileSize)}
            </div>
            <p className="text-xs text-muted-foreground">
              单个文件平均
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 时间段统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>今日统计</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">新增任务</span>
              <span className="font-medium">{taskStats.today}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">处理时长</span>
              <span className="font-medium">{formatDuration(stats?.today_duration || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>本周统计</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">新增任务</span>
              <span className="font-medium">{taskStats.week}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">日均任务</span>
              <span className="font-medium">{Math.round(taskStats.week / 7)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>本月统计</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">新增任务</span>
              <span className="font-medium">{taskStats.month}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">日均任务</span>
              <span className="font-medium">{Math.round(taskStats.month / new Date().getDate())}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 任务状态分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>任务状态分布</span>
            </CardTitle>
            <CardDescription>
              最近 {recentTasks.length} 个任务的状态统计
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(taskStats.statusCounts).map(([status, count]) => {
              const percentage = recentTasks.length > 0 ? (count / recentTasks.length) * 100 : 0
              const statusText = {
                'completed': '已完成',
                'processing': '处理中',
                'failed': '失败',
                'pending': '等待中',
                'cancelled': '已取消'
              }[status] || status

              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{statusText}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{count}</span>
                    <div className="w-20">
                      <Progress value={percentage} className="h-2" />
                    </div>
                    <span className="text-xs text-muted-foreground w-10">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 热门文件格式 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>热门文件格式</span>
            </CardTitle>
            <CardDescription>
              最常用的文件格式统计
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {popularFormats.map(([format, count], index) => {
              const percentage = recentTasks.length > 0 ? (count / recentTasks.length) * 100 : 0
              
              return (
                <div key={format} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{format.toUpperCase()}</Badge>
                    {index === 0 && <Badge className="bg-yellow-500">最热门</Badge>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{count}</span>
                    <div className="w-20">
                      <Progress value={percentage} className="h-2" />
                    </div>
                    <span className="text-xs text-muted-foreground w-10">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
            
            {popularFormats.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 系统资源统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>系统资源统计</span>
          </CardTitle>
          <CardDescription>
            系统处理能力和资源使用情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatFileSize(stats?.total_file_size || 0)}
              </div>
              <p className="text-sm text-muted-foreground">总文件大小</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatDuration(stats?.total_duration || 0)}
              </div>
              <p className="text-sm text-muted-foreground">总处理时长</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatDuration(taskStats.totalDuration)}
              </div>
              <p className="text-sm text-muted-foreground">音频总时长</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {recentTasks.length > 0 ? formatDuration(taskStats.totalDuration / recentTasks.length) : '0:00'}
              </div>
              <p className="text-sm text-muted-foreground">平均音频时长</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
