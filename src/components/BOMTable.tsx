import React from 'react';
import { Download, Target, AlertTriangle } from 'lucide-react';
import { BomItem, BomMatchCandidate } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface BomTableProps {
  bom: BomItem[];
}

const BOM_COLUMNS: Array<{ key: keyof BomItem; csvOnly?: boolean }> = [
  { key: 'Anlage' },
  { key: 'Artikel / Komponente' },
  { key: 'Beschreibung' },
  { key: 'Bemerkung' },
  { key: 'Stück' },
  { key: 'Größe' },
  { key: 'Signal' },
  { key: 'Material' },
  { key: 'Norm' },
  { key: 'Match Code' },
  { key: 'Match Score' },
  { key: 'Match Kandidaten', csvOnly: true },
  { key: 'Eink. Preis / Stk.' },
  { key: 'Summe Zessionspreis' },
  { key: 'Verk. Preis / Stk.' },
  { key: 'Summe Verk. Preis' }
];

const formatCell = (item: BomItem, key: keyof BomItem): string => {
  const value = item[key];
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) {
    return (value as BomMatchCandidate[])
      .map((candidate) => `${candidate.code} (${Math.round(candidate.score * 100)}%)`)
      .join(' | ');
  }
  if (typeof value === 'number') {
    if (key === 'Match Score') return `${Math.round(value * 100)}%`;
    return String(value);
  }
  return String(value);
};

const csvEscape = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    const joined = (value as BomMatchCandidate[])
      .map((c) => `${c.code} (${Math.round(c.score * 100)}%)`)
      .join(' | ');
    return `"${joined.replace(/"/g, '""')}"`;
  }
  if (typeof value === 'number') return `${value}`;
  return `"${String(value).replace(/"/g, '""')}"`;
};

const BomTable: React.FC<BomTableProps> = ({ bom }: BomTableProps) => {
  const { t } = useLanguage();

  const convertToCsv = (data: BomItem[]) => {
    const headers = BOM_COLUMNS.map((c) => c.key);
    const rows = data.map((item) =>
      headers.map((key) => csvEscape(item[key])).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCsv = () => {
    const csv = convertToCsv(bom);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'stueckliste.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!bom || bom.length === 0) {
    return <p className="text-gray-600">{t('main.noBom')}</p>;
  }

  const visibleColumns = BOM_COLUMNS.filter((c) => !c.csvOnly);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t('main.bomTitle')}</h3>
        <button
          onClick={downloadCsv}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Download className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          {t('main.bomDownload')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {bom.map((item, index) => {
              const matchScore = item['Match Score'];
              const highConfidence = typeof matchScore === 'number' && matchScore >= 0.75;
              const lowConfidence =
                typeof matchScore === 'number' && matchScore > 0 && matchScore < 0.55;

              return (
                <tr key={index} className={lowConfidence ? 'bg-yellow-50' : ''}>
                  {visibleColumns.map((col) => {
                    const formatted = formatCell(item, col.key);
                    if (col.key === 'Match Code') {
                      return (
                        <td
                          key={`${index}-${col.key}`}
                          className="px-3 py-2 align-top text-gray-700 whitespace-nowrap"
                        >
                          {formatted === '-' ? (
                            <span className="text-gray-400">{t('bom.noMatch')}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Target
                                className={`w-3.5 h-3.5 ${highConfidence ? 'text-green-600' : 'text-indigo-500'}`}
                              />
                              <span className="font-medium text-indigo-700">{formatted}</span>
                            </span>
                          )}
                        </td>
                      );
                    }
                    if (col.key === 'Match Score' && lowConfidence) {
                      return (
                        <td
                          key={`${index}-${col.key}`}
                          className="px-3 py-2 align-top whitespace-nowrap text-yellow-700"
                        >
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {formatted}
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={`${index}-${col.key}`}
                        className="px-3 py-2 align-top text-gray-700 whitespace-nowrap"
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BomTable;
