import AgendaCalendarPage from './AgendaCalendarPage';

export default function AgendaRefusClient() {
  return (
    <AgendaCalendarPage
      title="Agenda Refus"
      icon="❌"
      fetchEndpoint="confirmation-client/agenda-refus"
      updateEndpoint="confirmation-client/rdv"
      agendaType="REFUS"
    />
  );
}
