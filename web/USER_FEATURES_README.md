# Veloera 用户功能

Veloera 音视频转录服务的用户功能模块，包括用户认证、个人中心、配额管理和充值功能。

## 功能概览

### 🔐 用户认证系统

#### 登录页面 (`/login`)

**功能特性**:
- 用户名/密码登录
- 用户注册
- 邮箱验证码注册
- 第三方登录（GitHub）
- 密码显示/隐藏切换
- 表单验证和错误提示

**登录流程**:
1. 输入用户名和密码
2. 点击登录按钮
3. 系统验证凭据
4. 成功后保存访问令牌
5. 跳转到首页

**注册流程**:
1. 切换到注册模式
2. 输入用户名、邮箱、密码
3. 发送邮箱验证码
4. 输入验证码
5. 完成注册
6. 自动切换到登录模式

### 👤 个人中心 (`/profile`)

**功能模块**:

#### 1. 用户信息展示
- 用户名、邮箱、注册时间
- 用户组和角色信息
- 一键复制用户名

#### 2. 配额管理
- 配额使用情况可视化
- 剩余配额实时显示
- 配额使用进度条

#### 3. 充值功能
- **充值码充值**: 支持礼品码和充值码
- **在线充值**: 微信支付、支付宝
- **充值记录**: 查看充值历史

#### 4. 使用统计
- 总任务数统计
- 完成/失败/处理中任务数
- 个人使用数据分析

#### 5. 快速操作
- 新建转录任务
- 查看任务历史
- 账户设置

### 💰 充值管理 (`/profile/topup`)

**充值方式**:

#### 1. 充值码充值
- 支持标准充值码
- 支持礼品码
- 即时到账
- 充值记录自动更新

#### 2. 在线支付
- **支付方式**: 微信支付、支付宝
- **最低金额**: 100元
- **支付流程**: 
  1. 选择充值金额
  2. 选择支付方式
  3. 创建支付订单
  4. 跳转支付页面
  5. 完成支付
  6. 自动到账

#### 3. 充值记录
- 订单号追踪
- 支付状态显示
- 充值时间记录
- 获得配额明细

### 🎯 用户体验优化

#### 1. 登录状态管理
- 自动检测登录状态
- Token过期自动处理
- 页面刷新状态保持

#### 2. 权限控制
- 未登录用户提示
- 配额不足提醒
- 管理员功能权限检查

#### 3. 实时反馈
- 配额使用实时更新
- 任务创建后配额刷新
- 充值成功即时反馈

#### 4. 响应式设计
- 移动端适配
- 触摸友好的交互
- 自适应布局

## 技术实现

### 前端技术栈
- **框架**: Next.js 15 + React 19
- **状态管理**: React Hooks + localStorage
- **UI组件**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS
- **图标**: Lucide React

### 认证机制
- **Token存储**: localStorage
- **自动刷新**: 页面加载时验证
- **过期处理**: 自动跳转登录页
- **API拦截**: 统一添加认证头

### API集成

#### 认证相关
```typescript
// 登录
POST /api/user/login
{
  username: string
  password: string
}

// 注册
POST /api/user/register
{
  username: string
  password: string
  email?: string
  verification_code?: string
}

// 发送验证码
GET /api/verification?email={email}

// 退出登录
GET /api/user/logout
```

#### 用户信息
```typescript
// 获取当前用户信息
GET /api/user/self

// 更新用户信息
PUT /api/user/self

// 获取用户统计
GET /api/user/self/transcription/stats
```

#### 充值相关
```typescript
// 充值码充值
POST /api/user/topup
{
  key: string
}

// 在线支付
POST /api/user/pay
{
  amount: number
  payment_method: string
}

// 获取支付金额
POST /api/user/amount
{
  amount: number
}
```

### 状态管理

#### 用户状态
```typescript
interface UserState {
  user: User | null
  isLoggedIn: boolean
  loading: boolean
}
```

#### 配额状态
```typescript
interface QuotaState {
  total: number
  used: number
  remaining: number
  percentage: number
}
```

## 使用指南

### 新用户注册
1. 访问 `/login` 页面
2. 点击"没有账户？立即注册"
3. 填写用户名、邮箱、密码
4. 点击"发送"获取验证码
5. 输入验证码完成注册
6. 切换到登录模式并登录

### 用户登录
1. 访问 `/login` 页面
2. 输入用户名和密码
3. 点击"登录"按钮
4. 成功后自动跳转到首页

### 查看个人信息
1. 登录后点击导航栏用户名
2. 进入个人中心页面
3. 查看用户信息和配额使用情况

### 充值配额

#### 使用充值码
1. 在个人中心点击"充值码"
2. 输入充值码
3. 点击"确认充值"
4. 配额即时到账

#### 在线支付
1. 在个人中心点击"在线充值"
2. 输入充值金额（最低100元）
3. 选择支付方式
4. 点击"立即支付"
5. 在新窗口完成支付

### 查看充值记录
1. 在个人中心点击"充值记录"
2. 查看所有充值历史
3. 跟踪订单状态

## 安全特性

### 数据保护
- 密码输入遮蔽
- 敏感信息加密传输
- Token安全存储
- 自动登出机制

### 输入验证
- 前端表单验证
- 后端数据校验
- 防止恶意输入
- 错误信息提示

### 权限控制
- 页面访问权限
- API调用权限
- 功能使用权限
- 角色基础访问控制

## 错误处理

### 常见错误
- **登录失败**: 用户名或密码错误
- **注册失败**: 用户名已存在、邮箱格式错误
- **验证码错误**: 验证码过期或错误
- **充值失败**: 充值码无效、支付失败
- **配额不足**: 无法创建新任务

### 错误提示
- Toast通知显示错误信息
- 表单字段错误高亮
- 详细错误描述
- 解决方案建议

## 性能优化

### 加载优化
- 组件懒加载
- 图片优化
- 代码分割
- 缓存策略

### 用户体验
- 加载状态指示
- 骨架屏占位
- 平滑动画过渡
- 即时反馈

## 移动端适配

### 响应式设计
- 弹性布局
- 触摸友好
- 适配不同屏幕尺寸
- 移动端优化的交互

### 移动端特性
- 触摸手势支持
- 移动端键盘适配
- 横竖屏适配
- 移动端性能优化

## 更新日志

### v1.0.0
- 完整的用户认证系统
- 个人中心功能
- 充值管理功能
- 配额管理系统
- 移动端适配

---

用户功能模块为Veloera提供了完整的用户管理和服务体验，确保用户能够方便地管理账户、查看使用情况和进行充值操作。
