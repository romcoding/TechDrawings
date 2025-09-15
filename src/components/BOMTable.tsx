import React from 'react';
import { Download } from 'lucide-react';
import { BomItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface BomTableProps {
  bom: BomItem[];
}

const BomTable: React.FC<BomTableProps> = ({ bom }: BomTableProps) => {
  const { t } = useLanguage();
  
  const convertToCsv = (data: BomItem[]) => {
    const headers = [t('main.bomColumns.anlage'), t('main.bomColumns.artikel'), t('main.bomColumns.komponente'), t('main.bomColumns.beschreibung'), t('main.bomColumns.bemerkung'), t('main.bomColumns.stueck')];
    const rows = data.map(item => [
      `"${item.anlage.replace(/"/g, '""')}"`,
      `"${item.artikel.replace(/"/g, '""')}"`,
      `"${item.komponente.replace(/"/g, '""')}"`,
      `"${item.beschreibung.replace(/"/g, '""')}"`,
      `"${item.bemerkung.replace(/"/g, '""')}"`,
      item.stueck.toString(),
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCsv = () => {
    const csv = convertToCsv(bom);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'bill_of_materials.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!bom || bom.length === 0) {
    return <p className="text-gray-600">{t('main.noBom')}</p>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">{t('main.bomTitle')}</h3>
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('main.bomColumns.anlage')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('main.bomColumns.artikel')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('main.bomColumns.komponente')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('main.bomColumns.beschreibung')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('main.bomColumns.bemerkung')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('main.bomColumns.stueck')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bom.map((item: BomItem, index: number) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.anlage}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.artikel}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.komponente}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.beschreibung}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.bemerkung}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{item.stueck}</td>
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
