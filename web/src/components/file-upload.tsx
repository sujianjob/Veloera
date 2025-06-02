import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, AlertCircle } from 'lucide-react'
import { cn, formatFileSize, isSupportedFile } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  selectedFile?: File
  maxSize?: number // in bytes
  accept?: string[]
  disabled?: boolean
  className?: string
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  maxSize = 100 * 1024 * 1024, // 100MB
  accept = ['audio/*', 'video/*'],
  disabled = false,
  className
}: FileUploadProps) {
  const [error, setError] = useState<string>('')

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError('')

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`文件大小不能超过 ${formatFileSize(maxSize)}`)
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('不支持的文件格式')
      } else {
        setError('文件上传失败')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      
      // 额外检查文件格式
      if (!isSupportedFile(file.name)) {
        setError('不支持的文件格式，请上传音频或视频文件')
        return
      }

      onFileSelect(file)
    }
  }, [maxSize, onFileSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg', '.wma', '.amr'],
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm']
    },
    maxSize,
    multiple: false,
    disabled
  })

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setError('')
    onFileRemove()
  }

  return (
    <div className={cn('w-full', className)}>
      <Card className={cn(
        'border-2 border-dashed transition-colors',
        isDragActive && 'border-primary bg-primary/5',
        error && 'border-destructive',
        disabled && 'opacity-50 cursor-not-allowed'
      )}>
        <CardContent className="p-6">
          {selectedFile ? (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                disabled={disabled}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={cn(
                'flex flex-col items-center justify-center py-8 cursor-pointer',
                disabled && 'cursor-not-allowed'
              )}
            >
              <input {...getInputProps()} />
              <Upload className={cn(
                'h-12 w-12 mb-4',
                isDragActive ? 'text-primary' : 'text-muted-foreground'
              )} />
              <div className="text-center">
                <p className="text-lg font-medium mb-2">
                  {isDragActive ? '释放文件以上传' : '拖拽文件到此处或点击选择'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  支持音频和视频文件，最大 {formatFileSize(maxSize)}
                </p>
                <p className="text-xs text-muted-foreground">
                  支持格式：MP3, MP4, WAV, M4A, FLAC, AAC, OGG, AVI, MOV, MKV 等
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
