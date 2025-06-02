import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Space, Typography, Tabs, message } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import TranscriptionUpload from '../components/TranscriptionUpload';
import TranscriptionTaskList from '../components/TranscriptionTaskList';
import { transcriptionAPI, transcriptionUtils } from '../services/transcription';
import type { TranscriptionStats } from '../services/transcription';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const TranscriptionPage: React.FC = () => {
  const [stats, setStats] = useState<TranscriptionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');

  // 获取用户统计数据
  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await transcriptionAPI.getUserStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  // 任务创建成功回调
  const handleTaskCreated = () => {
    message.success('转录任务创建成功！');
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('tasks'); // 切换到任务列表
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <FileTextOutlined /> 音视频转录服务
        </Title>
        <Text type="secondary">
          支持多种音视频格式的智能转录，提供高精度的语音识别和字幕生成服务
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={stats?.total_tasks || 0}
              prefix={<FileTextOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats?.completed_tasks || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="处理中"
              value={stats?.processing_tasks || 0}
              prefix={<LoadingOutlined />}
              valueStyle={{ color: '#1890ff' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="失败任务"
              value={stats?.failed_tasks || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 详细统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="总处理时长"
              value={stats?.total_duration ? transcriptionUtils.formatDuration(stats.total_duration) : '0:00'}
              prefix={<ClockCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="总文件大小"
              value={stats?.total_file_size ? transcriptionUtils.formatFileSize(stats.total_file_size) : '0 B'}
              prefix={<DatabaseOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="总消耗配额"
              value={stats?.total_quota_cost || 0}
              suffix="配额"
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要功能区域 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
        >
          <TabPane 
            tab={
              <Space>
                <FileTextOutlined />
                上传转录
              </Space>
            } 
            key="upload"
          >
            <TranscriptionUpload onTaskCreated={handleTaskCreated} />
          </TabPane>
          
          <TabPane 
            tab={
              <Space>
                <DatabaseOutlined />
                任务管理
              </Space>
            } 
            key="tasks"
          >
            <TranscriptionTaskList refreshTrigger={refreshTrigger} />
          </TabPane>
        </Tabs>
      </Card>

      {/* 使用指南 */}
      <Card title="使用指南" style={{ marginTop: 24 }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <div>
              <Title level={4}>支持的文件格式</Title>
              <Space direction="vertical">
                <Text><strong>音频格式：</strong>MP3, WAV, M4A, FLAC, AAC, OGG</Text>
                <Text><strong>视频格式：</strong>MP4, AVI, MOV, MKV, WMV, FLV, WebM</Text>
                <Text type="secondary">文件大小限制：100MB</Text>
                <Text type="secondary">时长限制：1小时</Text>
              </Space>
            </div>
          </Col>
          
          <Col xs={24} md={12}>
            <div>
              <Title level={4}>转录功能</Title>
              <Space direction="vertical">
                <Text>• 多语言支持：中文、英语、日语、韩语等</Text>
                <Text>• 自动语言检测</Text>
                <Text>• 时间戳标记</Text>
                <Text>• 说话人识别（实验性）</Text>
                <Text>• 多种输出格式：JSON、SRT、TXT、VTT</Text>
              </Space>
            </div>
          </Col>
          
          <Col xs={24} md={12}>
            <div>
              <Title level={4}>质量模式</Title>
              <Space direction="vertical">
                <Text><strong>快速模式：</strong>速度快，适合实时场景</Text>
                <Text><strong>标准模式：</strong>平衡速度和精度</Text>
                <Text><strong>高精度模式：</strong>最高精度，适合重要内容</Text>
              </Space>
            </div>
          </Col>
          
          <Col xs={24} md={12}>
            <div>
              <Title level={4}>计费说明</Title>
              <Space direction="vertical">
                <Text>• 按音视频时长计费</Text>
                <Text>• 基础费用：100配额/分钟</Text>
                <Text>• 不足1分钟按1分钟计算</Text>
                <Text>• 转录失败不扣费</Text>
                <Text>• 结果文件保留30天</Text>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 常见问题 */}
      <Card title="常见问题" style={{ marginTop: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>Q: 转录需要多长时间？</Text>
            <br />
            <Text>A: 转录时间取决于文件长度和选择的质量模式。通常情况下，1分钟的音频需要30秒到2分钟的处理时间。</Text>
          </div>
          
          <div>
            <Text strong>Q: 支持哪些语言的转录？</Text>
            <br />
            <Text>A: 目前支持中文、英语、日语、韩语、西班牙语、法语、德语、俄语等多种语言，并提供自动语言检测功能。</Text>
          </div>
          
          <div>
            <Text strong>Q: 转录精度如何？</Text>
            <br />
            <Text>A: 转录精度取决于音频质量、说话清晰度和选择的质量模式。在良好条件下，精度可达95%以上。</Text>
          </div>
          
          <div>
            <Text strong>Q: 如何提高转录精度？</Text>
            <br />
            <Text>A: 建议使用高质量音频文件，确保说话清晰，选择正确的语言，并使用高精度模式。</Text>
          </div>
          
          <div>
            <Text strong>Q: 转录结果可以编辑吗？</Text>
            <br />
            <Text>A: 转录完成后可以下载多种格式的结果文件，您可以使用文本编辑器或字幕编辑软件进行后续编辑。</Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default TranscriptionPage;
