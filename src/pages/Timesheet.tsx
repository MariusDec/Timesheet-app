import { createSignal } from 'solid-js';
import { getMonday, getToday } from '../utils/dateUtils';
import WeekNavigator from '../components/WeekNavigator';
import TimesheetTable from '../components/TimesheetTable';

export default function Timesheet() {
  const [currentDate, setCurrentDate] = createSignal(getMonday(getToday()));

  return (
    <div class="page timesheet-page">
      <div class="page-toolbar">
        <h1>Timesheet</h1>
        <WeekNavigator
          currentDate={currentDate()}
          onDateChange={setCurrentDate}
        />
      </div>
      <TimesheetTable weekStart={currentDate()} />
    </div>
  );
}
