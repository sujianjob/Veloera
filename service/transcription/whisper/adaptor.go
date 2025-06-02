package whisper

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"
	"veloera/constant"
	"veloera/model"
	"veloera/service/transcription"
)

// WhisperAdaptor OpenAI Whisper 适配器
type WhisperAdaptor struct {
	*transcription.BaseAdaptor
	client *http.Client
}

// NewWhisperAdaptor 创建 Whisper 适配器
func NewWhisperAdaptor(config *transcription.AdaptorConfig) transcription.TranscriptionAdaptor {
	if config.BaseURL == "" {
		config.BaseURL = "https://api.openai.com"
	}
	if config.Timeout == 0 {
		config.Timeout = 300 // 5分钟默认超时
	}
	
	adaptor := &WhisperAdaptor{
		BaseAdaptor: &transcription.BaseAdaptor{
			Config:     config,
			EngineName: "OpenAI Whisper",
			EngineType: constant.EngineTypeWhisper,
		},
		client: &http.Client{
			Timeout: time.Duration(config.Timeout) * time.Second,
		},
	}
	
	return adaptor
}

// GetSupportedFormats 获取支持的文件格式
func (w *WhisperAdaptor) GetSupportedFormats() []string {
	return []string{"mp3", "mp4", "wav", "m4a", "flac", "webm"}
}

// GetSupportedLanguages 获取支持的语言
func (w *WhisperAdaptor) GetSupportedLanguages() []string {
	return []string{
		"auto", "zh", "en", "ja", "ko", "es", "fr", "de", "ru", "it", "pt", 
		"ar", "hi", "th", "vi", "nl", "pl", "tr", "sv", "da", "no", "fi",
	}
}

// GetMaxFileSize 获取最大文件大小 (25MB)
func (w *WhisperAdaptor) GetMaxFileSize() int64 {
	return 25 * 1024 * 1024
}

// GetMaxDuration 获取最大时长 (1小时)
func (w *WhisperAdaptor) GetMaxDuration() int {
	return 3600
}

// GetSupportedOutputFormats 获取支持的输出格式
func (w *WhisperAdaptor) GetSupportedOutputFormats() []string {
	return []string{
		constant.OutputFormatJSON,
		constant.OutputFormatSRT,
		constant.OutputFormatTXT,
		constant.OutputFormatVTT,
	}
}

// SubmitTask 提交转录任务
func (w *WhisperAdaptor) SubmitTask(ctx context.Context, task *model.TranscriptionTask, fileReader io.Reader) error {
	// 验证配置
	if err := w.ValidateConfig(task); err != nil {
		return err
	}
	
	// 创建multipart表单
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	
	// 添加文件
	fileWriter, err := writer.CreateFormFile("file", task.OriginalFilename)
	if err != nil {
		return transcription.NewTranscriptionError(transcription.ErrorCodeAPIError, "创建表单文件失败: "+err.Error())
	}
	
	if _, err := io.Copy(fileWriter, fileReader); err != nil {
		return transcription.NewTranscriptionError(transcription.ErrorCodeAPIError, "复制文件数据失败: "+err.Error())
	}
	
	// 添加模型参数
	model := task.ModelName
	if model == "" {
		model = "whisper-1"
	}
	writer.WriteField("model", model)
	
	// 添加语言参数
	if task.Language != "auto" && task.Language != "" {
		writer.WriteField("language", task.Language)
	}
	
	// 添加响应格式
	responseFormat := "verbose_json"
	if task.EnableTimestamps {
		writer.WriteField("timestamp_granularities[]", "segment")
		if task.OutputFormat == constant.OutputFormatJSON {
			writer.WriteField("timestamp_granularities[]", "word")
		}
	}
	writer.WriteField("response_format", responseFormat)
	
	// 添加温度参数（控制随机性）
	writer.WriteField("temperature", "0")
	
	writer.Close()
	
	// 创建请求
	url := w.Config.BaseURL + "/v1/audio/transcriptions"
	req, err := http.NewRequestWithContext(ctx, "POST", url, &buf)
	if err != nil {
		return transcription.NewTranscriptionError(transcription.ErrorCodeAPIError, "创建请求失败: "+err.Error())
	}
	
	// 设置请求头
	req.Header.Set("Authorization", "Bearer "+w.Config.APIKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("User-Agent", "Veloera-Transcription/1.0")
	
	// 发送请求
	resp, err := w.client.Do(req)
	if err != nil {
		return transcription.NewTranscriptionError(transcription.ErrorCodeNetworkError, "网络请求失败: "+err.Error())
	}
	defer resp.Body.Close()
	
	// 读取响应
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return transcription.NewTranscriptionError(transcription.ErrorCodeAPIError, "读取响应失败: "+err.Error())
	}
	
	// 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		var errorResp WhisperErrorResponse
		if err := json.Unmarshal(respBody, &errorResp); err == nil {
			return transcription.NewTranscriptionError(transcription.ErrorCodeAPIError, 
				fmt.Sprintf("API错误 (%d): %s", resp.StatusCode, errorResp.Error.Message))
		}
		return transcription.NewTranscriptionError(transcription.ErrorCodeAPIError, 
			fmt.Sprintf("API请求失败，状态码: %d", resp.StatusCode))
	}
	
	// 解析响应
	var result WhisperResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return transcription.NewTranscriptionError(transcription.ErrorCodeInvalidResponse, "解析响应失败: "+err.Error())
	}
	
	// 转换结果格式
	transcriptionResult := w.convertWhisperResult(&result)
	
	// 更新任务状态和结果
	task.Status = constant.TaskStatusCompleted
	task.Progress = 100
	task.ResultText = transcriptionResult.Text
	task.DetectedLanguage = transcriptionResult.Language
	task.ConfidenceScore = &transcriptionResult.ConfidenceScore
	
	if transcriptionResult.Duration > 0 {
		duration := int(transcriptionResult.Duration)
		task.Duration = &duration
		task.BillingDuration = &duration
	}
	
	return nil
}

// QueryTaskStatus 查询任务状态 (Whisper是同步API，直接返回完成状态)
func (w *WhisperAdaptor) QueryTaskStatus(ctx context.Context, task *model.TranscriptionTask) error {
	// Whisper API 是同步的，任务提交后立即完成
	// 这里主要用于检查任务是否还在处理中
	if task.Status == constant.TaskStatusProcessing {
		// 如果任务已经处理超过预期时间，标记为失败
		if time.Since(task.CreatedAt) > time.Duration(w.Config.Timeout)*time.Second {
			task.Status = constant.TaskStatusFailed
			task.ErrorMessage = "任务超时"
			task.ErrorCode = "TIMEOUT"
		}
	}
	return nil
}

// GetResult 获取转录结果
func (w *WhisperAdaptor) GetResult(ctx context.Context, task *model.TranscriptionTask) (*model.TranscriptionResult, error) {
	if task.Status != constant.TaskStatusCompleted {
		return nil, transcription.NewTranscriptionError(transcription.ErrorCodeTaskNotFound, "任务未完成")
	}
	
	if task.ResultText == "" {
		return nil, transcription.NewTranscriptionError(transcription.ErrorCodeTaskNotFound, "转录结果为空")
	}
	
	// 从任务中构建结果
	result := &model.TranscriptionResult{
		Text:     task.ResultText,
		Language: task.DetectedLanguage,
	}
	
	if task.ConfidenceScore != nil {
		result.ConfidenceScore = *task.ConfidenceScore
	}
	
	if task.Duration != nil {
		result.Duration = float64(*task.Duration)
	}
	
	return result, nil
}

// CancelTask 取消任务 (Whisper是同步API，无法取消)
func (w *WhisperAdaptor) CancelTask(ctx context.Context, task *model.TranscriptionTask) error {
	if task.Status == constant.TaskStatusCompleted || task.Status == constant.TaskStatusFailed {
		return transcription.NewTranscriptionError(transcription.ErrorCodeTaskNotFound, "任务已完成，无法取消")
	}
	
	// 对于正在处理的任务，我们只能标记为取消状态
	task.Status = constant.TaskStatusCancelled
	task.ErrorMessage = "任务已取消"
	
	return nil
}

// HealthCheck 健康检查
func (w *WhisperAdaptor) HealthCheck(ctx context.Context) error {
	// 创建一个简单的测试请求
	url := w.Config.BaseURL + "/v1/models"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}
	
	req.Header.Set("Authorization", "Bearer "+w.Config.APIKey)
	
	resp, err := w.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("健康检查失败，状态码: %d", resp.StatusCode)
	}
	
	return nil
}

// WhisperResponse Whisper API 响应结构
type WhisperResponse struct {
	Text     string           `json:"text"`
	Language string           `json:"language"`
	Duration float64          `json:"duration"`
	Segments []WhisperSegment `json:"segments,omitempty"`
	Words    []WhisperWord    `json:"words,omitempty"`
}

// WhisperSegment Whisper 片段
type WhisperSegment struct {
	ID               int     `json:"id"`
	Seek             int     `json:"seek"`
	Start            float64 `json:"start"`
	End              float64 `json:"end"`
	Text             string  `json:"text"`
	Tokens           []int   `json:"tokens"`
	Temperature      float64 `json:"temperature"`
	AvgLogprob       float64 `json:"avg_logprob"`
	CompressionRatio float64 `json:"compression_ratio"`
	NoSpeechProb     float64 `json:"no_speech_prob"`
}

// WhisperWord Whisper 词汇
type WhisperWord struct {
	Word  string  `json:"word"`
	Start float64 `json:"start"`
	End   float64 `json:"end"`
}

// WhisperErrorResponse Whisper 错误响应
type WhisperErrorResponse struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error"`
}

// convertWhisperResult 转换 Whisper 结果为标准格式
func (w *WhisperAdaptor) convertWhisperResult(whisperResult *WhisperResponse) *model.TranscriptionResult {
	result := &model.TranscriptionResult{
		Text:     strings.TrimSpace(whisperResult.Text),
		Language: whisperResult.Language,
		Duration: whisperResult.Duration,
	}
	
	// 计算平均置信度
	if len(whisperResult.Segments) > 0 {
		totalLogprob := 0.0
		for _, segment := range whisperResult.Segments {
			totalLogprob += segment.AvgLogprob
		}
		avgLogprob := totalLogprob / float64(len(whisperResult.Segments))
		// 将对数概率转换为0-1的置信度分数
		result.ConfidenceScore = 1.0 + avgLogprob/10.0
		if result.ConfidenceScore < 0 {
			result.ConfidenceScore = 0
		}
		if result.ConfidenceScore > 1 {
			result.ConfidenceScore = 1
		}
	}
	
	// 转换片段
	if len(whisperResult.Segments) > 0 {
		result.Segments = make([]model.TranscriptionSegment, len(whisperResult.Segments))
		for i, segment := range whisperResult.Segments {
			result.Segments[i] = model.TranscriptionSegment{
				ID:         segment.ID,
				Start:      segment.Start,
				End:        segment.End,
				Text:       strings.TrimSpace(segment.Text),
				Confidence: 1.0 + segment.AvgLogprob/10.0, // 转换置信度
			}
			if result.Segments[i].Confidence < 0 {
				result.Segments[i].Confidence = 0
			}
			if result.Segments[i].Confidence > 1 {
				result.Segments[i].Confidence = 1
			}
		}
	}
	
	// 转换词汇级时间戳
	if len(whisperResult.Words) > 0 {
		result.Words = make([]model.TranscriptionWord, len(whisperResult.Words))
		for i, word := range whisperResult.Words {
			result.Words[i] = model.TranscriptionWord{
				Word:       strings.TrimSpace(word.Word),
				Start:      word.Start,
				End:        word.End,
				Confidence: result.ConfidenceScore, // 使用整体置信度
			}
		}
	}
	
	return result
}

// 注册适配器
func init() {
	transcription.GlobalAdaptorFactory.RegisterAdaptor(
		constant.EngineTypeWhisper,
		func(config *transcription.AdaptorConfig) transcription.TranscriptionAdaptor {
			return NewWhisperAdaptor(config)
		},
	)
}
