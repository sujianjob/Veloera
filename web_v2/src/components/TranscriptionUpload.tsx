import React, { useState, useRef, useCallback } from 'react';
import { Upload, Button, Select, Checkbox, Progress, message, Card, Space, Typography, Divider } from 'antd';
import { InboxOutlined, CloudUploadOutlined, FileAudioOutlined, VideoCameraOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { transcriptionAPI } from '../services/api';

const { Dragger } = Upload;
const { Option } = Select;
const { Title, Text } = Typography;

interface TranscriptionUploadProps {
  onTaskCreated?: (task: any) => void;
}

const TranscriptionUpload: React.FC<TranscriptionUploadProps> = ({ onTaskCreated }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [language, setLanguage] = useState('auto');
  const [enableTimestamps, setEnableTimestamps] = useState(true);
  const [enableSpeaker, setEnableSpeaker] = useState(false);
  const [outputFormat, setOutputFormat] = useState('json');
  const [quality, setQuality] = useState('medium');
  const [supportedLanguages, setSupportedLanguages] = useState<Record<string, string>>({});
  const [supportedFormats, setSupportedFormats] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取支持的语言和格式
  React.useEffect(() => {
    const fetchSupportedOptions = async () => {
      try {
        const [languagesRes, formatsRes] = await Promise.all([
          transcriptionAPI.getSupportedLanguages(),
          transcriptionAPI.getSupportedFormats()
        ]);
        
        if (languagesRes.success) {
          setSupportedLanguages(languagesRes.data);
        }
        
        if (formatsRes.success) {
          setSupportedFormats([...formatsRes.data.audio, ...formatsRes.data.video]);
        }
      } catch (error) {
        console.error('获取支持选项失败:', error);
      }
    };

    fetchSupportedOptions();
  }, []);

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    beforeUpload: (file) => {
      // 检查文件格式
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !supportedFormats.includes(fileExt)) {
        message.error(`不支持的文件格式: ${fileExt}`);
        return false;
      }

      // 检查文件大小 (100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        message.error('文件大小不能超过 100MB');
        return false;
      }

      setFileList([file]);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
    },
    showUploadList: {
      showPreviewIcon: false,
      showRemoveIcon: true,
    },
  };

  // 开始转录
  const handleStartTranscription = async () => {
    if (fileList.length === 0) {
      message.error('请先选择文件');
      return;
    }

    const file = fileList[0];
    const formData = new FormData();
    formData.append('file', file.originFileObj as File);
    formData.append('language', language);
    formData.append('enable_timestamps', enableTimestamps.toString());
    formData.append('enable_speaker', enableSpeaker.toString());
    formData.append('output_format', outputFormat);
    formData.append('quality', quality);

    setUploading(true);
    setUploadProgress(0);

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      const response = await transcriptionAPI.createTask(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        message.success('转录任务创建成功！');
        setFileList([]);
        setUploadProgress(0);
        onTaskCreated?.(response.data);
      } else {
        throw new Error(response.message || '创建任务失败');
      }
    } catch (error: any) {
      message.error(error.message || '上传失败');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // 获取文件图标
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const audioFormats = ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg'];
    const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'];
    
    if (audioFormats.includes(ext || '')) {
      return <FileAudioOutlined style={{ fontSize: 48, color: '#1890ff' }} />;
    } else if (videoFormats.includes(ext || '')) {
      return <VideoCameraOutlined style={{ fontSize: 48, color: '#52c41a' }} />;
    }
    return <InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />;
  };

  return (
    <Card>
      <Title level={3}>
        <CloudUploadOutlined /> 音视频转录
      </Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 文件上传区域 */}
        <div>
          <Text strong>选择文件</Text>
          <Dragger {...uploadProps} style={{ marginTop: 8 }}>
            {fileList.length > 0 ? (
              <div>
                {getFileIcon(fileList[0].name)}
                <p className="ant-upload-text">{fileList[0].name}</p>
                <p className="ant-upload-hint">
                  文件大小: {(fileList[0].size! / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持音频和视频文件，最大 100MB
                  <br />
                  支持格式: MP3, MP4, WAV, M4A, FLAC, AAC, OGG, AVI, MOV, MKV 等
                </p>
              </div>
            )}
          </Dragger>
        </div>

        <Divider />

        {/* 转录配置 */}
        <div>
          <Title level={4}>转录设置</Title>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>语言选择</Text>
              <Select
                value={language}
                onChange={setLanguage}
                style={{ width: '100%', marginTop: 8 }}
                placeholder="选择语言"
              >
                {Object.entries(supportedLanguages).map(([code, name]) => (
                  <Option key={code} value={code}>
                    {name}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <Text strong>输出格式</Text>
              <Select
                value={outputFormat}
                onChange={setOutputFormat}
                style={{ width: '100%', marginTop: 8 }}
              >
                <Option value="json">JSON (包含详细信息)</Option>
                <Option value="srt">SRT (字幕文件)</Option>
                <Option value="txt">TXT (纯文本)</Option>
                <Option value="vtt">VTT (Web字幕)</Option>
              </Select>
            </div>

            <div>
              <Text strong>质量设置</Text>
              <Select
                value={quality}
                onChange={setQuality}
                style={{ width: '100%', marginTop: 8 }}
              >
                <Option value="low">快速模式 (速度快，精度一般)</Option>
                <Option value="medium">标准模式 (平衡速度和精度)</Option>
                <Option value="high">高精度模式 (速度慢，精度高)</Option>
              </Select>
            </div>

            <Space direction="vertical">
              <Checkbox
                checked={enableTimestamps}
                onChange={(e) => setEnableTimestamps(e.target.checked)}
              >
                包含时间戳
              </Checkbox>
              <Checkbox
                checked={enableSpeaker}
                onChange={(e) => setEnableSpeaker(e.target.checked)}
              >
                识别说话人 (实验性功能)
              </Checkbox>
            </Space>
          </div>
        </div>

        {/* 上传进度 */}
        {uploading && (
          <div>
            <Text strong>上传进度</Text>
            <Progress 
              percent={Math.round(uploadProgress)} 
              status={uploadProgress === 100 ? 'success' : 'active'}
              style={{ marginTop: 8 }}
            />
          </div>
        )}

        {/* 开始转录按钮 */}
        <Button
          type="primary"
          size="large"
          icon={<CloudUploadOutlined />}
          onClick={handleStartTranscription}
          loading={uploading}
          disabled={fileList.length === 0}
          style={{ width: '100%' }}
        >
          {uploading ? '上传中...' : '开始转录'}
        </Button>

        {/* 使用说明 */}
        <Card size="small" style={{ backgroundColor: '#f6f8fa' }}>
          <Title level={5}>使用说明</Title>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>支持常见的音频和视频格式</li>
            <li>文件大小限制为 100MB</li>
            <li>转录时间取决于文件长度和选择的质量模式</li>
            <li>转录完成后可以下载多种格式的结果文件</li>
            <li>转录结果会保留 30 天</li>
          </ul>
        </Card>
      </Space>
    </Card>
  );
};

export default TranscriptionUpload;
