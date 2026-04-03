import React from 'react';
import { Download } from 'lucide-react';
import { BomItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface BomTableProps {
  bom: BomItem[];
}

const BOM_COLUMNS: Array<keyof BomItem> = [
  'Anlage',
  'Artikel / Komponente',
  'Beschreibung',
  'Bemerkung',
  'Stück',
  'Eink. Preis / Stk.',
  'Summe Zessionspreis',
  'Verk. Preis / Stk.',
  'Summe Verk. Preis'
];

const BomTable: React.FC<BomTableProps> = ({ bom }: BomTableProps) => {
  const { t } = useLanguage();

  const convertToCsv = (data: BomItem[]) => {
    const headers = BOM_COLUMNS;

    const rows = data.map((item) =>
      headers
        .map((column) => {
          const value = item[column];
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'number') {
            return `${value}`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(',')
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

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">{t('main.bomTitle')}</h3>
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {BOM_COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {bom.map((item: BomItem, index: number) => (
              <tr key={index}>
                {BOM_COLUMNS.map((column) => {
                  const value = item[column];
                  return (
                    <td key={`${index}-${column}`} className="px-4 py-3 align-top text-gray-700 whitespace-nowrap">
                      {value === null ? '-' : String(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={downloadCsv}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Download className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
        {t('main.bomDownload')}
      </button>
    </div>
  );
};

export default BomTable;
