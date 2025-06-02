-- Veloera 音视频转录服务数据库迁移脚本
-- 版本: v1.0.0 -> v2.0.0 (转录服务)

-- 1. 创建转录任务表
CREATE TABLE transcription_tasks (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    token_id            INT,
    channel_id          INT NOT NULL,
    
    -- 文件信息
    original_filename   VARCHAR(255) NOT NULL,
    file_path           VARCHAR(512) NOT NULL,
    file_size           BIGINT NOT NULL,
    file_type           VARCHAR(50) NOT NULL,
    duration            INT,                            -- 音视频时长(秒)
    
    -- 转录配置
    language            VARCHAR(10) DEFAULT 'auto',     -- 语言代码
    model_name          VARCHAR(100),                   -- 使用的模型
    enable_timestamps   BOOLEAN DEFAULT TRUE,           -- 是否包含时间戳
    enable_speaker      BOOLEAN DEFAULT FALSE,          -- 是否识别说话人
    output_format       VARCHAR(20) DEFAULT 'json',     -- 输出格式
    
    -- 任务状态
    status              VARCHAR(20) DEFAULT 'pending',  -- pending,processing,completed,failed
    progress            INT DEFAULT 0,                  -- 进度百分比
    error_message       TEXT,                           -- 错误信息
    
    -- 结果信息
    result_text         LONGTEXT,                       -- 转录文本结果
    result_file_path    VARCHAR(512),                   -- 结果文件路径
    confidence_score    DECIMAL(3,2),                   -- 置信度分数
    
    -- 计费信息
    quota_cost          INT DEFAULT 0,                  -- 消耗的配额
    billing_duration    INT,                            -- 计费时长(秒)
    
    -- 时间戳
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at          TIMESTAMP NULL,
    completed_at        TIMESTAMP NULL,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_token_id (token_id),
    INDEX idx_channel_id (channel_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE SET NULL,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE RESTRICT
);

-- 2. 创建文件存储表
CREATE TABLE file_storage (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    task_id         BIGINT,
    file_type       VARCHAR(20) NOT NULL,               -- original, result
    original_name   VARCHAR(255) NOT NULL,
    stored_name     VARCHAR(255) NOT NULL,
    file_path       VARCHAR(512) NOT NULL,
    file_size       BIGINT NOT NULL,
    mime_type       VARCHAR(100),
    expires_at      TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_task_id (task_id),
    INDEX idx_file_type (file_type),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES transcription_tasks(id) ON DELETE CASCADE
);

-- 3. 调整现有表结构

-- 调整 channels 表，改为转录引擎配置
ALTER TABLE channels 
ADD COLUMN engine_type INT DEFAULT 1 COMMENT '转录引擎类型: 1=OpenAI Whisper, 2=阿里云, 3=腾讯云, 4=百度云, 5=讯飞, 6=Azure, 7=AWS, 8=Google';

ALTER TABLE channels 
ADD COLUMN max_file_size BIGINT DEFAULT 104857600 COMMENT '最大文件大小(字节)';

ALTER TABLE channels 
ADD COLUMN supported_formats VARCHAR(255) DEFAULT 'mp3,mp4,wav,m4a,flac,aac' COMMENT '支持的文件格式';

ALTER TABLE channels 
ADD COLUMN max_duration INT DEFAULT 3600 COMMENT '最大时长(秒)';

ALTER TABLE channels 
ADD COLUMN supported_languages VARCHAR(255) DEFAULT 'zh,en,ja,ko,auto' COMMENT '支持的语言';

-- 更新 channels 表的 models 字段含义
ALTER TABLE channels 
MODIFY COLUMN models TEXT COMMENT '支持的转录模型列表';

-- 调整 logs 表，适配转录服务
ALTER TABLE logs 
ADD COLUMN file_size BIGINT COMMENT '处理的文件大小';

ALTER TABLE logs 
ADD COLUMN duration INT COMMENT '音视频时长(秒)';

ALTER TABLE logs 
ADD COLUMN task_type VARCHAR(50) DEFAULT 'transcription' COMMENT '任务类型';

ALTER TABLE logs 
MODIFY COLUMN model_name VARCHAR(255) COMMENT '转录引擎/模型名称';

-- 调整 quota_data 表
ALTER TABLE quota_data 
ADD COLUMN file_count INT DEFAULT 0 COMMENT '处理文件数量';

ALTER TABLE quota_data 
ADD COLUMN total_duration INT DEFAULT 0 COMMENT '总处理时长(秒)';

ALTER TABLE quota_data 
MODIFY COLUMN model_name VARCHAR(64) COMMENT '转录引擎名称';

-- 调整 abilities 表 (渠道能力映射)
ALTER TABLE abilities 
MODIFY COLUMN model VARCHAR(255) COMMENT '支持的语言或引擎型号';

-- 4. 创建转录引擎配置数据
INSERT INTO channels (name, type, engine_type, key_value, status, models, supported_formats, supported_languages, max_file_size, max_duration, group_name) VALUES
('OpenAI Whisper', 1, 1, 'your_openai_api_key', 1, 'whisper-1', 'mp3,mp4,wav,m4a,flac', 'auto,zh,en,ja,ko,es,fr,de,ru', 26214400, 3600, 'default'),
('阿里云语音识别', 2, 2, 'your_alicloud_key', 1, 'speech-1', 'wav,mp3,aac,flac', 'zh,en', 536870912, 14400, 'default'),
('腾讯云语音识别', 3, 3, 'your_tencent_key', 1, 'asr-1', 'wav,mp3,m4a', 'zh,en', 536870912, 14400, 'default'),
('百度语音识别', 4, 4, 'your_baidu_key', 1, 'asr-1', 'wav,mp3,amr', 'zh,en', 104857600, 3600, 'default');

-- 5. 创建默认的转录引擎能力映射
INSERT INTO abilities (group_name, model, channel_id, enabled, priority, weight) VALUES
('default', 'zh', 1, true, 1, 10),
('default', 'en', 1, true, 1, 10),
('default', 'auto', 1, true, 1, 10),
('default', 'zh', 2, true, 2, 8),
('default', 'en', 2, true, 2, 8),
('default', 'zh', 3, true, 3, 6),
('default', 'en', 3, true, 3, 6),
('default', 'zh', 4, true, 4, 4);

-- 6. 更新系统配置选项
INSERT INTO options (key_name, value) VALUES
('TranscriptionEnabled', 'true'),
('MaxFileSize', '104857600'),
('MaxDuration', '3600'),
('SupportedFormats', 'mp3,mp4,wav,m4a,flac,aac,ogg'),
('SupportedLanguages', 'auto,zh,en,ja,ko,es,fr,de,ru'),
('DefaultOutputFormat', 'json'),
('FileRetentionDays', '30'),
('TranscriptionPricePerMinute', '0.1'),
('TranscriptionPricePerMB', '0.05');

-- 7. 创建索引优化查询性能
CREATE INDEX idx_transcription_tasks_user_status ON transcription_tasks(user_id, status);
CREATE INDEX idx_transcription_tasks_created_status ON transcription_tasks(created_at, status);
CREATE INDEX idx_file_storage_user_type ON file_storage(user_id, file_type);
CREATE INDEX idx_file_storage_expires ON file_storage(expires_at);

-- 8. 创建视图简化查询
CREATE VIEW v_user_transcription_stats AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_tasks,
    COUNT(CASE WHEN t.status = 'processing' THEN 1 END) as processing_tasks,
    SUM(t.duration) as total_duration,
    SUM(t.file_size) as total_file_size,
    SUM(t.quota_cost) as total_quota_cost
FROM users u
LEFT JOIN transcription_tasks t ON u.id = t.user_id
GROUP BY u.id, u.username;

-- 9. 创建存储过程用于清理过期文件
DELIMITER //
CREATE PROCEDURE CleanExpiredFiles()
BEGIN
    -- 删除过期的结果文件记录
    DELETE FROM file_storage 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    -- 删除超过保留期的任务记录（保留30天）
    DELETE FROM transcription_tasks 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND status IN ('completed', 'failed');
END //
DELIMITER ;

-- 10. 创建触发器自动更新统计数据
DELIMITER //
CREATE TRIGGER update_quota_data_after_task_complete
AFTER UPDATE ON transcription_tasks
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO quota_data (user_id, username, model_name, created_at, token_used, count, quota, file_count, total_duration)
        VALUES (
            NEW.user_id,
            (SELECT username FROM users WHERE id = NEW.user_id),
            NEW.model_name,
            UNIX_TIMESTAMP(NOW()),
            0,
            1,
            NEW.quota_cost,
            1,
            COALESCE(NEW.duration, 0)
        )
        ON DUPLICATE KEY UPDATE
            count = count + 1,
            quota = quota + NEW.quota_cost,
            file_count = file_count + 1,
            total_duration = total_duration + COALESCE(NEW.duration, 0);
    END IF;
END //
DELIMITER ;

-- 11. 插入初始化数据
UPDATE options SET value = 'Veloera 音视频转录服务' WHERE key_name = 'SystemName';
UPDATE options SET value = '专业的音视频转录服务平台，支持多语言、多格式转录' WHERE key_name = 'SystemDescription';

-- 12. 创建管理员账户的转录权限
UPDATE users SET role = 100 WHERE username = 'root';

COMMIT;
