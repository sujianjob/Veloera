import React, { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Progress,
  Modal,
  message,
  Tooltip,
  Card,
  Select,
  Input,
  Typography,
  Popconfirm,
  Drawer
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  StopOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { transcriptionAPI } from '../services/api';
import { formatFileSize, formatDuration, formatDateTime } from '../utils/format';

const { Option } = Select;
const { Search } = Input;
const { Title, Text, Paragraph } = Typography;

interface TranscriptionTask {
  id: number;
  original_filename: string;
  file_size: number;
  file_type: string;
  duration?: number;
  language: string;
  status: string;
  progress: number;
  error_message?: string;
  result_text?: string;
  confidence_score?: number;
  quota_cost: number;
  created_at: string;
  completed_at?: string;
  channel: {
    name: string;
    engine_type: number;
  };
}

interface TranscriptionTaskListProps {
  refreshTrigger?: number;
}

const TranscriptionTaskList: React.FC<TranscriptionTaskListProps> = ({ refreshTrigger }) => {
  const [tasks, setTasks] = useState<TranscriptionTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewTask, setPreviewTask] = useState<TranscriptionTask | null>(null);

  // 获取任务列表
  const fetchTasks = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        ...(filters.status && { status: filters.status }),
      };

      const response = await transcriptionAPI.getUserTasks(params);
      if (response.success) {
        setTasks(response.data.tasks);
        setPagination({
          current: page,
          pageSize,
          total: response.data.total,
        });
      }
    } catch (error) {
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和刷新触发
  useEffect(() => {
    fetchTasks();
  }, [refreshTrigger, filters.status]);

  // 状态标签颜色
  const getStatusTag = (status: string, progress: number) => {
    const statusConfig = {
      pending: { color: 'default', text: '等待中' },
      uploading: { color: 'blue', text: '上传中' },
      processing: { color: 'orange', text: '转录中' },
      completed: { color: 'green', text: '已完成' },
      failed: { color: 'red', text: '失败' },
      cancelled: { color: 'default', text: '已取消' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    
    return (
      <Space direction="vertical" size={2}>
        <Tag color={config.color}>{config.text}</Tag>
        {(status === 'uploading' || status === 'processing') && (
          <Progress percent={progress} size="small" />
        )}
      </Space>
    );
  };

  // 预览转录结果
  const handlePreview = async (task: TranscriptionTask) => {
    if (task.status !== 'completed') {
      message.warning('任务未完成，无法预览');
      return;
    }

    try {
      const response = await transcriptionAPI.previewResult(task.id, 'text');
      if (response.success) {
        setPreviewContent(response.data.text || '暂无转录内容');
        setPreviewTask(task);
        setPreviewVisible(true);
      }
    } catch (error) {
      message.error('预览失败');
    }
  };

  // 下载结果
  const handleDownload = async (task: TranscriptionTask, format = 'json') => {
    if (task.status !== 'completed') {
      message.warning('任务未完成，无法下载');
      return;
    }

    try {
      const response = await transcriptionAPI.downloadResult(task.id, format);
      
      // 创建下载链接
      const blob = new Blob([response], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${task.original_filename}_result.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('下载成功');
    } catch (error) {
      message.error('下载失败');
    }
  };

  // 取消任务
  const handleCancel = async (taskId: number) => {
    try {
      const response = await transcriptionAPI.cancelTask(taskId);
      if (response.success) {
        message.success('任务已取消');
        fetchTasks(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      message.error('取消任务失败');
    }
  };

  // 删除任务
  const handleDelete = async (taskId: number) => {
    try {
      const response = await transcriptionAPI.deleteTask(taskId);
      if (response.success) {
        message.success('任务已删除');
        fetchTasks(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      message.error('删除任务失败');
    }
  };

  // 表格列定义
  const columns: ColumnsType<TranscriptionTask> = [
    {
      title: '文件名',
      dataIndex: 'original_filename',
      key: 'filename',
      ellipsis: true,
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatFileSize(record.file_size)} • {record.file_type.toUpperCase()}
            {record.duration && ` • ${formatDuration(record.duration)}`}
          </Text>
        </Space>
      ),
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 80,
      render: (language) => {
        const languageMap: Record<string, string> = {
          auto: '自动',
          zh: '中文',
          en: '英语',
          ja: '日语',
          ko: '韩语',
        };
        return languageMap[language] || language;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => getStatusTag(status, record.progress),
    },
    {
      title: '转录引擎',
      dataIndex: ['channel', 'name'],
      key: 'engine',
      width: 120,
      ellipsis: true,
    },
    {
      title: '费用',
      dataIndex: 'quota_cost',
      key: 'cost',
      width: 80,
      render: (cost) => `${cost} 配额`,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (time) => formatDateTime(time),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'completed' && (
            <>
              <Tooltip title="预览结果">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(record)}
                />
              </Tooltip>
              <Tooltip title="下载结果">
                <Button
                  type="text"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(record)}
                />
              </Tooltip>
            </>
          )}
          
          {(record.status === 'pending' || record.status === 'processing') && (
            <Tooltip title="取消任务">
              <Popconfirm
                title="确定要取消这个任务吗？"
                onConfirm={() => handleCancel(record.id)}
              >
                <Button type="text" icon={<StopOutlined />} danger />
              </Popconfirm>
            </Tooltip>
          )}
          
          {(record.status === 'completed' || record.status === 'failed' || record.status === 'cancelled') && (
            <Tooltip title="删除任务">
              <Popconfirm
                title="确定要删除这个任务吗？删除后无法恢复。"
                onConfirm={() => handleDelete(record.id)}
              >
                <Button type="text" icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="筛选状态"
            style={{ width: 120 }}
            allowClear
            value={filters.status || undefined}
            onChange={(value) => setFilters({ ...filters, status: value || '' })}
          >
            <Option value="pending">等待中</Option>
            <Option value="processing">转录中</Option>
            <Option value="completed">已完成</Option>
            <Option value="failed">失败</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchTasks(pagination.current, pagination.pageSize)}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          onChange: (page, pageSize) => {
            fetchTasks(page, pageSize);
          },
        }}
        scroll={{ x: 1000 }}
      />

      {/* 预览抽屉 */}
      <Drawer
        title={
          <Space>
            <FileTextOutlined />
            转录结果预览
          </Space>
        }
        width={600}
        open={previewVisible}
        onClose={() => setPreviewVisible(false)}
        extra={
          previewTask && (
            <Space>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(previewTask, 'txt')}
              >
                下载文本
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(previewTask, 'srt')}
              >
                下载字幕
              </Button>
            </Space>
          )
        }
      >
        {previewTask && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card size="small">
              <Space direction="vertical" size="small">
                <Text strong>文件信息</Text>
                <Text>文件名: {previewTask.original_filename}</Text>
                <Text>大小: {formatFileSize(previewTask.file_size)}</Text>
                {previewTask.duration && (
                  <Text>时长: {formatDuration(previewTask.duration)}</Text>
                )}
                {previewTask.confidence_score && (
                  <Text>置信度: {(previewTask.confidence_score * 100).toFixed(1)}%</Text>
                )}
              </Space>
            </Card>
            
            <Card size="small">
              <Text strong>转录内容</Text>
              <Paragraph
                style={{
                  marginTop: 8,
                  maxHeight: 400,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                }}
              >
                {previewContent}
              </Paragraph>
            </Card>
          </Space>
        )}
      </Drawer>
    </Card>
  );
};

export default TranscriptionTaskList;
