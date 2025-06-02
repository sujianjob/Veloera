package service

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"veloera/common"
	"veloera/constant"
	"veloera/model"
	"veloera/service/transcription"
	_ "veloera/service/transcription/whisper" // 注册 Whisper 适配器

	"github.com/google/uuid"
)

// TranscriptionService 转录服务
type TranscriptionService struct {
	adaptorFactory *transcription.AdaptorFactory
	storageConfig  *StorageConfig
}

// StorageConfig 存储配置
type StorageConfig struct {
	Type      string // local, oss, s3
	LocalPath string
	MaxSize   int64
	RetentionDays int
}

// NewTranscriptionService 创建转录服务
func NewTranscriptionService() *TranscriptionService {
	return &TranscriptionService{
		adaptorFactory: transcription.GlobalAdaptorFactory,
		storageConfig: &StorageConfig{
			Type:          common.GetEnvOrDefaultString("STORAGE_TYPE", "local"),
			LocalPath:     common.GetEnvOrDefaultString("STORAGE_PATH", "./data/transcription"),
			MaxSize:       int64(common.GetEnvOrDefault("MAX_FILE_SIZE", 100*1024*1024)),
			RetentionDays: common.GetEnvOrDefault("FILE_RETENTION_DAYS", 30),
		},
	}
}

// CreateTranscriptionTask 创建转录任务
func (ts *TranscriptionService) CreateTranscriptionTask(userID int, tokenID *int, req *TranscriptionRequest) (*model.TranscriptionTask, error) {
	// 验证用户配额
	user, err := model.GetUserById(userID, false)
	if err != nil {
		return nil, fmt.Errorf("获取用户信息失败: %w", err)
	}
	
	// 估算费用
	estimatedCost := ts.estimateTranscriptionCost(req.FileSize, req.Duration, req.Language)
	if user.Quota < estimatedCost {
		return nil, fmt.Errorf("配额不足，需要 %d，当前 %d", estimatedCost, user.Quota)
	}
	
	// 选择转录引擎
	channel, err := ts.selectTranscriptionEngine(req.Language, req.FileType)
	if err != nil {
		return nil, fmt.Errorf("选择转录引擎失败: %w", err)
	}
	
	// 创建任务
	task := &model.TranscriptionTask{
		UserID:           userID,
		TokenID:          tokenID,
		ChannelID:        channel.Id,
		OriginalFilename: req.Filename,
		FileSize:         req.FileSize,
		FileType:         req.FileType,
		Duration:         req.Duration,
		Language:         req.Language,
		ModelName:        req.ModelName,
		EnableTimestamps: req.EnableTimestamps,
		EnableSpeaker:    req.EnableSpeaker,
		OutputFormat:     req.OutputFormat,
		Quality:          req.Quality,
		Priority:         req.Priority,
		Status:           constant.TaskStatusPending,
		QuotaCost:        estimatedCost,
		BillingType:      constant.BillingTypeDuration,
	}
	
	if err := task.Insert(); err != nil {
		return nil, fmt.Errorf("创建任务失败: %w", err)
	}
	
	// 记录日志
	ts.logTranscriptionEvent(task, constant.LogTypeTranscriptionStart, "转录任务创建")
	
	return task, nil
}

// ProcessTranscriptionTask 处理转录任务
func (ts *TranscriptionService) ProcessTranscriptionTask(task *model.TranscriptionTask, fileReader io.Reader) error {
	ctx := context.Background()
	
	// 更新任务状态为上传中
	if err := task.UpdateStatus(constant.TaskStatusUploading, 10, ""); err != nil {
		return fmt.Errorf("更新任务状态失败: %w", err)
	}
	
	// 保存文件
	filePath, err := ts.saveUploadedFile(task, fileReader)
	if err != nil {
		task.UpdateStatus(constant.TaskStatusFailed, 0, "文件保存失败: "+err.Error())
		return fmt.Errorf("保存文件失败: %w", err)
	}
	
	task.FilePath = filePath
	task.Update()
	
	// 创建文件存储记录
	fileStorage := &model.FileStorage{
		UserID:       task.UserID,
		TaskID:       &task.ID,
		FileType:     constant.FileTypeOriginal,
		OriginalName: task.OriginalFilename,
		StoredName:   filepath.Base(filePath),
		FilePath:     filePath,
		FileSize:     task.FileSize,
		MimeType:     constant.GetMimeType(task.FileType),
		StorageType:  ts.storageConfig.Type,
	}
	
	// 设置过期时间
	expiresAt := time.Now().AddDate(0, 0, ts.storageConfig.RetentionDays)
	fileStorage.ExpiresAt = &expiresAt
	
	if err := fileStorage.Insert(); err != nil {
		return fmt.Errorf("创建文件存储记录失败: %w", err)
	}
	
	// 更新任务状态为处理中
	if err := task.UpdateStatus(constant.TaskStatusProcessing, 20, ""); err != nil {
		return fmt.Errorf("更新任务状态失败: %w", err)
	}
	
	// 异步处理转录
	go ts.processTranscriptionAsync(task)
	
	return nil
}

// processTranscriptionAsync 异步处理转录
func (ts *TranscriptionService) processTranscriptionAsync(task *model.TranscriptionTask) {
	ctx := context.Background()
	
	// 获取转录引擎
	adaptor, err := ts.GetTranscriptionAdaptor(task.ChannelID)
	if err != nil {
		task.UpdateStatus(constant.TaskStatusFailed, 0, "获取转录引擎失败: "+err.Error())
		ts.logTranscriptionEvent(task, constant.LogTypeTranscriptionFailed, "获取转录引擎失败")
		return
	}
	
	// 打开文件
	file, err := os.Open(task.FilePath)
	if err != nil {
		task.UpdateStatus(constant.TaskStatusFailed, 0, "打开文件失败: "+err.Error())
		ts.logTranscriptionEvent(task, constant.LogTypeTranscriptionFailed, "打开文件失败")
		return
	}
	defer file.Close()
	
	// 预扣配额
	if err := ts.preDeductQuota(task.UserID, task.QuotaCost); err != nil {
		task.UpdateStatus(constant.TaskStatusFailed, 0, "配额扣除失败: "+err.Error())
		ts.logTranscriptionEvent(task, constant.LogTypeTranscriptionFailed, "配额扣除失败")
		return
	}
	
	// 提交转录任务
	if err := adaptor.SubmitTask(ctx, task, file); err != nil {
		task.UpdateStatus(constant.TaskStatusFailed, 0, "转录失败: "+err.Error())
		ts.logTranscriptionEvent(task, constant.LogTypeTranscriptionFailed, "转录失败")
		// 退还配额
		ts.refundQuota(task.UserID, task.QuotaCost, "转录失败退款")
		return
	}
	
	// 获取转录结果
	result, err := adaptor.GetResult(ctx, task)
	if err != nil {
		task.UpdateStatus(constant.TaskStatusFailed, 0, "获取结果失败: "+err.Error())
		ts.logTranscriptionEvent(task, constant.LogTypeTranscriptionFailed, "获取结果失败")
		ts.refundQuota(task.UserID, task.QuotaCost, "获取结果失败退款")
		return
	}
	
	// 保存转录结果
	if err := ts.saveTranscriptionResult(task, result); err != nil {
		task.UpdateStatus(constant.TaskStatusFailed, 0, "保存结果失败: "+err.Error())
		ts.logTranscriptionEvent(task, constant.LogTypeTranscriptionFailed, "保存结果失败")
		return
	}
	
	// 更新任务状态为完成
	if err := task.SetResult(result, task.ResultFilePath); err != nil {
		task.UpdateStatus(constant.TaskStatusFailed, 0, "更新任务状态失败: "+err.Error())
		ts.logTranscriptionEvent(task, constant.LogTypeTranscriptionFailed, "更新任务状态失败")
		return
	}
	
	// 记录成功日志
	ts.logTranscriptionEvent(task, constant.LogTypeTranscriptionComplete, "转录完成")
	
	// 发送通知（如果配置了）
	ts.sendTaskCompletionNotification(task)
}

// saveUploadedFile 保存上传的文件
func (ts *TranscriptionService) saveUploadedFile(task *model.TranscriptionTask, fileReader io.Reader) (string, error) {
	// 确保存储目录存在
	if err := os.MkdirAll(ts.storageConfig.LocalPath, 0755); err != nil {
		return "", fmt.Errorf("创建存储目录失败: %w", err)
	}
	
	// 生成唯一文件名
	ext := filepath.Ext(task.OriginalFilename)
	filename := fmt.Sprintf("%d_%s%s", task.ID, uuid.New().String(), ext)
	filePath := filepath.Join(ts.storageConfig.LocalPath, filename)
	
	// 创建文件
	file, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("创建文件失败: %w", err)
	}
	defer file.Close()
	
	// 复制文件内容
	written, err := io.Copy(file, fileReader)
	if err != nil {
		os.Remove(filePath) // 清理失败的文件
		return "", fmt.Errorf("写入文件失败: %w", err)
	}
	
	// 验证文件大小
	if written != task.FileSize {
		os.Remove(filePath)
		return "", fmt.Errorf("文件大小不匹配，期望 %d，实际 %d", task.FileSize, written)
	}
	
	return filePath, nil
}

// saveTranscriptionResult 保存转录结果
func (ts *TranscriptionService) saveTranscriptionResult(task *model.TranscriptionTask, result *model.TranscriptionResult) error {
	// 生成结果文件路径
	resultDir := filepath.Join(ts.storageConfig.LocalPath, "results")
	if err := os.MkdirAll(resultDir, 0755); err != nil {
		return fmt.Errorf("创建结果目录失败: %w", err)
	}
	
	// 保存不同格式的结果文件
	formats := []string{constant.OutputFormatJSON, constant.OutputFormatSRT, constant.OutputFormatTXT, constant.OutputFormatVTT}
	
	for _, format := range formats {
		filename := fmt.Sprintf("%d_result.%s", task.ID, format)
		filePath := filepath.Join(resultDir, filename)
		
		var content string
		switch format {
		case constant.OutputFormatJSON:
			jsonData, err := result.ToJSON()
			if err != nil {
				return fmt.Errorf("转换JSON格式失败: %w", err)
			}
			content = jsonData
		case constant.OutputFormatSRT:
			content = result.ToSRT()
		case constant.OutputFormatTXT:
			content = result.Text
		case constant.OutputFormatVTT:
			content = result.ToVTT()
		}
		
		if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
			return fmt.Errorf("保存%s格式结果失败: %w", format, err)
		}
		
		// 如果是用户请求的格式，设置为主结果文件
		if format == task.OutputFormat {
			task.ResultFilePath = filePath
		}
		
		// 创建结果文件存储记录
		fileStorage := &model.FileStorage{
			UserID:       task.UserID,
			TaskID:       &task.ID,
			FileType:     constant.FileTypeResult,
			OriginalName: filename,
			StoredName:   filename,
			FilePath:     filePath,
			FileSize:     int64(len(content)),
			MimeType:     ts.getResultMimeType(format),
			StorageType:  ts.storageConfig.Type,
		}
		
		// 设置过期时间
		expiresAt := time.Now().AddDate(0, 0, ts.storageConfig.RetentionDays)
		fileStorage.ExpiresAt = &expiresAt
		
		fileStorage.Insert()
	}
	
	return nil
}

// getResultMimeType 获取结果文件的MIME类型
func (ts *TranscriptionService) getResultMimeType(format string) string {
	switch format {
	case constant.OutputFormatJSON:
		return "application/json"
	case constant.OutputFormatSRT:
		return "application/x-subrip"
	case constant.OutputFormatTXT:
		return "text/plain"
	case constant.OutputFormatVTT:
		return "text/vtt"
	default:
		return "application/octet-stream"
	}
}

// selectTranscriptionEngine 选择转录引擎
func (ts *TranscriptionService) selectTranscriptionEngine(language, fileType string) (*model.Channel, error) {
	// 获取支持该语言的渠道
	channels, err := model.GetChannelsByType(0) // 0表示所有类型
	if err != nil {
		return nil, fmt.Errorf("获取渠道列表失败: %w", err)
	}
	
	var availableChannels []model.Channel
	for _, channel := range channels {
		if channel.Status == 1 { // 启用状态
			// 检查是否支持该语言
			supportedLangs := strings.Split(channel.SupportedLanguages, ",")
			if contains(supportedLangs, language) || contains(supportedLangs, "auto") {
				// 检查是否支持该文件格式
				supportedFormats := strings.Split(channel.SupportedFormats, ",")
				if contains(supportedFormats, fileType) {
					availableChannels = append(availableChannels, channel)
				}
			}
		}
	}
	
	if len(availableChannels) == 0 {
		return nil, fmt.Errorf("没有可用的转录引擎支持语言 %s 和格式 %s", language, fileType)
	}
	
	// 简单的负载均衡：选择权重最高的渠道
	bestChannel := &availableChannels[0]
	for i := 1; i < len(availableChannels); i++ {
		if availableChannels[i].Weight > bestChannel.Weight {
			bestChannel = &availableChannels[i]
		}
	}
	
	return bestChannel, nil
}

// GetTranscriptionAdaptor 获取转录适配器
func (ts *TranscriptionService) GetTranscriptionAdaptor(channelID int) (transcription.TranscriptionAdaptor, error) {
	channel, err := model.GetChannelById(channelID, false)
	if err != nil {
		return nil, fmt.Errorf("获取渠道信息失败: %w", err)
	}
	
	config := &transcription.AdaptorConfig{
		APIKey:  channel.Key,
		BaseURL: channel.BaseURL,
		Timeout: 300, // 5分钟超时
	}
	
	adaptor, err := ts.adaptorFactory.CreateAdaptor(channel.EngineType, config)
	if err != nil {
		return nil, fmt.Errorf("创建适配器失败: %w", err)
	}
	
	return adaptor, nil
}

// estimateTranscriptionCost 估算转录费用
func (ts *TranscriptionService) estimateTranscriptionCost(fileSize int64, duration *int, language string) int {
	// 基础费用：每分钟0.1元，转换为配额（1元=1000配额）
	baseCostPerMinute := 100 // 配额单位
	
	var estimatedDuration int
	if duration != nil {
		estimatedDuration = *duration
	} else {
		// 根据文件大小估算时长（粗略估算：1MB约1分钟）
		estimatedDuration = int(fileSize / (1024 * 1024))
		if estimatedDuration < 60 {
			estimatedDuration = 60 // 最少按1分钟计算
		}
	}
	
	minutes := (estimatedDuration + 59) / 60 // 向上取整到分钟
	cost := minutes * baseCostPerMinute
	
	// 语言倍率
	if language != "zh" && language != "en" {
		cost = int(float64(cost) * 1.2) // 其他语言增加20%费用
	}
	
	return cost
}

// preDeductQuota 预扣配额
func (ts *TranscriptionService) preDeductQuota(userID, amount int) error {
	return model.DecreaseUserQuota(userID, amount)
}

// refundQuota 退还配额
func (ts *TranscriptionService) refundQuota(userID, amount int, reason string) error {
	return model.IncreaseUserQuota(userID, amount)
}

// logTranscriptionEvent 记录转录事件日志
func (ts *TranscriptionService) logTranscriptionEvent(task *model.TranscriptionTask, logType, content string) {
	log := &model.Log{
		UserId:            task.UserID,
		CreatedAt:         time.Now().Unix(),
		Type:              model.LogTypeSystem,
		Content:           content,
		Username:          "", // 会在插入时自动填充
		TokenName:         "", // 会在插入时自动填充
		ModelName:         task.ModelName,
		Quota:             task.QuotaCost,
		PromptTokens:      0,
		CompletionTokens:  0,
		UseTime:           0,
		IsStream:          false,
		ChannelId:         task.ChannelID,
		TokenId:           task.TokenID,
		FileSize:          &task.FileSize,
		Duration:          task.Duration,
		TaskType:          &logType,
	}
	
	log.Insert()
}

// sendTaskCompletionNotification 发送任务完成通知
func (ts *TranscriptionService) sendTaskCompletionNotification(task *model.TranscriptionTask) {
	// 这里可以实现邮件、Webhook等通知方式
	// 暂时只记录日志
	fmt.Printf("转录任务 %d 已完成，用户 %d\n", task.ID, task.UserID)
}

// 工具函数
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if strings.TrimSpace(s) == item {
			return true
		}
	}
	return false
}

// TranscriptionRequest 转录请求结构
type TranscriptionRequest struct {
	Filename         string `json:"filename"`
	FileSize         int64  `json:"file_size"`
	FileType         string `json:"file_type"`
	Duration         *int   `json:"duration"`
	Language         string `json:"language"`
	ModelName        string `json:"model_name"`
	EnableTimestamps bool   `json:"enable_timestamps"`
	EnableSpeaker    bool   `json:"enable_speaker"`
	OutputFormat     string `json:"output_format"`
	Quality          string `json:"quality"`
	Priority         int    `json:"priority"`
}
