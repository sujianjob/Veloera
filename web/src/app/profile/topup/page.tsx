'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { apiClient } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft, 
  CreditCard, 
  Gift, 
  RefreshCw,
  Plus,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

interface TopUpRecord {
  id: number
  user_id: number
  amount: number
  money: number
  trade_no: string
  status: 'pending' | 'success' | 'failed'
  create_time: number
  update_time?: number
}

export default function TopUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [records, setRecords] = useState<TopUpRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [topUpCode, setTopUpCode] = useState('')
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(1000)
  const [paymentMethod, setPaymentMethod] = useState('wx')
  const [showTopUpDialog, setShowTopUpDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  const fetchTopUpRecords = async () => {
    setLoading(true)
    try {
      // 这里需要实现获取充值记录的API
      // const response = await apiClient.getTopUpRecords()
      // setRecords(response.data)
      
      // 模拟数据
      setRecords([])
    } catch (error) {
      console.error('获取充值记录失败:', error)
      toast({
        variant: "destructive",
        title: "获取记录失败",
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopUpRecords()
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
        fetchTopUpRecords() // 刷新记录
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
        
        toast({
          title: "支付订单已创建",
          description: "请在新窗口中完成支付",
        })
        
        // 5秒后刷新记录
        setTimeout(() => {
          fetchTopUpRecords()
        }, 5000)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />成功</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />等待中</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />失败</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/profile')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回个人中心
              </Button>
              <h1 className="text-2xl font-bold">充值管理</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={fetchTopUpRecords} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：充值操作 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 充值码充值 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Gift className="h-5 w-5" />
                  <span>充值码充值</span>
                </CardTitle>
                <CardDescription>
                  使用充值码或礼品码增加配额
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="topup-code">充值码</Label>
                  <Input
                    id="topup-code"
                    value={topUpCode}
                    onChange={(e) => setTopUpCode(e.target.value)}
                    placeholder="请输入充值码"
                  />
                </div>
                <Button onClick={handleTopUp} disabled={topUpLoading} className="w-full">
                  <Gift className="h-4 w-4 mr-2" />
                  {topUpLoading ? '充值中...' : '确认充值'}
                </Button>
              </CardContent>
            </Card>

            {/* 在线充值 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>在线充值</span>
                </CardTitle>
                <CardDescription>
                  支持微信支付和支付宝
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <p className="text-xs text-muted-foreground mt-1">
                    最低充值金额：100
                  </p>
                </div>
                
                <div>
                  <Label>支付方式</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant={paymentMethod === 'wx' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('wx')}
                      size="sm"
                    >
                      微信支付
                    </Button>
                    <Button
                      variant={paymentMethod === 'zfb' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('zfb')}
                      size="sm"
                    >
                      支付宝
                    </Button>
                  </div>
                </div>
                
                <Button onClick={handlePayment} className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" />
                  立即支付
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：充值记录 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>充值记录</CardTitle>
                <CardDescription>
                  查看您的充值历史记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : records.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">暂无充值记录</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      完成首次充值后，记录将显示在这里
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {records.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="font-medium">订单号: {record.trade_no}</span>
                            {getStatusBadge(record.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">充值金额:</span>
                              <br />
                              ¥{record.money}
                            </div>
                            <div>
                              <span className="font-medium">获得配额:</span>
                              <br />
                              {record.amount}
                            </div>
                            <div>
                              <span className="font-medium">创建时间:</span>
                              <br />
                              {formatDate(new Date(record.create_time * 1000).toISOString())}
                            </div>
                            {record.update_time && (
                              <div>
                                <span className="font-medium">更新时间:</span>
                                <br />
                                {formatDate(new Date(record.update_time * 1000).toISOString())}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
