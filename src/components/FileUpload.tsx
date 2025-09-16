import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image, File, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const allowedTypes = [
        'image/png',
        'image/jpeg',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];

      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        // Optionally, provide user feedback about unsupported file type
        console.error('Unsupported file type:', file.type);
        alert('Invalid file format. Please upload images (PNG, JPG, JPEG) or PDF, DOC, DOCX files.');
      }
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false)
  });

  const removeFile = () => {
    setSelectedFile(null);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return <Image className="w-6 h-6" />;
    if (fileType.includes('pdf')) return <FileText className="w-6 h-6" />;
    if (fileType.includes('word') || fileType.includes('document')) return <File className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
              : isDragReject 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }
          `}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full">
              <Upload className="w-8 h-8 text-white" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {isDragActive ? 'Drop your file here' : 'Upload Technical Drawing'}
              </h3>
              <p className="text-gray-600 mb-4">
                Drag & drop your file here, or click to browse
              </p>
              
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Image className="w-4 h-4" />
                  PNG, JPG
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  PDF
                </span>
                <span className="flex items-center gap-1">
                  <File className="w-4 h-4" />
                  DOC, DOCX
                </span>
              </div>
            </div>
          </div>
          
          {isDragReject && (
            <div className="absolute inset-0 bg-red-50 border-2 border-red-500 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <X className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 font-medium">File type not supported</p>
                <p className="text-red-500 text-sm">Please use PNG, JPG, PDF, or DOC files</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {getFileIcon(selectedFile.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={removeFile}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Maximale Datei Grösse: 20MB • Unterstützte Formate: PNG, JPG, PDF, DOC, DOCX
        </p>
      </div>
    </div>
  );
};
