import React, { useEffect, useState } from 'react';
import { agentService, type Contact } from '../../../services/agentService';
import { Search, Building2, Phone, Mail, MapPin, User } from 'lucide-react';

export default function ConfContactsListPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const data = await agentService.getAllContacts();
        setContacts(data);
      } catch (error) {
        console.error('Erreur chargement contacts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const filteredContacts = contacts.filter(contact => {
    const search = searchTerm.toLowerCase();
    return (
      contact.source?.toLowerCase().includes(search) ||
      `${contact.prenom ?? ''} ${contact.nom ?? ''}`.toLowerCase().includes(search) ||
      contact.telephone?.includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.adresse?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Mes Contacts</h2>
        <p className="text-muted-foreground mt-1">Contacts créés via la fiche contact.</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="bg-primary/10 rounded-lg px-4 py-2">
          <span className="text-primary font-medium">Total : {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher par nom, société, téléphone…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Table */}
      {filteredContacts.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-lg border border-border">
          <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun contact trouvé</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Société</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Contact</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Téléphone</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Email</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Ville</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => (
                  <tr key={contact.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium">{contact.source || '—'}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium">
                      {contact.prenom} {contact.nom}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        {contact.telephone || '—'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        {contact.email || '—'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        {contact.adresse || '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
