import React from 'react';
import { Download } from 'lucide-react';

interface BomItem {
  component_name: string;
  type: string;
  manufacturer?: string;
  model?: string;
  quantity: number;
  specifications?: string;
  category?: string;
}

interface BomTableProps {
  bom: BomItem[];
}

const BomTable: React.FC<BomTableProps> = ({ bom }: BomTableProps) => {
  const convertToCsv = (data: BomItem[]) => {
    const headers = ["Component Name", "Type", "Category", "Manufacturer", "Model", "Quantity", "Specifications"];
    const rows = data.map(item => [
      `"${item.component_name.replace(/"/g, '""')}"`,
      `"${item.type.replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.manufacturer || '').replace(/"/g, '""')}"`,
      `"${(item.model || '').replace(/"/g, '""')}"`,
      item.quantity.toString(),
      `"${(item.specifications || '').replace(/"/g, '""')}"`,
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
    return <p className="text-gray-600">No Bill of Materials found for this document.</p>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Bill of Materials (BOM)</h3>
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specifications</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bom.map((item: BomItem, index: number) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.component_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.manufacturer || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.model || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.specifications || 'N/A'}</td>
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
        Download BOM as CSV
      </button>
    </div>
  );
};

export default BomTable;
