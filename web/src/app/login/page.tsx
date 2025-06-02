'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api'
import { 
  Mic, 
  Eye, 
  EyeOff, 
  LogIn,
  UserPlus,
  Github,
  Mail
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    verification_code: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        // 登录
        const response = await apiClient.login({
          username: formData.username,
          password: formData.password
        })
        
        if (response.success) {
          // 保存token到localStorage
          if (response.data?.access_token) {
            localStorage.setItem('access_token', response.data.access_token)
          }
          
          toast({
            title: "登录成功",
            description: "欢迎回来！",
          })
          
          // 跳转到首页
          router.push('/')
        } else {
          throw new Error(response.message || '登录失败')
        }
      } else {
        // 注册
        const response = await apiClient.register({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          verification_code: formData.verification_code
        })
        
        if (response.success) {
          toast({
            title: "注册成功",
            description: "请登录您的账户",
          })
          
          setIsLogin(true)
          setFormData({ ...formData, password: '', email: '', verification_code: '' })
        } else {
          throw new Error(response.message || '注册失败')
        }
      }
    } catch (error) {
      console.error('认证失败:', error)
      toast({
        variant: "destructive",
        title: isLogin ? "登录失败" : "注册失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendVerificationCode = async () => {
    if (!formData.email) {
      toast({
        variant: "destructive",
        title: "发送失败",
        description: "请先输入邮箱地址",
      })
      return
    }

    try {
      const response = await apiClient.sendVerificationCode(formData.email)
      if (response.success) {
        toast({
          title: "发送成功",
          description: "验证码已发送到您的邮箱",
        })
      } else {
        throw new Error(response.message || '发送失败')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "发送失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Mic className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Veloera</span>
          </div>
          <p className="text-muted-foreground">音视频转录服务</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isLogin ? '登录' : '注册'}</CardTitle>
            <CardDescription>
              {isLogin ? '登录您的账户以使用转录服务' : '创建新账户开始使用'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  placeholder="请输入用户名"
                />
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required={!isLogin}
                    placeholder="请输入邮箱地址"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="请输入密码"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="verification_code">验证码</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="verification_code"
                      type="text"
                      value={formData.verification_code}
                      onChange={(e) => setFormData({ ...formData, verification_code: e.target.value })}
                      placeholder="请输入验证码"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendVerificationCode}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      发送
                    </Button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isLogin ? '登录中...' : '注册中...'}
                  </>
                ) : (
                  <>
                    {isLogin ? <LogIn className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    {isLogin ? '登录' : '注册'}
                  </>
                )}
              </Button>
            </form>

            {/* 第三方登录 */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    或使用第三方登录
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <Button variant="outline" className="w-full" asChild>
                  <a href="/api/oauth/github">
                    <Github className="h-4 w-4 mr-2" />
                    GitHub 登录
                  </a>
                </Button>
              </div>
            </div>

            {/* 切换登录/注册 */}
            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setFormData({ username: '', password: '', email: '', verification_code: '' })
                }}
              >
                {isLogin ? '没有账户？立即注册' : '已有账户？立即登录'}
              </Button>
            </div>

            {/* 返回首页 */}
            <div className="mt-4 text-center">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  返回首页
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
