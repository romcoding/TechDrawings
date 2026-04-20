import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Database, Trash2, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CompanyDatabaseUploadProps {
  apiUrl: string;
}

interface Status {
  uploaded: boolean;
  count: number;
  filename?: string;
  preview?: Array<{ code: string; description: string }>;
}

export const CompanyDatabaseUpload: React.FC<CompanyDatabaseUploadProps> = ({ apiUrl }) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status>({ uploaded: false, count: 0 });
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/company-database`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setStatus({
        uploaded: Boolean(data.uploaded),
        count: Number(data.count || 0),
        filename: data.meta?.filename,
        preview: data.preview || []
      });
    } catch (e) {
      // silent: feature is optional
    }
  }, [apiUrl]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const file = files[0];
      if (!/\.csv$/i.test(file.name)) {
        setError(t('db.onlyCsv'));
        return;
      }
      setError('');
      setIsUploading(true);
      try {
        const text = await file.text();
        const res = await fetch(`${apiUrl}/api/company-database`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: text, filename: file.name })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t('db.uploadFailed'));
          return;
        }
        setStatus({
          uploaded: true,
          count: data.count,
          filename: data.filename,
          preview: data.preview || []
        });
      } catch (e) {
        setError((e as Error).message || t('db.uploadFailed'));
      } finally {
        setIsUploading(false);
      }
    },
    [apiUrl, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] }
  });

  const clearDatabase = async () => {
    try {
      await fetch(`${apiUrl}/api/company-database`, {
        method: 'DELETE',
        credentials: 'include'
      });
      setStatus({ uploaded: false, count: 0 });
    } catch (e) {
      setError(t('db.deleteFailed'));
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-5 h-5 text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-900">{t('db.title')}</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">{t('db.description')}</p>

      {status.uploaded ? (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {status.filename || 'database.csv'} · {status.count} {t('db.entries')}
            </span>
          </div>
          <button
            onClick={clearDatabase}
            className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-xs"
            title={t('db.remove')}
          >
            <Trash2 className="w-4 h-4" />
            {t('db.remove')}
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition
            ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'}
          `}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-5 h-5 text-indigo-500" />
          <div className="text-xs text-gray-600">
            {isUploading ? t('db.uploading') : t('db.cta')}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default CompanyDatabaseUpload;
