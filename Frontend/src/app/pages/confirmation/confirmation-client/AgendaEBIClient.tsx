import AgendaCalendarPage from './AgendaCalendarPage';

export default function AgendaEBIClient() {
  return (
    <AgendaCalendarPage
      title="Agenda EBI"
      icon="🏢"
      fetchEndpoint="confirmation-client/agenda-ebi"
      updateEndpoint="confirmation-client/rdv"
      agendaType="EBI"
    />
  );
}
