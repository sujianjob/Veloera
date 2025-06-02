'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { User } from '@/types/transcription'
import { 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  RefreshCw,
  UserPlus,
  Crown,
  User as UserIcon,
  Shield,
  Ban,
  CheckCircle
} from 'lucide-react'

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)

  const pageSize = 20

  // 编辑表单状态
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    display_name: '',
    role: 1,
    status: 1,
    quota: 0,
    group: 'default'
  })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { keyword: searchTerm })
      }
      
      const response = await apiClient.getAllUsers(params)
      setUsers(response.tasks) // API返回的是tasks字段，但实际是users
      setTotal(response.total)
      setTotalPages(Math.ceil(response.total / pageSize))
    } catch (error) {
      console.error('获取用户列表失败:', error)
      toast({
        variant: "destructive",
        title: "获取用户失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchTerm])

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email || '',
      display_name: user.display_name || '',
      role: user.role,
      status: user.status,
      quota: user.quota,
      group: user.group
    })
    setShowEditForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    
    try {
      await apiClient.updateUser(editingUser.id, formData)
      toast({
        title: "更新成功",
        description: "用户信息已更新",
      })
      
      setShowEditForm(false)
      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      console.error('更新用户失败:', error)
      toast({
        variant: "destructive",
        title: "更新失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('确定要删除这个用户吗？此操作不可恢复。')) return
    
    try {
      await apiClient.deleteUser(userId)
      toast({
        title: "删除成功",
        description: "用户已被删除",
      })
      fetchUsers()
    } catch (error) {
      console.error('删除用户失败:', error)
      toast({
        variant: "destructive",
        title: "删除失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    }
  }

  const getRoleBadge = (role: number) => {
    switch (role) {
      case 100:
        return <Badge className="bg-red-500"><Crown className="h-3 w-3 mr-1" />超级管理员</Badge>
      case 10:
        return <Badge className="bg-orange-500"><Shield className="h-3 w-3 mr-1" />管理员</Badge>
      case 1:
        return <Badge variant="outline"><UserIcon className="h-3 w-3 mr-1" />普通用户</Badge>
      default:
        return <Badge variant="secondary">未知角色</Badge>
    }
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />正常</Badge>
      case 2:
        return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />禁用</Badge>
      default:
        return <Badge variant="secondary">未知状态</Badge>
    }
  }

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">用户管理</h1>
          <p className="text-muted-foreground">管理系统用户和权限</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{total} 个用户</Badge>
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户名或邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 编辑表单 */}
      {showEditForm && editingUser && (
        <Card>
          <CardHeader>
            <CardTitle>编辑用户</CardTitle>
            <CardDescription>
              修改用户信息和权限设置
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="display_name">显示名称</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="role">角色</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: parseInt(e.target.value)})}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value={1}>普通用户</option>
                    <option value={10}>管理员</option>
                    <option value={100}>超级管理员</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="status">状态</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: parseInt(e.target.value)})}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value={1}>正常</option>
                    <option value={2}>禁用</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="quota">配额</Label>
                  <Input
                    id="quota"
                    type="number"
                    value={formData.quota}
                    onChange={(e) => setFormData({...formData, quota: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button type="submit">更新用户</Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setShowEditForm(false)
                    setEditingUser(null)
                  }}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 用户列表 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">没有找到用户</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium">{user.username}</h3>
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user.status)}
                      <Badge variant="outline">ID: {user.id}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-4">
                      <div>
                        <span className="font-medium">邮箱:</span>
                        <br />
                        {user.email || '未设置'}
                      </div>
                      <div>
                        <span className="font-medium">配额:</span>
                        <br />
                        {user.quota} / {user.used_quota} 已用
                      </div>
                      <div>
                        <span className="font-medium">请求次数:</span>
                        <br />
                        {user.request_count}
                      </div>
                      <div>
                        <span className="font-medium">创建时间:</span>
                        <br />
                        {formatDate(new Date(user.created_time * 1000).toISOString())}
                      </div>
                    </div>

                    {user.display_name && (
                      <div className="text-sm text-muted-foreground">
                        显示名称: {user.display_name}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(user.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
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
    </div>
  )
}
