package transcription

import (
	"context"
	"io"
	"time"
	"veloera/constant"
	"veloera/model"
)

// TranscriptionAdaptor 转录引擎适配器接口
type TranscriptionAdaptor interface {
	// 基本信息
	GetEngineName() string
	GetEngineType() int
	
	// 能力查询
	GetSupportedFormats() []string
	GetSupportedLanguages() []string
	GetMaxFileSize() int64
	GetMaxDuration() int
	GetSupportedOutputFormats() []string
	
	// 验证方法
	ValidateFile(filePath string, fileSize int64, duration int) error
	ValidateConfig(task *model.TranscriptionTask) error
	
	// 核心功能
	SubmitTask(ctx context.Context, task *model.TranscriptionTask, fileReader io.Reader) error
	QueryTaskStatus(ctx context.Context, task *model.TranscriptionTask) error
	GetResult(ctx context.Context, task *model.TranscriptionTask) (*model.TranscriptionResult, error)
	CancelTask(ctx context.Context, task *model.TranscriptionTask) error
	
	// 配置管理
	SetConfig(config map[string]interface{}) error
	GetConfig() map[string]interface{}
	
	// 健康检查
	HealthCheck(ctx context.Context) error
}

// AdaptorConfig 适配器配置
type AdaptorConfig struct {
	APIKey      string                 `json:"api_key"`
	BaseURL     string                 `json:"base_url"`
	Region      string                 `json:"region"`
	Timeout     int                    `json:"timeout"`
	MaxRetries  int                    `json:"max_retries"`
	ExtraConfig map[string]interface{} `json:"extra_config"`
}

// TranscriptionRequest 转录请求
type TranscriptionRequest struct {
	TaskID           int64             `json:"task_id"`
	Language         string            `json:"language"`
	Model            string            `json:"model"`
	EnableTimestamps bool              `json:"enable_timestamps"`
	EnableSpeaker    bool              `json:"enable_speaker"`
	OutputFormat     string            `json:"output_format"`
	Quality          string            `json:"quality"`
	ExtraParams      map[string]interface{} `json:"extra_params"`
}

// TranscriptionResponse 转录响应
type TranscriptionResponse struct {
	TaskID          string                    `json:"task_id"`
	Status          string                    `json:"status"`
	Progress        int                       `json:"progress"`
	Result          *model.TranscriptionResult `json:"result,omitempty"`
	ErrorMessage    string                    `json:"error_message,omitempty"`
	ErrorCode       string                    `json:"error_code,omitempty"`
	EstimatedTime   int                       `json:"estimated_time,omitempty"`
}

// BaseAdaptor 基础适配器，提供通用功能
type BaseAdaptor struct {
	Config     *AdaptorConfig
	EngineName string
	EngineType int

	// 引擎能力配置
	MaxFileSize        int64
	MaxDuration        int
	SupportedFormats   []string
	SupportedLanguages []string
	SupportedOutputFormats []string
}

// 实现基础方法
func (b *BaseAdaptor) GetEngineName() string {
	return b.EngineName
}

func (b *BaseAdaptor) GetEngineType() int {
	return b.EngineType
}

func (b *BaseAdaptor) GetSupportedFormats() []string {
	if len(b.SupportedFormats) == 0 {
		return constant.GetAllSupportedFormats()
	}
	return b.SupportedFormats
}

func (b *BaseAdaptor) GetSupportedLanguages() []string {
	if len(b.SupportedLanguages) == 0 {
		return constant.GetSupportedLanguageCodes()
	}
	return b.SupportedLanguages
}

func (b *BaseAdaptor) GetMaxFileSize() int64 {
	if b.MaxFileSize == 0 {
		return constant.DefaultMaxFileSize
	}
	return b.MaxFileSize
}

func (b *BaseAdaptor) GetMaxDuration() int {
	if b.MaxDuration == 0 {
		return constant.DefaultMaxDuration
	}
	return b.MaxDuration
}

func (b *BaseAdaptor) GetSupportedOutputFormats() []string {
	if len(b.SupportedOutputFormats) == 0 {
		return []string{"json", "srt", "txt", "vtt"}
	}
	return b.SupportedOutputFormats
}

func (b *BaseAdaptor) SetConfig(config map[string]interface{}) error {
	// 基础配置设置逻辑
	if apiKey, ok := config["api_key"].(string); ok {
		b.Config.APIKey = apiKey
	}
	if baseURL, ok := config["base_url"].(string); ok {
		b.Config.BaseURL = baseURL
	}
	if region, ok := config["region"].(string); ok {
		b.Config.Region = region
	}
	if timeout, ok := config["timeout"].(int); ok {
		b.Config.Timeout = timeout
	}
	if maxRetries, ok := config["max_retries"].(int); ok {
		b.Config.MaxRetries = maxRetries
	}
	
	// 存储额外配置
	if b.Config.ExtraConfig == nil {
		b.Config.ExtraConfig = make(map[string]interface{})
	}
	for k, v := range config {
		if k != "api_key" && k != "base_url" && k != "region" && k != "timeout" && k != "max_retries" {
			b.Config.ExtraConfig[k] = v
		}
	}
	
	return nil
}

func (b *BaseAdaptor) GetConfig() map[string]interface{} {
	config := map[string]interface{}{
		"api_key":     b.Config.APIKey,
		"base_url":    b.Config.BaseURL,
		"region":      b.Config.Region,
		"timeout":     b.Config.Timeout,
		"max_retries": b.Config.MaxRetries,
	}
	
	// 添加额外配置
	for k, v := range b.Config.ExtraConfig {
		config[k] = v
	}
	
	return config
}

// ValidateFile 基础文件验证
func (b *BaseAdaptor) ValidateFile(filePath string, fileSize int64, duration int) error {
	// 检查文件大小
	if fileSize > b.GetMaxFileSize() {
		return NewTranscriptionError(ErrorCodeFileTooLarge, "文件大小超出限制")
	}
	
	// 检查时长
	if duration > b.GetMaxDuration() {
		return NewTranscriptionError(ErrorCodeDurationTooLong, "音视频时长超出限制")
	}
	
	return nil
}

// ValidateConfig 基础配置验证
func (b *BaseAdaptor) ValidateConfig(task *model.TranscriptionTask) error {
	// 检查语言支持
	supportedLangs := b.GetSupportedLanguages()
	if !contains(supportedLangs, task.Language) {
		return NewTranscriptionError(ErrorCodeUnsupportedLanguage, "不支持的语言")
	}
	
	// 检查输出格式支持
	supportedFormats := b.GetSupportedOutputFormats()
	if !contains(supportedFormats, task.OutputFormat) {
		return NewTranscriptionError(ErrorCodeUnsupportedFormat, "不支持的输出格式")
	}
	
	return nil
}

// TranscriptionError 转录错误
type TranscriptionError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *TranscriptionError) Error() string {
	return e.Message
}

// 错误代码常量
const (
	ErrorCodeFileTooLarge        = "FILE_TOO_LARGE"
	ErrorCodeDurationTooLong     = "DURATION_TOO_LONG"
	ErrorCodeUnsupportedLanguage = "UNSUPPORTED_LANGUAGE"
	ErrorCodeUnsupportedFormat   = "UNSUPPORTED_FORMAT"
	ErrorCodeAPIError            = "API_ERROR"
	ErrorCodeNetworkError        = "NETWORK_ERROR"
	ErrorCodeConfigError         = "CONFIG_ERROR"
	ErrorCodeTaskNotFound        = "TASK_NOT_FOUND"
	ErrorCodeInvalidResponse     = "INVALID_RESPONSE"
)

// NewTranscriptionError 创建转录错误
func NewTranscriptionError(code, message string) *TranscriptionError {
	return &TranscriptionError{
		Code:    code,
		Message: message,
	}
}

// 工具函数
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// AdaptorFactory 适配器工厂
type AdaptorFactory struct {
	adaptors map[int]func(*AdaptorConfig) TranscriptionAdaptor
}

// NewAdaptorFactory 创建适配器工厂
func NewAdaptorFactory() *AdaptorFactory {
	return &AdaptorFactory{
		adaptors: make(map[int]func(*AdaptorConfig) TranscriptionAdaptor),
	}
}

// RegisterAdaptor 注册适配器
func (f *AdaptorFactory) RegisterAdaptor(engineType int, creator func(*AdaptorConfig) TranscriptionAdaptor) {
	f.adaptors[engineType] = creator
}

// CreateAdaptor 创建适配器实例
func (f *AdaptorFactory) CreateAdaptor(engineType int, config *AdaptorConfig) (TranscriptionAdaptor, error) {
	creator, exists := f.adaptors[engineType]
	if !exists {
		return nil, NewTranscriptionError(ErrorCodeConfigError, "不支持的转录引擎类型")
	}
	
	return creator(config), nil
}

// GetSupportedEngines 获取支持的引擎列表
func (f *AdaptorFactory) GetSupportedEngines() []int {
	engines := make([]int, 0, len(f.adaptors))
	for engineType := range f.adaptors {
		engines = append(engines, engineType)
	}
	return engines
}

// 全局适配器工厂实例
var GlobalAdaptorFactory = NewAdaptorFactory()

// 注册所有适配器的函数
func RegisterAllAdaptors() {
	// 这里会在各个适配器包的init函数中调用
	// 例如：GlobalAdaptorFactory.RegisterAdaptor(constant.EngineTypeWhisper, NewWhisperAdaptor)
}

// TaskManager 任务管理器接口
type TaskManager interface {
	// 提交任务
	SubmitTask(task *model.TranscriptionTask) error
	
	// 查询任务状态
	QueryTask(taskID int64) (*model.TranscriptionTask, error)
	
	// 取消任务
	CancelTask(taskID int64) error
	
	// 获取任务结果
	GetTaskResult(taskID int64, format string) ([]byte, error)
	
	// 清理过期任务
	CleanupExpiredTasks() error
}

// EngineManager 引擎管理器接口
type EngineManager interface {
	// 获取可用引擎
	GetAvailableEngines(language string, fileFormat string) ([]TranscriptionAdaptor, error)
	
	// 选择最佳引擎
	SelectBestEngine(task *model.TranscriptionTask) (TranscriptionAdaptor, error)
	
	// 健康检查
	HealthCheckEngines() map[int]bool
	
	// 获取引擎统计
	GetEngineStats() map[int]map[string]interface{}
}

// FileManager 文件管理器接口
type FileManager interface {
	// 上传文件
	UploadFile(userID int, filename string, fileReader io.Reader) (*model.FileStorage, error)
	
	// 下载文件
	DownloadFile(fileID int64, userID int) (io.ReadCloser, error)
	
	// 删除文件
	DeleteFile(fileID int64, userID int) error
	
	// 清理过期文件
	CleanupExpiredFiles() error
	
	// 获取文件信息
	GetFileInfo(fileID int64, userID int) (*model.FileStorage, error)
}

// NotificationManager 通知管理器接口
type NotificationManager interface {
	// 发送任务完成通知
	NotifyTaskCompleted(task *model.TranscriptionTask) error
	
	// 发送任务失败通知
	NotifyTaskFailed(task *model.TranscriptionTask) error
	
	// 发送配额不足通知
	NotifyQuotaInsufficient(userID int, requiredQuota int) error
	
	// 发送系统通知
	NotifySystem(message string, level string) error
}

// BillingManager 计费管理器接口
type BillingManager interface {
	// 计算转录费用
	CalculateTranscriptionCost(task *model.TranscriptionTask) (int, error)
	
	// 预扣费用
	PreDeductQuota(userID int, estimatedCost int) error
	
	// 确认扣费
	ConfirmDeduction(userID int, actualCost int, preDeductedCost int) error
	
	// 退还费用
	RefundQuota(userID int, amount int, reason string) error
	
	// 获取计费统计
	GetBillingStats(userID int, startTime, endTime time.Time) (map[string]interface{}, error)
}

// QueueManager 队列管理器接口
type QueueManager interface {
	// 添加任务到队列
	EnqueueTask(task *model.TranscriptionTask) error
	
	// 从队列获取任务
	DequeueTask() (*model.TranscriptionTask, error)
	
	// 获取队列状态
	GetQueueStatus() map[string]interface{}
	
	// 清空队列
	ClearQueue() error
}

// MetricsCollector 指标收集器接口
type MetricsCollector interface {
	// 记录任务指标
	RecordTaskMetrics(task *model.TranscriptionTask, duration time.Duration) error
	
	// 记录引擎指标
	RecordEngineMetrics(engineType int, success bool, responseTime time.Duration) error
	
	// 记录用户指标
	RecordUserMetrics(userID int, action string, value float64) error
	
	// 获取指标数据
	GetMetrics(metricName string, startTime, endTime time.Time) ([]map[string]interface{}, error)
}
