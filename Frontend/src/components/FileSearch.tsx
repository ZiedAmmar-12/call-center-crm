import React, { useState, useEffect } from "react";
import { Search, X, FileText, Building2, Calendar, Users, Loader2 } from 'lucide-react';
import { sourceFileService } from "../services/SourceFileService";
import type{ FileSearchResponseDto } from "../types/sourceFiles";

const FileSearch: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<FileSearchResponseDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.length > 2 || searchTerm.length === 0) {
                performSearch();
            }
        }, 500); // Debounce delay of 500ms

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const performSearch = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await sourceFileService.searchFiles(searchTerm);
            setSearchResults(data);
        } catch {
            setError('An error occurred while searching for files.');
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };
    const clearSearch = () => {
        setSearchTerm('');
        setSearchResults([]);
        setError('');
    };
     return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Search Input with Icons */}
            <div className="mb-6">
                <div className="relative flex items-center">
                    <Search className="absolute left-3 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by supplier or file name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchTerm && (
                        <button 
                            onClick={clearSearch} 
                            className="absolute right-3 text-gray-400 hover:text-gray-600"
                        >
                            <X size={18} />
                        </button>
                    )}
                    {isLoading   && (
                        <Loader2 className="absolute right-3 text-blue-500 animate-spin" size={20} />
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 p-3 mb-4 text-red-700 bg-red-100 rounded-lg">
                    <X size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Results Info */}
            {!isLoading && searchResults.length > 0 && (
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                    <FileText size={16} />
                    <span>Found {searchResults.length} file(s)</span>
                </div>
            )}

            {/* No Results */}
            {!isLoading && searchTerm.length >= 2 && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Search size={48} />
                    <p className="mt-2">No files found for "{searchTerm}"</p>
                </div>
            )}

            {/* Results Table */}
            {!isLoading && searchResults.length > 0 && (
                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    File Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Supplier
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Upload Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contacts
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {searchResults.map((file) => (
                                <tr key={file.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-gray-400" />
                                            <span>{file.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={16} className="text-gray-400" />
                                            <span>{file.supplierName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-400" />
                                            <span>
                                                {new Date(file.uploadedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex items-center gap-2">
                                            <Users size={16} className="text-gray-400" />
                                            <span>{file.totalContacts}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
export default FileSearch;
