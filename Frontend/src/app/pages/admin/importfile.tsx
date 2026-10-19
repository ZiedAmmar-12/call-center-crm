import React, { useState } from 'react';
import { Layout } from '../../components/Layout';



type Payes = 'France' | 'Belgique' | 'Suisse';
type TypeClient = 'B2B' | 'B2C';

type FichierSource = {
    id: string;
    nom: string;
    contacts: number;
    taille: string;
    dateUpload: string;
    statut: 'original' | 'injecte' | 'traite';
    fournisseurId: string;
};

type Fournisseur = {
    id: string;
    nom: string;
    fichiers: FichierSource[];
};

type TypeNode = {
    id: string;
    type: TypeClient;
    fournisseurs: Fournisseur[];
};

type PaysNode = {
    id: string;
    pays: Payes;
    types: TypeNode[];
};

const DEFAULT_PAYES_DATA: PaysNode[] = [
    {
        id: 'france',
        pays: 'France',
        types: [
            {
                id: 'france-b2b',
                type: 'B2B',
                fournisseurs: [
                    {
                        id: 'fournisseurA',
                        nom: 'fournisseur A',
                        fichiers: [
                            {
                                id: 'fichierA-1',
                                nom: 'A liste 1',
                                contacts: 125430,
                                taille: '24.3 MB',
                                dateUpload: '2026-04-07',
                                statut: 'original',
                                fournisseurId: 'fournisseurA',
                            },
                            {
                                id: 'fichierA-2',
                                nom: 'A liste 2',
                                contacts: 89000,
                                taille: '18.2 MB',
                                dateUpload: '2026-04-06',
                                statut: 'injecte',
                                fournisseurId: 'fournisseurA',
                            },
                        ],
                    },
                    {
                        id: 'fournisseurB',
                        nom: 'fournisseur B',
                        fichiers: [
                            {
                                id: 'fichierB-1',
                                nom: 'B liste 1',
                                contacts: 8200,
                                taille: '2.1 MB',
                                dateUpload: '2026-04-06',
                                statut: 'injecte',
                                fournisseurId: 'fournisseurB',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'france-b2c',
                type: 'B2C',
                fournisseurs: [
                    {
                        id: 'fournisseurC',
                        nom: 'fournisseur C',
                        fichiers: [
                            {
                                id: 'fichierC-1',
                                nom: 'C liste 1',
                                contacts: 450000,
                                taille: '87.6 MB',
                                dateUpload: '2026-04-05',
                                statut: 'original',
                                fournisseurId: 'fournisseurC',
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'belgique',
        pays: 'Belgique',
        types: [
            {
                id: 'belgique-b2b',
                type: 'B2B',
                fournisseurs: [
                    {
                        id: 'fournisseur-proximus',
                        nom: 'Proximus',
                        fichiers: [
                            {
                                id: 'fichier-proximus-1',
                                nom: 'entreprises_bruxelles',
                                contacts: 25000,
                                taille: '4.1 MB',
                                dateUpload: '2026-04-02',
                                statut: 'original',
                                fournisseurId: 'fournisseur-proximus',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'belgique-b2c',
                type: 'B2C',
                fournisseurs: [
                    {
                        id: 'fournisseur-telenet',
                        nom: 'Telenet',
                        fichiers: [
                            {
                                id: 'fichier-telenet-1',
                                nom: 'clients_flandre',
                                contacts: 15000,
                                taille: '2.8 MB',
                                dateUpload: '2026-03-30',
                                statut: 'original',
                                fournisseurId: 'fournisseur-telenet',
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'suisse',
        pays: 'Suisse',
        types: [
            {
                id: 'suisse-b2b',
                type: 'B2B',
                fournisseurs: [
                    {
                        id: 'fournisseur-swisscom',
                        nom: 'Swisscom',
                        fichiers: [
                            {
                                id: 'fichier-swisscom-1',
                                nom: 'entreprises_romande',
                                contacts: 12000,
                                taille: '2.3 MB',
                                dateUpload: '2026-03-28',
                                statut: 'original',
                                fournisseurId: 'fournisseur-swisscom',
                            },
                        ],
                    },
                ],
            },
        ],
    },
];

type TabId = 'sources de fichiers' | 'fichiers injectés'|'fichiers recyclés';
const TABS: {id:TabId,label:string}[] = [
    {id:'sources de fichiers', label:'Sources de fichiers'},
    {id:'fichiers injectés', label:'Fichiers injectés'},
    {id:'fichiers recyclés', label:'Fichiers recyclés'},
];


/* =======================
   HOOK (STATE + LOGIC)
======================= */
function Breadcrumb({ activeTab }: { activeTab: TabId }) {
  const getBreadcrumbText = () => {
    switch (activeTab) {
      case 'sources de fichiers': return 'Fichiers sources';
      case 'fichiers injectés': return 'Injections › Listes en cours';
      case 'fichiers recyclés': return 'Recyclage › Listes traitées';
      default: return 'Fichiers sources';
    }
  };

function useImportFileData() {
    const [paysData, setPaysData] = useState<PaysNode[]>([
        ...DEFAULT_PAYES_DATA,
    ]);

    const renommerFichier = (
        paysId: string,
        typeId: string,
        fournisseurId: string,
        fichierId: string,
        nouveauNom: string
    ) => {
        setPaysData(prev =>
            prev.map(pays => {
                if (pays.id !== paysId) return pays;
                return {
                    ...pays,
                    types: pays.types.map(type => {
                        if (type.id !== typeId) return type;
                        return {
                            ...type,
                            fournisseurs: type.fournisseurs.map(fournisseur => {
                                if (fournisseur.id !== fournisseurId) return fournisseur;
                                return {
                                    ...fournisseur,
                                    fichiers: fournisseur.fichiers.map(fichier => {
                                        if (fichier.id !== fichierId) return fichier;
                                        return {
                                            ...fichier,
                                            nom: nouveauNom,
                                        };
                                    }),
                                };
                            }),
                        };
                    }),
                };
            })
        );
    }



    const ajouterFichier = (paysId: string, typeId: string, fournisseurId: string, nouveauFichier: FichierSource) => {
        setPaysData(prev =>
            prev.map(pays => {
                if (pays.id !== paysId) return pays;

                return {
                    ...pays,
                    types: pays.types.map(type => {
                        if (type.id !== typeId) return type;

                        return {
                            ...type,
                            fournisseurs: type.fournisseurs.map(fournisseur => {
                                if (fournisseur.id !== fournisseurId) return fournisseur;

                                return {
                                    ...fournisseur,
                                    fichiers: [...fournisseur.fichiers, nouveauFichier],
                                };
                            }),
                        };
                    }),
                };
            })
        );
    };

    const supprimerFichier = (
        paysId: string,
        typeId: string,
        fournisseurId: string,
        fichierId: string) => {
        setPaysData(prev =>
            prev.map(pays => {
                if (pays.id !== paysId) return pays;
                return {
                    ...pays,
                    types: pays.types.map(type => {
                        if (type.id !== typeId) return type;
                        return {
                            ...type,
                            fournisseurs: type.fournisseurs.map(fournisseur => {
                                if (fournisseur.id !== fournisseurId) return fournisseur;
                                return {
                                    ...fournisseur,
                                    fichiers: fournisseur.fichiers.filter(fichier => fichier.id !== fichierId),
                                };
                            }),
                        };
                    }),
                };
            })
        );
    };



    return { paysData, setPaysData, ajouterFichier, renommerFichier, supprimerFichier };
}

/* =======================
   COMPONENTS
======================= */

function PaysNode({
    pays,
    onInject,
}: {
    pays: PaysNode;
    onInject: (fichier: FichierSource) => void;
}) {
    const [open, setOpen] = useState(true);

    return (
        <div className="border rounded-lg mb-2">
            <div
                onClick={() => setOpen(!open)}
                className="p-3 bg-muted/30 cursor-pointer flex justify-between"
            >
                <span>{open ? '▼' : '▶'} {pays.pays}</span>
                <span className="text-xs">{pays.types.length} types</span>
            </div>

            {open &&
                pays.types.map(type => (
                    <TypeClientNode key={type.id} type={type} onInject={onInject} />
                ))}
        </div>
    );
}

/* 🔥 renamed from TypeNode → TypeClientNode */
function TypeClientNode({
    type,
    onInject,
}: {
    type: TypeNode;
    onInject: (fichier: FichierSource) => void;
}) {
    const [open, setOpen] = useState(true);

    return (
        <div className="pl-6 border-t">
            <div onClick={() => setOpen(!open)} className="p-2 cursor-pointer">
                <span>{open ? '▼' : '▶'} {type.type}</span>
            </div>

            {open &&
                type.fournisseurs.map(f => (
                    <FournisseurNode key={f.id} fournisseur={f} onInject={onInject} />
                ))}
        </div>
    );
}

function FournisseurNode({
    fournisseur,
    onInject,
}: {
    fournisseur: Fournisseur;
    onInject: (fichier: FichierSource) => void;
}) {
    const [open, setOpen] = useState(true);
    const originalFiles = fournisseur.fichiers.filter(fichier => fichier.statut === 'original');

    return (
        <div className="pl-6">
            <div
                onClick={() => setOpen(!open)}
                className="p-2 cursor-pointer flex justify-between"
            >
                <span>{open ? '▼' : '▶'} {fournisseur.nom}</span>
                <span className="text-xs">{originalFiles.length} fichiers</span>
            </div>

            {open &&
                originalFiles.map(f => (
                    <div
                        key={f.id}
                        className="pl-6 py-2 border-t flex justify-between items-center"
                    >
                        <div>
                            <div className="font-mono">{f.nom}</div>
                            <div className="text-xs text-muted-foreground">
                                {f.contacts} contacts · {f.taille} · {f.dateUpload}
                            </div>
                        </div>

                        <button
                            onClick={() => onInject(f)}
                            className="btn btn-primary"
                        >
                            Injecter
                        </button>
                    </div>
                ))}
        </div>
    );
}

/* =======================
MAIN COMPONENT
======================= */

export default function ImportFile() {
    const { paysData, renommerFichier, supprimerFichier } = useImportFileData();

    const [injectingFile, setInjectingFile] =
        useState<FichierSource | null>(null);

    return (
        <Layout>
            <div>
                <h1>Page d'import de fichiers</h1>
                <span className="text-muted-foreground">{getBreadcrumbText()}</span>
                {paysData.map(pays => (
                    <PaysNode
                        key={pays.id}
                        pays={pays}
                        onInject={(file) => setInjectingFile(file)}
                    />
                ))}

                {injectingFile && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-white p-4 rounded">
                            <h2>Injecter {injectingFile.nom}</h2>
                            <button onClick={() => setInjectingFile(null)}>
                                Fermer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}