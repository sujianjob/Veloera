'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatFileSize } from '@/lib/utils'
import {
  Settings,
  Save,
  RefreshCw,
  Database,
  Shield,
  Upload,
  Clock,
  Globe,
  Mail,
  Bell,
  Palette,
  Server
} from 'lucide-react'

export default function SettingsPage() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  // 系统设置状态
  const [systemSettings, setSystemSettings] = useState({
    site_name: 'Veloera',
    site_description: '专业的音视频转录服务',
    max_file_size: 104857600, // 100MB
    max_duration: 3600, // 1小时
    default_quota: 1000,
    registration_enabled: true,
    email_verification: false,
    admin_email: 'admin@veloera.com'
  })

  // 转录设置状态
  const [transcriptionSettings, setTranscriptionSettings] = useState({
    default_language: 'auto',
    default_quality: 'medium',
    default_format: 'json',
    enable_timestamps: true,
    enable_speaker: false,
    max_concurrent_tasks: 10,
    task_timeout: 1800 // 30分钟
  })

  // 通知设置状态
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    task_completion_notify: true,
    task_failure_notify: true,
    system_alerts: true,
    maintenance_mode: false
  })

  const handleSaveSystemSettings = async () => {
    setSaving(true)
    try {
      // 这里应该调用API保存设置
      // await apiClient.updateSystemSettings(systemSettings)
      
      toast({
        title: "保存成功",
        description: "系统设置已更新",
      })
    } catch (error) {
      console.error('保存系统设置失败:', error)
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTranscriptionSettings = async () => {
    setSaving(true)
    try {
      // 这里应该调用API保存设置
      // await apiClient.updateTranscriptionSettings(transcriptionSettings)
      
      toast({
        title: "保存成功",
        description: "转录设置已更新",
      })
    } catch (error) {
      console.error('保存转录设置失败:', error)
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotificationSettings = async () => {
    setSaving(true)
    try {
      // 这里应该调用API保存设置
      // await apiClient.updateNotificationSettings(notificationSettings)
      
      toast({
        title: "保存成功",
        description: "通知设置已更新",
      })
    } catch (error) {
      console.error('保存通知设置失败:', error)
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">系统设置</h1>
          <p className="text-muted-foreground">配置系统参数和选项</p>
        </div>
        <Badge variant="outline">管理员专用</Badge>
      </div>

      {/* 基础系统设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>基础设置</span>
          </CardTitle>
          <CardDescription>
            网站基本信息和核心参数配置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="site_name">网站名称</Label>
              <Input
                id="site_name"
                value={systemSettings.site_name}
                onChange={(e) => setSystemSettings({...systemSettings, site_name: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="admin_email">管理员邮箱</Label>
              <Input
                id="admin_email"
                type="email"
                value={systemSettings.admin_email}
                onChange={(e) => setSystemSettings({...systemSettings, admin_email: e.target.value})}
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="site_description">网站描述</Label>
              <Input
                id="site_description"
                value={systemSettings.site_description}
                onChange={(e) => setSystemSettings({...systemSettings, site_description: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="max_file_size">最大文件大小 (字节)</Label>
              <Input
                id="max_file_size"
                type="number"
                value={systemSettings.max_file_size}
                onChange={(e) => setSystemSettings({...systemSettings, max_file_size: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground mt-1">
                当前: {formatFileSize(systemSettings.max_file_size)}
              </p>
            </div>
            
            <div>
              <Label htmlFor="max_duration">最大音频时长 (秒)</Label>
              <Input
                id="max_duration"
                type="number"
                value={systemSettings.max_duration}
                onChange={(e) => setSystemSettings({...systemSettings, max_duration: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground mt-1">
                当前: {Math.floor(systemSettings.max_duration / 60)} 分钟
              </p>
            </div>
            
            <div>
              <Label htmlFor="default_quota">默认用户配额</Label>
              <Input
                id="default_quota"
                type="number"
                value={systemSettings.default_quota}
                onChange={(e) => setSystemSettings({...systemSettings, default_quota: parseInt(e.target.value)})}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={systemSettings.registration_enabled}
                onChange={(e) => setSystemSettings({...systemSettings, registration_enabled: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">允许用户注册</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={systemSettings.email_verification}
                onChange={(e) => setSystemSettings({...systemSettings, email_verification: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">邮箱验证</span>
            </label>
          </div>
          
          <Button onClick={handleSaveSystemSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            保存基础设置
          </Button>
        </CardContent>
      </Card>

      {/* 转录设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>转录设置</span>
          </CardTitle>
          <CardDescription>
            转录服务的默认参数和限制配置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="default_language">默认语言</Label>
              <select
                id="default_language"
                value={transcriptionSettings.default_language}
                onChange={(e) => setTranscriptionSettings({...transcriptionSettings, default_language: e.target.value})}
                className="w-full p-2 border rounded-md"
              >
                <option value="auto">自动检测</option>
                <option value="zh">中文</option>
                <option value="en">英语</option>
                <option value="ja">日语</option>
                <option value="ko">韩语</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="default_quality">默认质量</Label>
              <select
                id="default_quality"
                value={transcriptionSettings.default_quality}
                onChange={(e) => setTranscriptionSettings({...transcriptionSettings, default_quality: e.target.value})}
                className="w-full p-2 border rounded-md"
              >
                <option value="low">快速</option>
                <option value="medium">标准</option>
                <option value="high">高精度</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="default_format">默认输出格式</Label>
              <select
                id="default_format"
                value={transcriptionSettings.default_format}
                onChange={(e) => setTranscriptionSettings({...transcriptionSettings, default_format: e.target.value})}
                className="w-full p-2 border rounded-md"
              >
                <option value="json">JSON</option>
                <option value="txt">纯文本</option>
                <option value="srt">SRT字幕</option>
                <option value="vtt">VTT字幕</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="max_concurrent_tasks">最大并发任务数</Label>
              <Input
                id="max_concurrent_tasks"
                type="number"
                value={transcriptionSettings.max_concurrent_tasks}
                onChange={(e) => setTranscriptionSettings({...transcriptionSettings, max_concurrent_tasks: parseInt(e.target.value)})}
              />
            </div>
            
            <div>
              <Label htmlFor="task_timeout">任务超时时间 (秒)</Label>
              <Input
                id="task_timeout"
                type="number"
                value={transcriptionSettings.task_timeout}
                onChange={(e) => setTranscriptionSettings({...transcriptionSettings, task_timeout: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground mt-1">
                当前: {Math.floor(transcriptionSettings.task_timeout / 60)} 分钟
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={transcriptionSettings.enable_timestamps}
                onChange={(e) => setTranscriptionSettings({...transcriptionSettings, enable_timestamps: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">默认启用时间戳</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={transcriptionSettings.enable_speaker}
                onChange={(e) => setTranscriptionSettings({...transcriptionSettings, enable_speaker: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">默认启用说话人识别</span>
            </label>
          </div>
          
          <Button onClick={handleSaveTranscriptionSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            保存转录设置
          </Button>
        </CardContent>
      </Card>

      {/* 通知设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>通知设置</span>
          </CardTitle>
          <CardDescription>
            系统通知和邮件提醒配置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={notificationSettings.email_notifications}
                onChange={(e) => setNotificationSettings({...notificationSettings, email_notifications: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">启用邮件通知</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={notificationSettings.task_completion_notify}
                onChange={(e) => setNotificationSettings({...notificationSettings, task_completion_notify: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">任务完成通知</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={notificationSettings.task_failure_notify}
                onChange={(e) => setNotificationSettings({...notificationSettings, task_failure_notify: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">任务失败通知</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={notificationSettings.system_alerts}
                onChange={(e) => setNotificationSettings({...notificationSettings, system_alerts: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">系统警报</span>
            </label>
          </div>
          
          <div className="border-t pt-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={notificationSettings.maintenance_mode}
                onChange={(e) => setNotificationSettings({...notificationSettings, maintenance_mode: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm font-medium text-orange-600">维护模式</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              启用后将暂停接受新的转录任务
            </p>
          </div>
          
          <Button onClick={handleSaveNotificationSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            保存通知设置
          </Button>
        </CardContent>
      </Card>

      {/* 系统信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>系统信息</span>
          </CardTitle>
          <CardDescription>
            当前系统状态和版本信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">系统版本:</span>
              <br />
              Veloera v1.0.0
            </div>
            <div>
              <span className="font-medium">前端版本:</span>
              <br />
              Next.js 15.3.3
            </div>
            <div>
              <span className="font-medium">运行时间:</span>
              <br />
              2 天 14 小时 32 分钟
            </div>
            <div>
              <span className="font-medium">最后更新:</span>
              <br />
              2024-01-15 10:30:00
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
