'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { apiClient } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { User, TranscriptionStats } from '@/types/transcription'
import { 
  User as UserIcon, 
  CreditCard, 
  Gift, 
  Key, 
  LogOut,
  ArrowLeft,
  Wallet,
  BarChart3,
  Settings,
  Copy,
  RefreshCw,
  Plus
} from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<TranscriptionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [topUpCode, setTopUpCode] = useState('')
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(1000)
  const [paymentMethod, setPaymentMethod] = useState('wx')
  const [showTopUpDialog, setShowTopUpDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  const fetchUserData = async () => {
    try {
      const [userData, statsData] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.getUserTranscriptionStats()
      ])
      setUser(userData)
      setStats(statsData)
    } catch (error) {
      console.error('获取用户数据失败:', error)
      if (error instanceof Error && error.message.includes('401')) {
        router.push('/login')
      } else {
        toast({
          variant: "destructive",
          title: "获取数据失败",
          description: error instanceof Error ? error.message : "未知错误",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  const handleTopUp = async () => {
    if (!topUpCode.trim()) {
      toast({
        variant: "destructive",
        title: "充值失败",
        description: "请输入充值码",
      })
      return
    }

    setTopUpLoading(true)
    try {
      const response = await apiClient.topUpWithCode(topUpCode)
      if (response.success) {
        toast({
          title: "充值成功",
          description: `成功充值 ${response.data?.quota} 配额${response.data?.is_gift ? '（礼品码）' : ''}`,
        })
        setTopUpCode('')
        setShowTopUpDialog(false)
        fetchUserData() // 刷新用户数据
      } else {
        throw new Error(response.message || '充值失败')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "充值失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setTopUpLoading(false)
    }
  }

  const handlePayment = async () => {
    try {
      const response = await apiClient.requestPayment(paymentAmount, paymentMethod)
      if (response.success && response.data?.url) {
        // 打开支付页面
        window.open(response.data.url, '_blank')
        setShowPaymentDialog(false)
      } else {
        throw new Error(response.message || '创建支付订单失败')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "支付失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await apiClient.logout()
      toast({
        title: "退出成功",
        description: "您已成功退出登录",
      })
      router.push('/')
    } catch (error) {
      console.error('退出登录失败:', error)
      // 即使API调用失败，也清除本地token
      localStorage.removeItem('access_token')
      router.push('/')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "复制成功",
        description: "已复制到剪贴板",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "复制失败",
        description: "无法复制到剪贴板",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">请先登录</p>
          <Button onClick={() => router.push('/login')}>
            前往登录
          </Button>
        </div>
      </div>
    )
  }

  const quotaUsagePercentage = user.quota > 0 ? (user.used_quota / user.quota) * 100 : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回首页
              </Button>
              <h1 className="text-2xl font-bold">个人中心</h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：用户信息 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 用户基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserIcon className="h-5 w-5" />
                  <span>用户信息</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>用户名</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="font-medium">{user.username}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(user.username)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {user.email && (
                  <div>
                    <Label>邮箱</Label>
                    <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                  </div>
                )}
                
                <div>
                  <Label>注册时间</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(new Date(user.created_time * 1000).toISOString())}
                  </p>
                </div>
                
                <div>
                  <Label>用户组</Label>
                  <Badge variant="outline" className="mt-1">{user.group}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* 配额信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5" />
                  <span>配额信息</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>已用配额</span>
                    <span>{user.used_quota} / {user.quota}</span>
                  </div>
                  <Progress value={quotaUsagePercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    剩余: {user.quota - user.used_quota}
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <Dialog open={showTopUpDialog} onOpenChange={setShowTopUpDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Gift className="h-4 w-4 mr-1" />
                        充值码
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>使用充值码</DialogTitle>
                        <DialogDescription>
                          输入充值码来增加您的配额
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="topup-code">充值码</Label>
                          <Input
                            id="topup-code"
                            value={topUpCode}
                            onChange={(e) => setTopUpCode(e.target.value)}
                            placeholder="请输入充值码"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={handleTopUp} disabled={topUpLoading} className="flex-1">
                            {topUpLoading ? '充值中...' : '确认充值'}
                          </Button>
                          <Button variant="outline" onClick={() => setShowTopUpDialog(false)}>
                            取消
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <CreditCard className="h-4 w-4 mr-1" />
                        在线充值
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>在线充值</DialogTitle>
                        <DialogDescription>
                          选择充值金额和支付方式
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="amount">充值金额</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(parseInt(e.target.value))}
                            min="100"
                            step="100"
                          />
                        </div>
                        <div>
                          <Label>支付方式</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <Button
                              variant={paymentMethod === 'wx' ? 'default' : 'outline'}
                              onClick={() => setPaymentMethod('wx')}
                            >
                              微信支付
                            </Button>
                            <Button
                              variant={paymentMethod === 'zfb' ? 'default' : 'outline'}
                              onClick={() => setPaymentMethod('zfb')}
                            >
                              支付宝
                            </Button>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={handlePayment} className="flex-1">
                            立即支付
                          </Button>
                          <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                            取消
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" size="sm" asChild>
                    <a href="/profile/topup">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      充值记录
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：使用统计 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 使用统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>使用统计</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.total_tasks}</div>
                      <p className="text-sm text-muted-foreground">总任务数</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.completed_tasks}</div>
                      <p className="text-sm text-muted-foreground">已完成</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.failed_tasks}</div>
                      <p className="text-sm text-muted-foreground">失败</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.processing_tasks}</div>
                      <p className="text-sm text-muted-foreground">处理中</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无统计数据
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 快速操作 */}
            <Card>
              <CardHeader>
                <CardTitle>快速操作</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
                    <a href="/">
                      <Plus className="h-6 w-6" />
                      <span>新建转录</span>
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
                    <a href="/tasks">
                      <BarChart3 className="h-6 w-6" />
                      <span>任务历史</span>
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col space-y-2">
                    <Settings className="h-6 w-6" />
                    <span>账户设置</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
