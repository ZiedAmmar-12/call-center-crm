import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Columns3, RotateCcw, Wand2 } from "lucide-react";

type ColumnMappingValue = Record<string, string>;

export interface ColumnMappingStatus {
    isCsv: boolean;
    isLoading: boolean;
    hasDetectedColumns: boolean;
    hasPhoneMapping: boolean;
}

interface ColumnMappingProps {
    file: File | null;
    value: ColumnMappingValue;
    onChange: (mapping: ColumnMappingValue) => void;
    onStatusChange?: (status: ColumnMappingStatus) => void;
    disabled?: boolean;
}

const targetFields = [
    { value: "phoneNumber", label: "Telephone", required: true },
    { value: "lastName", label: "Nom", required: false },
    { value: "firstName", label: "Prenom", required: false },
    { value: "address", label: "Adresse", required: false },
    { value: "postalCode", label: "Code postal", required: false },
    { value: "city", label: "Ville", required: false },
    { value: "email", label: "Email", required: false },
];

const fieldKeywords: Record<string, string[]> = {
    phoneNumber: ["telephone", "tel", "phone", "mobile", "gsm", "numero", "contact", "n"],
    lastName: ["nom", "lastname", "last name", "surname", "family"],
    firstName: ["prenom", "firstname", "first name", "given"],
    address: ["adresse", "address", "rue", "street", "voie"],
    postalCode: ["code postal", "codepostal", "postal", "postcode", "zip", "cp"],
    city: ["ville", "city", "commune", "town"],
    email: ["email", "e-mail", "mail", "courriel"],
};

const normalizeHeader = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const parseCsvHeader = (content: string): string[] => {
    const headers: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"';
            i++;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (!inQuotes && char === ",") {
            headers.push(current.trim());
            current = "";
            continue;
        }

        if (!inQuotes && (char === "\n" || char === "\r")) {
            break;
        }

        current += char;
    }

    headers.push(current.trim());
    return headers.filter(Boolean);
};

const suggestMapping = (columns: string[]): ColumnMappingValue => {
    const mapping: ColumnMappingValue = {};

    columns.forEach((column) => {
        const normalizedColumn = normalizeHeader(column);
        const match = Object.entries(fieldKeywords).find(([, keywords]) =>
            keywords.some((keyword) => normalizedColumn === keyword || normalizedColumn.startsWith(keyword))
        );

        if (match) {
            mapping[column] = match[0];
        }
    });

    return mapping;
};

export const ColumnMapping = ({ file, value, onChange, onStatusChange, disabled = false }: ColumnMappingProps) => {
    const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
    const [suggestedMapping, setSuggestedMapping] = useState<ColumnMappingValue>({});
    const [message, setMessage] = useState<string | null>(null);
    const [isReadingHeaders, setIsReadingHeaders] = useState(false);

    const isCsv = useMemo(() => file?.name.toLowerCase().endsWith(".csv") ?? false, [file]);
    const hasPhoneMapping = Object.values(value).includes("phoneNumber");
    const mappedCount = Object.values(value).filter(Boolean).length;

    useEffect(() => {
        onStatusChange?.({
            isCsv,
            isLoading: isReadingHeaders,
            hasDetectedColumns: detectedColumns.length > 0,
            hasPhoneMapping,
        });
    }, [detectedColumns.length, hasPhoneMapping, isCsv, isReadingHeaders, onStatusChange]);

    useEffect(() => {
        if (!file) {
            setDetectedColumns([]);
            setSuggestedMapping({});
            setMessage(null);
            setIsReadingHeaders(false);
            onChange({});
            return;
        }

        if (!isCsv) {
            setDetectedColumns([]);
            setSuggestedMapping({});
            setMessage("Le mapping manuel est disponible pour les fichiers CSV.");
            setIsReadingHeaders(false);
            onChange({});
            return;
        }

        let cancelled = false;
        const reader = new FileReader();
        setIsReadingHeaders(true);

        reader.onload = () => {
            if (cancelled) return;

            const content = typeof reader.result === "string" ? reader.result : "";
            const columns = parseCsvHeader(content);
            const nextSuggestedMapping = suggestMapping(columns);

            setDetectedColumns(columns);
            setSuggestedMapping(nextSuggestedMapping);
            setMessage(columns.length === 0 ? "Aucun en-tete detecte dans le fichier." : null);
            setIsReadingHeaders(false);
            onChange(nextSuggestedMapping);
        };

        reader.onerror = () => {
            if (cancelled) return;
            setDetectedColumns([]);
            setSuggestedMapping({});
            setMessage("Impossible de lire les colonnes du fichier.");
            setIsReadingHeaders(false);
            onChange({});
        };

        reader.readAsText(file.slice(0, 16 * 1024));

        return () => {
            cancelled = true;
            if (reader.readyState === FileReader.LOADING) {
                reader.abort();
            }
        };
    }, [file, isCsv, onChange]);

    if (!file) return null;

    const updateColumn = (column: string, targetField: string) => {
        const next = { ...value };

        if (targetField) {
            next[column] = targetField;
        } else {
            delete next[column];
        }

        onChange(next);
    };

    const applySuggestions = () => onChange(suggestedMapping);
    const clearMapping = () => onChange({});

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Columns3 className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900">Mapping des colonnes</h4>
                            <p className="text-xs text-gray-500">Telephone est obligatoire. Les autres champs sont optionnels.</p>
                        </div>
                    </div>
                    {detectedColumns.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                                {mappedCount}/{detectedColumns.length} mappees
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                                hasPhoneMapping
                                    ? "bg-green-50 text-green-700 ring-green-200"
                                    : "bg-red-50 text-red-700 ring-red-200"
                            }`}>
                                {hasPhoneMapping ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                                Telephone
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {message && (
                <div className="m-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{message}</span>
                </div>
            )}

            {detectedColumns.length > 0 && (
                <div className="p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-gray-500">
                            Les suggestions sont appliquees automatiquement. Verifiez surtout la colonne telephone.
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={applySuggestions}
                                disabled={disabled || Object.keys(suggestedMapping).length === 0}
                                className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Wand2 className="h-3.5 w-3.5" />
                                Suggestions
                            </button>
                            <button
                                type="button"
                                onClick={clearMapping}
                                disabled={disabled || mappedCount === 0}
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Effacer
                            </button>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-gray-200">
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(190px,230px)] border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase text-gray-500">
                            <span>Colonne du fichier</span>
                            <span>Champ CRM</span>
                        </div>
                        <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto bg-white">
                        {detectedColumns.map((column) => (
                            <div key={column} className="grid grid-cols-[minmax(0,1fr)_minmax(190px,230px)] items-center gap-3 px-3 py-2">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-gray-800" title={column}>
                                        {column}
                                    </div>
                                    {suggestedMapping[column] && (
                                        <div className="mt-0.5 text-xs text-blue-600">
                                            Suggestion: {targetFields.find((field) => field.value === suggestedMapping[column])?.label}
                                        </div>
                                    )}
                                </div>
                                <select
                                    value={value[column] ?? ""}
                                    onChange={(event) => updateColumn(column, event.target.value)}
                                    disabled={disabled}
                                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                                >
                                    <option value="">Ignorer</option>
                                    {targetFields.map((field) => (
                                        <option
                                            key={field.value}
                                            value={field.value}
                                            disabled={Object.entries(value).some(([mappedColumn, mappedField]) =>
                                                mappedColumn !== column && mappedField === field.value
                                            )}
                                        >
                                            {field.label}{field.required ? " *" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
            )}

            {detectedColumns.length > 0 && !hasPhoneMapping && (
                <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    Selectionnez la colonne qui contient les numeros de telephone.
                </div>
            )}
        </div>
    );
};
