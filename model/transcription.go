package model

import (
	"encoding/json"
	"fmt"
	"time"
	"veloera/common"
	"veloera/constant"

	"gorm.io/gorm"
)

// TranscriptionTask 转录任务模型
type TranscriptionTask struct {
	ID                 int64      `json:"id" gorm:"primaryKey"`
	UserID             int        `json:"user_id" gorm:"not null;index"`
	TokenID            *int       `json:"token_id" gorm:"index"`
	ChannelID          int        `json:"channel_id" gorm:"not null;index"`
	
	// 文件信息
	OriginalFilename   string     `json:"original_filename" gorm:"not null"`
	FilePath           string     `json:"file_path" gorm:"not null"`
	FileSize           int64      `json:"file_size" gorm:"not null"`
	FileType           string     `json:"file_type" gorm:"not null"`
	Duration           *int       `json:"duration"`
	
	// 转录配置
	Language           string     `json:"language" gorm:"default:'auto'"`
	ModelName          string     `json:"model_name"`
	EnableTimestamps   bool       `json:"enable_timestamps" gorm:"default:true"`
	EnableSpeaker      bool       `json:"enable_speaker" gorm:"default:false"`
	OutputFormat       string     `json:"output_format" gorm:"default:'json'"`
	Quality            string     `json:"quality" gorm:"default:'medium'"`
	Priority           int        `json:"priority" gorm:"default:2"`
	
	// 任务状态
	Status             string     `json:"status" gorm:"default:'pending';index"`
	Progress           int        `json:"progress" gorm:"default:0"`
	ErrorMessage       string     `json:"error_message"`
	ErrorCode          string     `json:"error_code"`
	
	// 结果信息
	ResultText         string     `json:"result_text" gorm:"type:longtext"`
	ResultFilePath     string     `json:"result_file_path"`
	ConfidenceScore    *float64   `json:"confidence_score"`
	DetectedLanguage   string     `json:"detected_language"`
	
	// 计费信息
	QuotaCost          int        `json:"quota_cost" gorm:"default:0"`
	BillingDuration    *int       `json:"billing_duration"`
	BillingType        string     `json:"billing_type" gorm:"default:'duration'"`
	
	// 时间戳
	CreatedAt          time.Time  `json:"created_at"`
	StartedAt          *time.Time `json:"started_at"`
	CompletedAt        *time.Time `json:"completed_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	
	// 关联
	User               User       `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Token              *Token     `json:"token,omitempty" gorm:"foreignKey:TokenID"`
	Channel            Channel    `json:"channel,omitempty" gorm:"foreignKey:ChannelID"`
	Files              []FileStorage `json:"files,omitempty" gorm:"foreignKey:TaskID"`
}

// FileStorage 文件存储模型
type FileStorage struct {
	ID           int64                `json:"id" gorm:"primaryKey"`
	UserID       int                  `json:"user_id" gorm:"not null;index"`
	TaskID       *int64               `json:"task_id" gorm:"index"`
	FileType     string               `json:"file_type" gorm:"not null;index"` // original, result
	OriginalName string               `json:"original_name" gorm:"not null"`
	StoredName   string               `json:"stored_name" gorm:"not null"`
	FilePath     string               `json:"file_path" gorm:"not null"`
	FileSize     int64                `json:"file_size" gorm:"not null"`
	MimeType     string               `json:"mime_type"`
	StorageType  string               `json:"storage_type" gorm:"default:'local'"`
	ExpiresAt    *time.Time           `json:"expires_at" gorm:"index"`
	CreatedAt    time.Time            `json:"created_at"`
	
	// 关联
	User         User                 `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Task         *TranscriptionTask   `json:"task,omitempty" gorm:"foreignKey:TaskID"`
}

// TranscriptionResult 转录结果结构
type TranscriptionResult struct {
	Text            string                     `json:"text"`
	Language        string                     `json:"language"`
	Duration        float64                    `json:"duration"`
	ConfidenceScore float64                    `json:"confidence_score"`
	Segments        []TranscriptionSegment     `json:"segments,omitempty"`
	Words           []TranscriptionWord        `json:"words,omitempty"`
	Speakers        []TranscriptionSpeaker     `json:"speakers,omitempty"`
}

// TranscriptionSegment 转录片段
type TranscriptionSegment struct {
	ID         int     `json:"id"`
	Start      float64 `json:"start"`
	End        float64 `json:"end"`
	Text       string  `json:"text"`
	Speaker    string  `json:"speaker,omitempty"`
	Confidence float64 `json:"confidence"`
}

// TranscriptionWord 转录词汇
type TranscriptionWord struct {
	Word       string  `json:"word"`
	Start      float64 `json:"start"`
	End        float64 `json:"end"`
	Confidence float64 `json:"confidence"`
}

// TranscriptionSpeaker 说话人信息
type TranscriptionSpeaker struct {
	ID       string `json:"id"`
	Name     string `json:"name,omitempty"`
	Gender   string `json:"gender,omitempty"`
	Language string `json:"language,omitempty"`
}

// 创建转录任务
func (task *TranscriptionTask) Insert() error {
	task.CreatedAt = time.Now()
	task.UpdatedAt = time.Now()
	return DB.Create(task).Error
}

// 更新转录任务
func (task *TranscriptionTask) Update() error {
	task.UpdatedAt = time.Now()
	return DB.Save(task).Error
}

// 更新任务状态
func (task *TranscriptionTask) UpdateStatus(status string, progress int, errorMsg string) error {
	updates := map[string]interface{}{
		"status":      status,
		"progress":    progress,
		"updated_at":  time.Now(),
	}
	
	if errorMsg != "" {
		updates["error_message"] = errorMsg
	}
	
	if status == constant.TaskStatusProcessing && task.StartedAt == nil {
		now := time.Now()
		updates["started_at"] = &now
	}
	
	if status == constant.TaskStatusCompleted || status == constant.TaskStatusFailed {
		now := time.Now()
		updates["completed_at"] = &now
	}
	
	return DB.Model(task).Updates(updates).Error
}

// 设置转录结果
func (task *TranscriptionTask) SetResult(result *TranscriptionResult, resultFilePath string) error {
	updates := map[string]interface{}{
		"result_text":       result.Text,
		"result_file_path":  resultFilePath,
		"confidence_score":  result.ConfidenceScore,
		"detected_language": result.Language,
		"status":           constant.TaskStatusCompleted,
		"progress":         100,
		"updated_at":       time.Now(),
	}
	
	if task.Duration == nil && result.Duration > 0 {
		duration := int(result.Duration)
		updates["duration"] = duration
		updates["billing_duration"] = duration
	}
	
	now := time.Now()
	updates["completed_at"] = &now
	
	return DB.Model(task).Updates(updates).Error
}

// 获取转录任务
func GetTranscriptionTask(id int64, userID int) (*TranscriptionTask, error) {
	var task TranscriptionTask
	err := DB.Where("id = ? AND user_id = ?", id, userID).
		Preload("User").
		Preload("Token").
		Preload("Channel").
		Preload("Files").
		First(&task).Error
	return &task, err
}

// 获取用户的转录任务列表
func GetUserTranscriptionTasks(userID int, page, pageSize int, status string) ([]TranscriptionTask, int64, error) {
	var tasks []TranscriptionTask
	var total int64
	
	query := DB.Where("user_id = ?", userID)
	if status != "" {
		query = query.Where("status = ?", status)
	}
	
	// 获取总数
	if err := query.Model(&TranscriptionTask{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	// 获取分页数据
	offset := (page - 1) * pageSize
	err := query.Preload("Channel").
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&tasks).Error
	
	return tasks, total, err
}

// 获取管理员的转录任务列表
func GetAllTranscriptionTasks(page, pageSize int, status, username string) ([]TranscriptionTask, int64, error) {
	var tasks []TranscriptionTask
	var total int64
	
	query := DB.Model(&TranscriptionTask{})
	
	if status != "" {
		query = query.Where("status = ?", status)
	}
	
	if username != "" {
		query = query.Joins("JOIN users ON users.id = transcription_tasks.user_id").
			Where("users.username LIKE ?", "%"+username+"%")
	}
	
	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	// 获取分页数据
	offset := (page - 1) * pageSize
	err := query.Preload("User").
		Preload("Channel").
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&tasks).Error
	
	return tasks, total, err
}

// 获取待处理的转录任务
func GetPendingTranscriptionTasks(limit int) ([]TranscriptionTask, error) {
	var tasks []TranscriptionTask
	err := DB.Where("status = ?", constant.TaskStatusPending).
		Order("priority DESC, created_at ASC").
		Limit(limit).
		Find(&tasks).Error
	return tasks, err
}

// 删除转录任务
func DeleteTranscriptionTask(id int64, userID int) error {
	return DB.Where("id = ? AND user_id = ?", id, userID).Delete(&TranscriptionTask{}).Error
}

// 文件存储相关方法

// 创建文件存储记录
func (fs *FileStorage) Insert() error {
	fs.CreatedAt = time.Now()
	return DB.Create(fs).Error
}

// 获取文件存储记录
func GetFileStorage(id int64, userID int) (*FileStorage, error) {
	var fs FileStorage
	err := DB.Where("id = ? AND user_id = ?", id, userID).First(&fs).Error
	return &fs, err
}

// 获取任务的文件列表
func GetTaskFiles(taskID int64, userID int) ([]FileStorage, error) {
	var files []FileStorage
	err := DB.Where("task_id = ? AND user_id = ?", taskID, userID).Find(&files).Error
	return files, err
}

// 获取过期文件列表
func GetExpiredFiles() ([]FileStorage, error) {
	var files []FileStorage
	err := DB.Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).Find(&files).Error
	return files, err
}

// 删除文件存储记录
func DeleteFileStorage(id int64) error {
	return DB.Delete(&FileStorage{}, id).Error
}

// 统计相关方法

// 获取用户转录统计
func GetUserTranscriptionStats(userID int) (map[string]interface{}, error) {
	var stats struct {
		TotalTasks      int64 `json:"total_tasks"`
		CompletedTasks  int64 `json:"completed_tasks"`
		FailedTasks     int64 `json:"failed_tasks"`
		ProcessingTasks int64 `json:"processing_tasks"`
		TotalDuration   int64 `json:"total_duration"`
		TotalFileSize   int64 `json:"total_file_size"`
		TotalQuotaCost  int64 `json:"total_quota_cost"`
	}
	
	err := DB.Model(&TranscriptionTask{}).
		Select(`
			COUNT(*) as total_tasks,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
			COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
			COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_tasks,
			COALESCE(SUM(duration), 0) as total_duration,
			COALESCE(SUM(file_size), 0) as total_file_size,
			COALESCE(SUM(quota_cost), 0) as total_quota_cost
		`).
		Where("user_id = ?", userID).
		Scan(&stats).Error
	
	if err != nil {
		return nil, err
	}
	
	result := map[string]interface{}{
		"total_tasks":      stats.TotalTasks,
		"completed_tasks":  stats.CompletedTasks,
		"failed_tasks":     stats.FailedTasks,
		"processing_tasks": stats.ProcessingTasks,
		"total_duration":   stats.TotalDuration,
		"total_file_size":  stats.TotalFileSize,
		"total_quota_cost": stats.TotalQuotaCost,
	}
	
	return result, nil
}

// 获取系统转录统计
func GetSystemTranscriptionStats() (map[string]interface{}, error) {
	var stats struct {
		TotalTasks      int64 `json:"total_tasks"`
		TotalUsers      int64 `json:"total_users"`
		TotalDuration   int64 `json:"total_duration"`
		TotalFileSize   int64 `json:"total_file_size"`
		TodayTasks      int64 `json:"today_tasks"`
		TodayDuration   int64 `json:"today_duration"`
	}
	
	today := time.Now().Format("2006-01-02")
	
	// 获取总体统计
	err := DB.Model(&TranscriptionTask{}).
		Select(`
			COUNT(*) as total_tasks,
			COUNT(DISTINCT user_id) as total_users,
			COALESCE(SUM(duration), 0) as total_duration,
			COALESCE(SUM(file_size), 0) as total_file_size
		`).
		Scan(&stats).Error
	
	if err != nil {
		return nil, err
	}
	
	// 获取今日统计
	err = DB.Model(&TranscriptionTask{}).
		Select(`
			COUNT(*) as today_tasks,
			COALESCE(SUM(duration), 0) as today_duration
		`).
		Where("DATE(created_at) = ?", today).
		Scan(&stats).Error
	
	if err != nil {
		return nil, err
	}
	
	result := map[string]interface{}{
		"total_tasks":    stats.TotalTasks,
		"total_users":    stats.TotalUsers,
		"total_duration": stats.TotalDuration,
		"total_file_size": stats.TotalFileSize,
		"today_tasks":    stats.TodayTasks,
		"today_duration": stats.TodayDuration,
	}
	
	return result, nil
}

// JSON序列化方法
func (result *TranscriptionResult) ToJSON() (string, error) {
	data, err := json.Marshal(result)
	return string(data), err
}

// 从JSON反序列化
func (result *TranscriptionResult) FromJSON(data string) error {
	return json.Unmarshal([]byte(data), result)
}

// 生成SRT格式
func (result *TranscriptionResult) ToSRT() string {
	if len(result.Segments) == 0 {
		return result.Text
	}
	
	var srt string
	for i, segment := range result.Segments {
		startTime := formatSRTTime(segment.Start)
		endTime := formatSRTTime(segment.End)
		srt += fmt.Sprintf("%d\n%s --> %s\n%s\n\n", i+1, startTime, endTime, segment.Text)
	}
	return srt
}

// 生成VTT格式
func (result *TranscriptionResult) ToVTT() string {
	vtt := "WEBVTT\n\n"
	
	if len(result.Segments) == 0 {
		return vtt + result.Text
	}
	
	for _, segment := range result.Segments {
		startTime := formatVTTTime(segment.Start)
		endTime := formatVTTTime(segment.End)
		vtt += fmt.Sprintf("%s --> %s\n%s\n\n", startTime, endTime, segment.Text)
	}
	return vtt
}

// 格式化SRT时间
func formatSRTTime(seconds float64) string {
	hours := int(seconds) / 3600
	minutes := (int(seconds) % 3600) / 60
	secs := int(seconds) % 60
	millis := int((seconds - float64(int(seconds))) * 1000)
	return fmt.Sprintf("%02d:%02d:%02d,%03d", hours, minutes, secs, millis)
}

// 格式化VTT时间
func formatVTTTime(seconds float64) string {
	hours := int(seconds) / 3600
	minutes := (int(seconds) % 3600) / 60
	secs := int(seconds) % 60
	millis := int((seconds - float64(int(seconds))) * 1000)
	return fmt.Sprintf("%02d:%02d:%02d.%03d", hours, minutes, secs, millis)
}
