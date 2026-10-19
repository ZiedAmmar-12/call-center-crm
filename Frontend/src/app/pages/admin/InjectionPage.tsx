import { useState } from "react";
import { Layout } from '../../components/Layout';
import { TabSource } from './leads/TabSource';
import { InjectionTab } from './leads/InjectionTab';
import { RecycleTab } from './leads/RecycleTab';
const TABS = ["Fichiers sources", "Injections", "Recyclage"] as const;
type TabLabel = typeof TABS[number];



export default function InjectionPage() {
    const [activeTab, setActiveTab] = useState<TabLabel>("Fichiers sources");

    return (
        <Layout>
            <div className="mx-auto max-w-8xl p-8">
                <div className="mb-1 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-800">Gestion fichiers</h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">{activeTab}</p>
                </div>

                <div className="mt-4 mb-5 flex border-b border-border">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`mr-1 border-b-2 px-4 py-2.5 text-sm transition-colors ${
                                activeTab === tab
                                    ? "border-primary font-medium text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'Fichiers sources' && <TabSource />}
                {activeTab === 'Injections' && <InjectionTab onRecycled={() => setActiveTab('Recyclage')} />}
                {activeTab === 'Recyclage' && <RecycleTab />}
            </div>
        </Layout>
    );
}
