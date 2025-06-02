package constant

// 转录引擎类型常量
const (
	EngineTypeWhisper   = 1 // OpenAI Whisper
	EngineTypeAliCloud  = 2 // 阿里云语音识别
	EngineTypeTencent   = 3 // 腾讯云语音识别
	EngineTypeBaidu     = 4 // 百度语音识别
	EngineTypeXunfei    = 5 // 讯飞语音识别
	EngineTypeAzure     = 6 // Azure Speech Services
	EngineTypeAWS       = 7 // AWS Transcribe
	EngineTypeGoogle    = 8 // Google Speech-to-Text
	EngineTypeLocal     = 9 // 本地部署引擎
)

// 转录引擎名称映射
var EngineNames = map[int]string{
	EngineTypeWhisper:  "OpenAI Whisper",
	EngineTypeAliCloud: "阿里云语音识别",
	EngineTypeTencent:  "腾讯云语音识别",
	EngineTypeBaidu:    "百度语音识别",
	EngineTypeXunfei:   "讯飞语音识别",
	EngineTypeAzure:    "Azure Speech Services",
	EngineTypeAWS:      "AWS Transcribe",
	EngineTypeGoogle:   "Google Speech-to-Text",
	EngineTypeLocal:    "本地部署引擎",
}

// 任务状态常量
const (
	TaskStatusPending    = "pending"
	TaskStatusUploading  = "uploading"
	TaskStatusProcessing = "processing"
	TaskStatusCompleted  = "completed"
	TaskStatusFailed     = "failed"
	TaskStatusCancelled  = "cancelled"
)

// 文件类型常量
const (
	FileTypeOriginal = "original"
	FileTypeResult   = "result"
)

// 输出格式常量
const (
	OutputFormatJSON = "json"
	OutputFormatSRT  = "srt"
	OutputFormatTXT  = "txt"
	OutputFormatVTT  = "vtt"
)

// 支持的音视频格式
var SupportedAudioFormats = []string{
	"mp3", "mp4", "wav", "m4a", "flac", "aac", "ogg", "wma", "amr",
}

var SupportedVideoFormats = []string{
	"mp4", "avi", "mov", "mkv", "wmv", "flv", "webm",
}

// 获取所有支持的格式
func GetAllSupportedFormats() []string {
	formats := make([]string, 0, len(SupportedAudioFormats)+len(SupportedVideoFormats))
	formats = append(formats, SupportedAudioFormats...)
	formats = append(formats, SupportedVideoFormats...)
	return formats
}

// 支持的语言代码
var SupportedLanguages = map[string]string{
	"auto": "自动检测",
	"zh":   "中文",
	"en":   "英语",
	"ja":   "日语",
	"ko":   "韩语",
	"es":   "西班牙语",
	"fr":   "法语",
	"de":   "德语",
	"ru":   "俄语",
	"it":   "意大利语",
	"pt":   "葡萄牙语",
	"ar":   "阿拉伯语",
	"hi":   "印地语",
	"th":   "泰语",
	"vi":   "越南语",
}

// 获取语言代码列表
func GetSupportedLanguageCodes() []string {
	codes := make([]string, 0, len(SupportedLanguages))
	for code := range SupportedLanguages {
		codes = append(codes, code)
	}
	return codes
}

// MIME类型映射
var MimeTypeMap = map[string]string{
	"mp3":  "audio/mpeg",
	"mp4":  "video/mp4",
	"wav":  "audio/wav",
	"m4a":  "audio/mp4",
	"flac": "audio/flac",
	"aac":  "audio/aac",
	"ogg":  "audio/ogg",
	"wma":  "audio/x-ms-wma",
	"amr":  "audio/amr",
	"avi":  "video/x-msvideo",
	"mov":  "video/quicktime",
	"mkv":  "video/x-matroska",
	"wmv":  "video/x-ms-wmv",
	"flv":  "video/x-flv",
	"webm": "video/webm",
}

// 默认配置常量
const (
	DefaultMaxFileSize     = 100 * 1024 * 1024 // 100MB
	DefaultMaxDuration     = 3600               // 1小时
	DefaultRetentionDays   = 30                 // 文件保留30天
	DefaultPricePerMinute  = 0.1                // 每分钟0.1元
	DefaultPricePerMB      = 0.05               // 每MB 0.05元
	DefaultOutputFormat    = OutputFormatJSON
	DefaultLanguage        = "auto"
	DefaultEnableTimestamp = true
	DefaultEnableSpeaker   = false
)

// 错误代码常量
const (
	ErrCodeFileNotSupported    = "FILE_NOT_SUPPORTED"
	ErrCodeFileTooLarge        = "FILE_TOO_LARGE"
	ErrCodeDurationTooLong     = "DURATION_TOO_LONG"
	ErrCodeInsufficientQuota   = "INSUFFICIENT_QUOTA"
	ErrCodeEngineUnavailable   = "ENGINE_UNAVAILABLE"
	ErrCodeTranscriptionFailed = "TRANSCRIPTION_FAILED"
	ErrCodeFileNotFound        = "FILE_NOT_FOUND"
	ErrCodeTaskNotFound        = "TASK_NOT_FOUND"
	ErrCodeInvalidFormat       = "INVALID_FORMAT"
	ErrCodeUploadFailed        = "UPLOAD_FAILED"
)

// 错误消息映射
var ErrorMessages = map[string]string{
	ErrCodeFileNotSupported:    "不支持的文件格式",
	ErrCodeFileTooLarge:        "文件大小超出限制",
	ErrCodeDurationTooLong:     "音视频时长超出限制",
	ErrCodeInsufficientQuota:   "配额不足",
	ErrCodeEngineUnavailable:   "转录引擎不可用",
	ErrCodeTranscriptionFailed: "转录失败",
	ErrCodeFileNotFound:        "文件不存在",
	ErrCodeTaskNotFound:        "任务不存在",
	ErrCodeInvalidFormat:       "无效的输出格式",
	ErrCodeUploadFailed:        "文件上传失败",
}

// 转录模式常量
const (
	TranscriptionModeStandard = "standard" // 标准模式
	TranscriptionModeFast     = "fast"     // 快速模式
	TranscriptionModeAccurate = "accurate" // 高精度模式
)

// 说话人识别模式
const (
	SpeakerModeNone     = "none"     // 不识别说话人
	SpeakerModeSimple   = "simple"   // 简单说话人识别
	SpeakerModeAdvanced = "advanced" // 高级说话人识别
)

// 时间戳粒度
const (
	TimestampGranularityWord    = "word"    // 词级别时间戳
	TimestampGranularitySegment = "segment" // 句子级别时间戳
)

// 质量等级
const (
	QualityLevelLow    = "low"    // 低质量，快速
	QualityLevelMedium = "medium" // 中等质量
	QualityLevelHigh   = "high"   // 高质量，慢速
)

// 计费类型
const (
	BillingTypeDuration = "duration" // 按时长计费
	BillingTypeFileSize = "filesize" // 按文件大小计费
	BillingTypeRequest  = "request"  // 按请求次数计费
)

// 存储类型
const (
	StorageTypeLocal = "local" // 本地存储
	StorageTypeOSS   = "oss"   // 阿里云OSS
	StorageTypeS3    = "s3"    // AWS S3
	StorageTypeCOS   = "cos"   // 腾讯云COS
)

// 通知类型
const (
	NotificationTypeEmail   = "email"   // 邮件通知
	NotificationTypeWebhook = "webhook" // Webhook通知
	NotificationTypeSMS     = "sms"     // 短信通知
)

// 任务优先级
const (
	PriorityLow    = 1 // 低优先级
	PriorityNormal = 2 // 普通优先级
	PriorityHigh   = 3 // 高优先级
	PriorityUrgent = 4 // 紧急优先级
)

// 缓存键前缀
const (
	CacheKeyTranscriptionTask   = "transcription:task:"
	CacheKeyTranscriptionEngine = "transcription:engine:"
	CacheKeyUserQuota           = "transcription:quota:"
	CacheKeyFileInfo            = "transcription:file:"
)

// 队列名称
const (
	QueueNameTranscription = "transcription_queue"
	QueueNameNotification  = "notification_queue"
	QueueNameCleanup       = "cleanup_queue"
)

// 日志类型
const (
	LogTypeTranscriptionStart    = "transcription_start"
	LogTypeTranscriptionComplete = "transcription_complete"
	LogTypeTranscriptionFailed   = "transcription_failed"
	LogTypeFileUpload            = "file_upload"
	LogTypeFileDownload          = "file_download"
	LogTypeQuotaDeduction        = "quota_deduction"
)

// 检查文件格式是否支持
func IsAudioFormat(ext string) bool {
	for _, format := range SupportedAudioFormats {
		if format == ext {
			return true
		}
	}
	return false
}

// 检查视频格式是否支持
func IsVideoFormat(ext string) bool {
	for _, format := range SupportedVideoFormats {
		if format == ext {
			return true
		}
	}
	return false
}

// 检查格式是否支持
func IsSupportedFormat(ext string) bool {
	return IsAudioFormat(ext) || IsVideoFormat(ext)
}

// 获取MIME类型
func GetMimeType(ext string) string {
	if mimeType, exists := MimeTypeMap[ext]; exists {
		return mimeType
	}
	return "application/octet-stream"
}

// 检查语言是否支持
func IsSupportedLanguage(lang string) bool {
	_, exists := SupportedLanguages[lang]
	return exists
}

// 检查输出格式是否支持
func IsSupportedOutputFormat(format string) bool {
	return format == OutputFormatJSON || format == OutputFormatSRT || 
		   format == OutputFormatTXT || format == OutputFormatVTT
}

// 获取错误消息
func GetErrorMessage(code string) string {
	if msg, exists := ErrorMessages[code]; exists {
		return msg
	}
	return "未知错误"
}
