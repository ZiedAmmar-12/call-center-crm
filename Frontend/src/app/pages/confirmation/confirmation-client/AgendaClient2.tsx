import AgendaCalendarPage from './AgendaCalendarPage';

export default function AgendaClientDeux() {
  return (
    <AgendaCalendarPage
      title="Agenda Client 2"
      icon="👥"
      fetchEndpoint="confirmation-client/agenda-client2"
      updateEndpoint="confirmation-client/rdv"
      agendaType="CLIENT2"
    />
  );
}
