import { createSignal, onCleanup } from 'solid-js';
import {
  getWeekNavigatorLabels,
  prevWeek,
  nextWeek,
  getToday,
  getMonday,
  getSunday,
} from '../utils/dateUtils';
import Calendar from './Calendar';

interface WeekNavigatorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export default function WeekNavigator(props: WeekNavigatorProps) {
  const [open, setOpen] = createSignal(false);

  const labelText = () => {
    const info = getWeekNavigatorLabels(props.currentDate);
    return info.label;
  };

  function goPrev() {
    const mon = getMonday(props.currentDate);
    const prev = prevWeek({ start: mon, end: getSunday(mon) });
    props.onDateChange(prev.start);
  }

  function goNext() {
    const mon = getMonday(props.currentDate);
    const next = nextWeek({ start: mon, end: getSunday(mon) });
    props.onDateChange(next.start);
  }

  function handleClick() {
    setOpen((v) => !v);
  }

  function handleSelectWeek(weekStart: Date) {
    props.onDateChange(weekStart);
    setOpen(false);
  }

  function handleClose() {
    setOpen(false);
  }

  return (
    <div class="week-navigator">
      <button class="nav-arrow-btn" title="Previous week" onClick={goPrev}>
        &#8249;
      </button>
      <div class="week-label-wrap">
        <button class="week-label-btn" onClick={handleClick}>
          <span class="week-cal-icon">&#x1F4C5; {labelText()}</span>
        </button>
        {open() && (
          <div class="date-dropdown">
            <Calendar
              selectedWeekStart={props.currentDate}
              onSelectWeek={handleSelectWeek}
              onClose={handleClose}
            />
          </div>
        )}
      </div>
      <button class="nav-arrow-btn" title="Next week" onClick={goNext}>
        &#8250;
      </button>

      {open() && <div class="dropdown-overlay" onClick={handleClose} />}
    </div>
  );
}
