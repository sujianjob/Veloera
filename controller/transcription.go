package controller

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"veloera/common"
	"veloera/constant"
	"veloera/model"
	"veloera/service"

	"github.com/gin-gonic/gin"
)

var transcriptionService = service.NewTranscriptionService()

// CreateTranscriptionTask 创建转录任务
func CreateTranscriptionTask(c *gin.Context) {
	userID := c.GetInt("id")
	tokenID := c.GetInt("token_id")
	
	// 获取上传的文件
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "文件上传失败: " + err.Error(),
		})
		return
	}
	defer file.Close()
	
	// 验证文件格式
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != "" && ext[0] == '.' {
		ext = ext[1:]
	}
	
	if !constant.IsSupportedFormat(ext) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "不支持的文件格式: " + ext,
			"code":    constant.ErrCodeFileNotSupported,
		})
		return
	}
	
	// 验证文件大小
	maxSize := int64(common.GetEnvOrDefault("MAX_FILE_SIZE", constant.DefaultMaxFileSize))
	if header.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": fmt.Sprintf("文件大小超出限制，最大允许 %d MB", maxSize/(1024*1024)),
			"code":    constant.ErrCodeFileTooLarge,
		})
		return
	}
	
	// 获取转录参数
	language := c.DefaultPostForm("language", "auto")
	modelName := c.PostForm("model_name")
	enableTimestamps := c.DefaultPostForm("enable_timestamps", "true") == "true"
	enableSpeaker := c.DefaultPostForm("enable_speaker", "false") == "true"
	outputFormat := c.DefaultPostForm("output_format", constant.DefaultOutputFormat)
	quality := c.DefaultPostForm("quality", "medium")
	priority, _ := strconv.Atoi(c.DefaultPostForm("priority", "2"))
	
	// 验证参数
	if !constant.IsSupportedLanguage(language) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "不支持的语言: " + language,
		})
		return
	}
	
	if !constant.IsSupportedOutputFormat(outputFormat) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "不支持的输出格式: " + outputFormat,
		})
		return
	}
	
	// 获取音视频时长（可选）
	var duration *int
	if durationStr := c.PostForm("duration"); durationStr != "" {
		if d, err := strconv.Atoi(durationStr); err == nil {
			duration = &d
		}
	}
	
	// 创建转录请求
	req := &service.TranscriptionRequest{
		Filename:         header.Filename,
		FileSize:         header.Size,
		FileType:         ext,
		Duration:         duration,
		Language:         language,
		ModelName:        modelName,
		EnableTimestamps: enableTimestamps,
		EnableSpeaker:    enableSpeaker,
		OutputFormat:     outputFormat,
		Quality:          quality,
		Priority:         priority,
	}
	
	// 创建转录任务
	var tokenIDPtr *int
	if tokenID > 0 {
		tokenIDPtr = &tokenID
	}
	
	task, err := transcriptionService.CreateTranscriptionTask(userID, tokenIDPtr, req)
	if err != nil {
		if strings.Contains(err.Error(), "配额不足") {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": err.Error(),
				"code":    constant.ErrCodeInsufficientQuota,
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": err.Error(),
			})
		}
		return
	}
	
	// 处理转录任务（上传文件并开始转录）
	if err := transcriptionService.ProcessTranscriptionTask(task, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "处理转录任务失败: " + err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "转录任务创建成功",
		"data":    task,
	})
}

// GetTranscriptionTask 获取转录任务详情
func GetTranscriptionTask(c *gin.Context) {
	taskID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
		})
		return
	}
	
	userID := c.GetInt("id")
	
	task, err := model.GetTranscriptionTask(taskID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "任务不存在",
			"code":    constant.ErrCodeTaskNotFound,
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    task,
	})
}

// GetUserTranscriptionTasks 获取用户的转录任务列表
func GetUserTranscriptionTasks(c *gin.Context) {
	userID := c.GetInt("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	
	tasks, total, err := model.GetUserTranscriptionTasks(userID, page, pageSize, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取任务列表失败: " + err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"tasks":     tasks,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// DownloadTranscriptionResult 下载转录结果
func DownloadTranscriptionResult(c *gin.Context) {
	taskID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
		})
		return
	}
	
	userID := c.GetInt("id")
	format := c.DefaultQuery("format", "json")
	
	// 验证格式
	if !constant.IsSupportedOutputFormat(format) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "不支持的输出格式: " + format,
		})
		return
	}
	
	// 获取任务信息
	task, err := model.GetTranscriptionTask(taskID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "任务不存在",
		})
		return
	}
	
	if task.Status != constant.TaskStatusCompleted {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "任务未完成",
		})
		return
	}
	
	// 构建文件路径
	resultDir := filepath.Join(common.GetEnvOrDefaultString("STORAGE_PATH", "./data/transcription"), "results")
	filename := fmt.Sprintf("%d_result.%s", taskID, format)
	filePath := filepath.Join(resultDir, filename)
	
	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "结果文件不存在",
		})
		return
	}
	
	// 设置响应头
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", getContentType(format))
	
	// 发送文件
	c.File(filePath)
	
	// 记录下载日志
	log := &model.Log{
		UserId:    userID,
		CreatedAt: common.GetTimestamp(),
		Type:      model.LogTypeSystem,
		Content:   fmt.Sprintf("下载转录结果: %s", filename),
		ModelName: task.ModelName,
		ChannelId: task.ChannelID,
		TokenId:   task.TokenID,
	}
	log.Insert()
}

// PreviewTranscriptionResult 预览转录结果
func PreviewTranscriptionResult(c *gin.Context) {
	taskID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
		})
		return
	}
	
	userID := c.GetInt("id")
	format := c.DefaultQuery("format", "json")
	
	// 获取任务信息
	task, err := model.GetTranscriptionTask(taskID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "任务不存在",
		})
		return
	}
	
	if task.Status != constant.TaskStatusCompleted {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "任务未完成",
		})
		return
	}
	
	// 根据格式返回不同的内容
	switch format {
	case "text":
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"text": task.ResultText,
			},
		})
	case "json":
		// 读取JSON结果文件
		resultDir := filepath.Join(common.GetEnvOrDefaultString("STORAGE_PATH", "./data/transcription"), "results")
		filename := fmt.Sprintf("%d_result.json", taskID)
		filePath := filepath.Join(resultDir, filename)
		
		if content, err := os.ReadFile(filePath); err == nil {
			c.Header("Content-Type", "application/json")
			c.String(http.StatusOK, string(content))
		} else {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "结果文件不存在",
			})
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "不支持的预览格式",
		})
	}
}

// CancelTranscriptionTask 取消转录任务
func CancelTranscriptionTask(c *gin.Context) {
	taskID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
		})
		return
	}
	
	userID := c.GetInt("id")
	
	// 获取任务信息
	task, err := model.GetTranscriptionTask(taskID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "任务不存在",
		})
		return
	}
	
	// 检查任务状态
	if task.Status == constant.TaskStatusCompleted || task.Status == constant.TaskStatusFailed {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "任务已完成，无法取消",
		})
		return
	}
	
	// 更新任务状态
	if err := task.UpdateStatus(constant.TaskStatusCancelled, task.Progress, "用户取消"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "取消任务失败: " + err.Error(),
		})
		return
	}
	
	// 退还配额
	if task.QuotaCost > 0 {
		model.IncreaseUserQuota(userID, task.QuotaCost)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "任务已取消",
	})
}

// DeleteTranscriptionTask 删除转录任务
func DeleteTranscriptionTask(c *gin.Context) {
	taskID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
		})
		return
	}
	
	userID := c.GetInt("id")
	
	// 删除任务（会级联删除相关文件记录）
	if err := model.DeleteTranscriptionTask(taskID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "删除任务失败: " + err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "任务已删除",
	})
}

// GetUserTranscriptionStats 获取用户转录统计
func GetUserTranscriptionStats(c *gin.Context) {
	userID := c.GetInt("id")
	
	stats, err := model.GetUserTranscriptionStats(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取统计数据失败: " + err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetSupportedLanguages 获取支持的语言列表
func GetSupportedLanguages(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    constant.SupportedLanguages,
	})
}

// GetSupportedFormats 获取支持的文件格式
func GetSupportedFormats(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"audio": constant.SupportedAudioFormats,
			"video": constant.SupportedVideoFormats,
			"all":   constant.GetAllSupportedFormats(),
		},
	})
}

// 工具函数
func getContentType(format string) string {
	switch format {
	case "json":
		return "application/json"
	case "srt":
		return "application/x-subrip"
	case "txt":
		return "text/plain"
	case "vtt":
		return "text/vtt"
	default:
		return "application/octet-stream"
	}
}
