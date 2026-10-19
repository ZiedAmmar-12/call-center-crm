import {useState , useEffect} from 'react';
import {Eye} from 'lucide-react';
interface DataPreviewProps {
    file:File ;
    columnMapping: Record<string, string>;
}

export function DataPreview({file, columnMapping}:DataPreviewProps) {
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!file || Object.keys(columnMapping).length === 0) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            //parser et afficher les 5 premières lignes du fichier
            const content = reader.result as string;
            const lines = content.split('\n').slice(0, 6);
            setPreviewData(lines);
            setLoading(false);
        };
        reader.readAsText(file.slice(0,32*1024));
    }, [file, columnMapping]);
    if (loading) return <div className="text-center py-4">Chargement de l'aperçu...</div>;
    return (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
                <Eye className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Aperçu des données</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                            {Object.values(columnMapping).map((field) => (
                                <th key={field} className="px-3 py-2 text-left font-medium">{field}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {previewData.slice(1, 6).map((line, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                {Object.values(columnMapping).map((field) => (
                                    <td key={field} className="px-3 py-2 text-gray-700">-</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );}
    
