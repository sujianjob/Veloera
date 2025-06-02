'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api'
import { formatFileSize } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { Channel, EngineType } from '@/types/transcription'
import { 
  Database, 
  Plus, 
  Edit, 
  Trash2, 
  TestTube,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings
} from 'lucide-react'

export default function EnginesPage() {
  const { toast } = useToast()
  const [engines, setEngines] = useState<Channel[]>([])
  const [engineTypes, setEngineTypes] = useState<EngineType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingEngine, setEditingEngine] = useState<Channel | null>(null)
  const [testingEngines, setTestingEngines] = useState<Set<number>>(new Set())

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    engine_type: 1,
    api_key: '',
    base_url: '',
    max_file_size: 104857600, // 100MB
    max_duration: 3600, // 1小时
    supported_formats: 'mp3,mp4,wav,m4a,flac,aac,ogg',
    supported_languages: 'auto,zh,en,ja,ko',
    weight: 1,
    status: 1,
    group_name: 'default'
  })

  const fetchEngines = async () => {
    setLoading(true)
    try {
      const [enginesData, typesData] = await Promise.all([
        apiClient.getTranscriptionEngines(),
        apiClient.getTranscriptionEngineTypes()
      ])
      setEngines(enginesData)
      setEngineTypes(typesData)
    } catch (error) {
      console.error('获取引擎列表失败:', error)
      toast({
        variant: "destructive",
        title: "获取引擎失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEngines()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingEngine) {
        await apiClient.updateTranscriptionEngine(editingEngine.id, formData)
        toast({
          title: "更新成功",
          description: "转录引擎已更新",
        })
      } else {
        await apiClient.createTranscriptionEngine(formData)
        toast({
          title: "创建成功",
          description: "转录引擎已创建",
        })
      }
      
      setShowCreateForm(false)
      setEditingEngine(null)
      resetForm()
      fetchEngines()
    } catch (error) {
      console.error('保存引擎失败:', error)
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    }
  }

  const handleEdit = (engine: Channel) => {
    setEditingEngine(engine)
    setFormData({
      name: engine.name,
      engine_type: engine.engine_type,
      api_key: engine.key,
      base_url: engine.base_url || '',
      max_file_size: engine.max_file_size,
      max_duration: engine.max_duration,
      supported_formats: engine.supported_formats,
      supported_languages: engine.supported_languages,
      weight: engine.weight || 1,
      status: engine.status,
      group_name: engine.group
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (engineId: number) => {
    if (!confirm('确定要删除这个转录引擎吗？')) return
    
    try {
      await apiClient.deleteTranscriptionEngine(engineId)
      toast({
        title: "删除成功",
        description: "转录引擎已删除",
      })
      fetchEngines()
    } catch (error) {
      console.error('删除引擎失败:', error)
      toast({
        variant: "destructive",
        title: "删除失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    }
  }

  const handleTest = async (engineId: number) => {
    setTestingEngines(prev => new Set(prev).add(engineId))
    
    try {
      await apiClient.testTranscriptionEngine(engineId)
      toast({
        title: "测试成功",
        description: "转录引擎连接正常",
      })
      fetchEngines() // 刷新状态
    } catch (error) {
      console.error('测试引擎失败:', error)
      toast({
        variant: "destructive",
        title: "测试失败",
        description: error instanceof Error ? error.message : "引擎连接异常",
      })
    } finally {
      setTestingEngines(prev => {
        const newSet = new Set(prev)
        newSet.delete(engineId)
        return newSet
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      engine_type: 1,
      api_key: '',
      base_url: '',
      max_file_size: 104857600,
      max_duration: 3600,
      supported_formats: 'mp3,mp4,wav,m4a,flac,aac,ogg',
      supported_languages: 'auto,zh,en,ja,ko',
      weight: 1,
      status: 1,
      group_name: 'default'
    })
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />启用</Badge>
      case 2:
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />手动禁用</Badge>
      case 3:
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />自动禁用</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getEngineTypeName = (typeId: number) => {
    const type = engineTypes.find(t => t.id === typeId)
    return type?.name || `类型 ${typeId}`
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">转录引擎管理</h1>
          <p className="text-muted-foreground">管理和配置转录引擎</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{engines.length} 个引擎</Badge>
          <Button onClick={fetchEngines} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            添加引擎
          </Button>
        </div>
      </div>

      {/* 创建/编辑表单 */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingEngine ? '编辑转录引擎' : '添加转录引擎'}
            </CardTitle>
            <CardDescription>
              配置转录引擎的基本信息和参数
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">引擎名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="engine_type">引擎类型</Label>
                  <select
                    id="engine_type"
                    value={formData.engine_type}
                    onChange={(e) => setFormData({...formData, engine_type: parseInt(e.target.value)})}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    {engineTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="api_key">API密钥</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="base_url">基础URL</Label>
                  <Input
                    id="base_url"
                    value={formData.base_url}
                    onChange={(e) => setFormData({...formData, base_url: e.target.value})}
                    placeholder="https://api.example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="max_file_size">最大文件大小 (字节)</Label>
                  <Input
                    id="max_file_size"
                    type="number"
                    value={formData.max_file_size}
                    onChange={(e) => setFormData({...formData, max_file_size: parseInt(e.target.value)})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="max_duration">最大时长 (秒)</Label>
                  <Input
                    id="max_duration"
                    type="number"
                    value={formData.max_duration}
                    onChange={(e) => setFormData({...formData, max_duration: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="supported_formats">支持的格式 (逗号分隔)</Label>
                <Input
                  id="supported_formats"
                  value={formData.supported_formats}
                  onChange={(e) => setFormData({...formData, supported_formats: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="supported_languages">支持的语言 (逗号分隔)</Label>
                <Input
                  id="supported_languages"
                  value={formData.supported_languages}
                  onChange={(e) => setFormData({...formData, supported_languages: e.target.value})}
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <Button type="submit">
                  {editingEngine ? '更新' : '创建'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingEngine(null)
                    resetForm()
                  }}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 引擎列表 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : engines.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">暂无转录引擎</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {engines.map((engine) => (
            <Card key={engine.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>{engine.name}</span>
                  </CardTitle>
                  {getStatusBadge(engine.status)}
                </div>
                <CardDescription>
                  {getEngineTypeName(engine.engine_type)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">最大文件:</span>
                    <br />
                    {formatFileSize(engine.max_file_size)}
                  </div>
                  <div>
                    <span className="font-medium">最大时长:</span>
                    <br />
                    {Math.floor(engine.max_duration / 60)} 分钟
                  </div>
                  <div>
                    <span className="font-medium">权重:</span>
                    <br />
                    {engine.weight || 1}
                  </div>
                  <div>
                    <span className="font-medium">分组:</span>
                    <br />
                    {engine.group}
                  </div>
                </div>
                
                <div className="text-sm">
                  <div className="font-medium mb-1">支持格式:</div>
                  <div className="text-muted-foreground">
                    {engine.supported_formats}
                  </div>
                </div>
                
                <div className="text-sm">
                  <div className="font-medium mb-1">支持语言:</div>
                  <div className="text-muted-foreground">
                    {engine.supported_languages}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(engine.id)}
                    disabled={testingEngines.has(engine.id)}
                  >
                    <TestTube className={`h-4 w-4 mr-1 ${testingEngines.has(engine.id) ? 'animate-spin' : ''}`} />
                    测试
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(engine)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    编辑
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(engine.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
