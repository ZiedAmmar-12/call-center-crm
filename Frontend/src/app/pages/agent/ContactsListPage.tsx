import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { agentService, type Contact } from '../../../services/agentService';
import { useAuth } from '../../../contexts/AuthContext';
import { Phone, Search, Building2, User, MapPin, Mail } from 'lucide-react';

export default function ContactsListPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        // The "a-appeler" endpoint is scoped to a single agent's call queue
        // (filters Contacts by AgentId). Admin/SuperAdmin need the full list,
        // not one agent's queue — use the unscoped endpoint for those roles.
        const isAgentRole = user?.role === 'agent';
        const data = isAgentRole
          ? await agentService.getContactsAApeler(user?.id || 1)
          : await agentService.getAllContacts();
        console.log('Contacts chargés:', data);
        setContacts(data);
      } catch (error) {
        console.error('Erreur chargement contacts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, [user]);

  const filteredContacts = contacts.filter(contact => {
    const search = searchTerm.toLowerCase();
    return (
      contact.source?.toLowerCase().includes(search) ||
      `${contact.prenom} ${contact.nom}`.toLowerCase().includes(search) ||
      contact.telephone?.includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.adresse?.toLowerCase().includes(search)
    );
  });

  const handleAppeler = (contactId: number) => {
    window.location.href = `/agent/contact?id=${contactId}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Liste des Contacts</h2>
          <p className="text-muted-foreground mt-1">Accédez rapidement à tous vos contacts et appelez en un clic.</p>
        </div>

        {/* Total contacts */}
        <div className="flex items-center justify-between">
          <div className="bg-primary/10 rounded-lg px-4 py-2">
            <span className="text-primary font-medium">Total contacts: {filteredContacts.length}</span>
          </div>
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un contact, société ou ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Tableau des contacts */}
        {filteredContacts.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">Aucun contact trouvé</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Société</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Contact</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Téléphone</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Email</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Ville</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span className="font-medium text-foreground">{contact.source}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <span className="font-medium text-foreground">{contact.prenom} {contact.nom}</span>
                          <div className="text-sm text-muted-foreground mt-0.5">Directeur Commercial</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{contact.telephone}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{contact.email || '-'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{contact.adresse || '-'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleAppeler(contact.id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          Appeler
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}