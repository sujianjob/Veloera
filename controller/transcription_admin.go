package controller

import (
	"net/http"
	"strconv"
	"strings"
	"veloera/constant"
	"veloera/model"

	"github.com/gin-gonic/gin"
)

// GetAllTranscriptionTasks 管理员获取所有转录任务
func GetAllTranscriptionTasks(c *gin.Context) {
	// 检查管理员权限
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "权限不足",
		})
		return
	}
	
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	username := c.Query("username")
	
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	
	tasks, total, err := model.GetAllTranscriptionTasks(page, pageSize, status, username)
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

// GetSystemTranscriptionStats 获取系统转录统计
func GetSystemTranscriptionStats(c *gin.Context) {
	// 检查管理员权限
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "权限不足",
		})
		return
	}
	
	stats, err := model.GetSystemTranscriptionStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取统计数据失败: " + err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": stats,
	})
}

// GetTranscriptionEngines 获取转录引擎列表
func GetTranscriptionEngines(c *gin.Context) {
	// 检查管理员权限
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "权限不足",
		})
		return
	}
	
	// 获取所有渠道（转录引擎）
	channels, err := model.GetAllChannels(0, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取转录引擎失败: " + err.Error(),
		})
		return
	}
	
	// 添加引擎类型名称
	for i := range channels {
		if name, exists := constant.EngineNames[channels[i].EngineType]; exists {
			channels[i].Name = name
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    channels,
	})
}

// CreateTranscriptionEngine 创建转录引擎
func CreateTranscriptionEngine(c *gin.Context) {
	// 检查管理员权限
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "权限不足",
		})
		return
	}
	
	var req struct {
		Name               string `json:"name" binding:"required"`
		EngineType         int    `json:"engine_type" binding:"required"`
		APIKey             string `json:"api_key" binding:"required"`
		BaseURL            string `json:"base_url"`
		MaxFileSize        int64  `json:"max_file_size"`
		MaxDuration        int    `json:"max_duration"`
		SupportedFormats   string `json:"supported_formats"`
		SupportedLanguages string `json:"supported_languages"`
		Weight             int    `json:"weight"`
		Status             int    `json:"status"`
		GroupName          string `json:"group_name"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "参数错误: " + err.Error(),
		})
		return
	}
	
	// 验证引擎类型
	if _, exists := constant.EngineNames[req.EngineType]; !exists {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "不支持的引擎类型",
		})
		return
	}
	
	// 设置默认值
	if req.MaxFileSize == 0 {
		req.MaxFileSize = constant.DefaultMaxFileSize
	}
	if req.MaxDuration == 0 {
		req.MaxDuration = constant.DefaultMaxDuration
	}
	if req.SupportedFormats == "" {
		req.SupportedFormats = strings.Join(constant.GetAllSupportedFormats(), ",")
	}
	if req.SupportedLanguages == "" {
		req.SupportedLanguages = strings.Join(constant.GetSupportedLanguageCodes(), ",")
	}
	if req.Weight == 0 {
		req.Weight = 10
	}
	if req.Status == 0 {
		req.Status = 1
	}
	if req.GroupName == "" {
		req.GroupName = "default"
	}
	
	// 创建渠道记录
	channel := &model.Channel{
		Name:               req.Name,
		Type:               1, // 转录服务类型
		EngineType:         req.EngineType,
		Key:                req.APIKey,
		BaseURL:            req.BaseURL,
		MaxFileSize:        req.MaxFileSize,
		MaxDuration:        req.MaxDuration,
		SupportedFormats:   req.SupportedFormats,
		SupportedLanguages: req.SupportedLanguages,
		Weight:             req.Weight,
		Status:             req.Status,
		Group:              req.GroupName,
		CreatedTime:        GetTimestamp(),
	}
	
	if err := channel.Insert(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建转录引擎失败: " + err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "转录引擎创建成功",
		"data":    channel,
	})
}

// UpdateTranscriptionEngine 更新转录引擎
func UpdateTranscriptionEngine(c *gin.Context) {
	// 检查管理员权限
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "权限不足",
		})
		return
	}
	
	channelID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的引擎ID",
		})
		return
	}
	
	var req struct {
		Name               string `json:"name"`
		APIKey             string `json:"api_key"`
		BaseURL            string `json:"base_url"`
		MaxFileSize        int64  `json:"max_file_size"`
		MaxDuration        int    `json:"max_duration"`
		SupportedFormats   string `json:"supported_formats"`
		SupportedLanguages string `json:"supported_languages"`
		Weight             int    `json:"weight"`
		Status             int    `json:"status"`
		GroupName          string `json:"group_name"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "参数错误: " + err.Error(),
		})
		return
	}
	
	// 获取现有渠道
	channel, err := model.GetChannelById(channelID, false)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "转录引擎不存在",
		})
		return
	}
	
	// 更新字段
	if req.Name != "" {
		channel.Name = req.Name
	}
	if req.APIKey != "" {
		channel.Key = req.APIKey
	}
	if req.BaseURL != "" {
		channel.BaseURL = req.BaseURL
	}
	if req.MaxFileSize > 0 {
		channel.MaxFileSize = req.MaxFileSize
	}
	if req.MaxDuration > 0 {
		channel.MaxDuration = req.MaxDuration
	}
	if req.SupportedFormats != "" {
		channel.SupportedFormats = req.SupportedFormats
	}
	if req.SupportedLanguages != "" {
		channel.SupportedLanguages = req.SupportedLanguages
	}
	if req.Weight > 0 {
		channel.Weight = req.Weight
	}
	if req.Status > 0 {
		channel.Status = req.Status
	}
	if req.GroupName != "" {
		channel.Group = req.GroupName
	}
	
	if err := channel.Update(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "更新转录引擎失败: " + err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "转录引擎更新成功",
		"data":    channel,
	})
}

// DeleteTranscriptionEngine 删除转录引擎
func DeleteTranscriptionEngine(c *gin.Context) {
	// 检查管理员权限
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "权限不足",
		})
		return
	}
	
	channelID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的引擎ID",
		})
		return
	}
	
	// 检查是否有正在进行的任务
	var count int64
	model.DB.Model(&model.TranscriptionTask{}).
		Where("channel_id = ? AND status IN (?)", channelID, []string{
			constant.TaskStatusPending,
			constant.TaskStatusUploading,
			constant.TaskStatusProcessing,
		}).Count(&count)
	
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "该引擎还有正在进行的任务，无法删除",
		})
		return
	}
	
	// 删除渠道
	if err := model.DeleteChannelById(channelID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "删除转录引擎失败: " + err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "转录引擎删除成功",
	})
}

// TestTranscriptionEngine 测试转录引擎
func TestTranscriptionEngine(c *gin.Context) {
	// 检查管理员权限
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "权限不足",
		})
		return
	}
	
	channelID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的引擎ID",
		})
		return
	}
	
	// 获取渠道信息
	channel, err := model.GetChannelById(channelID, false)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "转录引擎不存在",
		})
		return
	}
	
	// 创建适配器并进行健康检查
	adaptor, err := transcriptionService.GetTranscriptionAdaptor(channelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建适配器失败: " + err.Error(),
		})
		return
	}
	
	// 执行健康检查
	if err := adaptor.HealthCheck(c.Request.Context()); err != nil {
		// 更新渠道状态为自动禁用
		channel.Status = 3
		channel.Update()
		
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "引擎测试失败: " + err.Error(),
			"data": gin.H{
				"status":       "failed",
				"error":        err.Error(),
				"test_time":    GetTimestamp(),
				"auto_disabled": true,
			},
		})
		return
	}
	
	// 更新测试时间和状态
	channel.TestTime = GetTimestamp()
	if channel.Status == 3 { // 如果之前是自动禁用，恢复为启用
		channel.Status = 1
	}
	channel.Update()
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "引擎测试成功",
		"data": gin.H{
			"status":    "success",
			"test_time": channel.TestTime,
		},
	})
}

// GetTranscriptionEngineTypes 获取支持的转录引擎类型
func GetTranscriptionEngineTypes(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    constant.EngineNames,
	})
}

// BatchUpdateTranscriptionEngineStatus 批量更新转录引擎状态
func BatchUpdateTranscriptionEngineStatus(c *gin.Context) {
	// 检查管理员权限
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "权限不足",
		})
		return
	}
	
	var req struct {
		ChannelIDs []int `json:"channel_ids" binding:"required"`
		Status     int   `json:"status" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "参数错误: " + err.Error(),
		})
		return
	}
	
	// 验证状态值
	if req.Status < 1 || req.Status > 3 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的状态值",
		})
		return
	}
	
	// 批量更新
	result := model.DB.Model(&model.Channel{}).
		Where("id IN (?)", req.ChannelIDs).
		Update("status", req.Status)
	
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "批量更新失败: " + result.Error.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "批量更新成功",
		"data": gin.H{
			"updated_count": result.RowsAffected,
		},
	})
}

// 工具函数：检查是否为管理员
func isAdmin(c *gin.Context) bool {
	role := c.GetInt("role")
	return role >= 10 // 管理员角色
}
