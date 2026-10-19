import AgendaCalendarPage from './AgendaCalendarPage';

export default function AgendaClient() {
  return (
    <AgendaCalendarPage
      title="Agenda Client 1"
      icon="✅"
      fetchEndpoint="confirmation-client/agenda"
      updateEndpoint="confirmation-client/rdv"
      agendaType="CLIENT1"
    />
  );
}
