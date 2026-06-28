import { createSignal, createEffect } from 'solid-js';
import { parseTime } from '../utils/timeParser';
import { formatTime } from '../utils/timeFormatter';

interface TimeInputProps {
    seconds: number;
    onSecondsChange: (seconds: number) => void;
}

export default function TimeInput(props: TimeInputProps) {
    const [displayValue, setDisplayValue] = createSignal('');
    const [editing, setEditing] = createSignal(false);
    let saveOnBlur = true;

    createEffect(() => {
        if (!editing()) {
            setDisplayValue(props.seconds > 0 ? formatTime(props.seconds) : '');
        }
    });

    function commitValue(rawValue?: string) {
        const raw = (rawValue ?? displayValue()).trim();
        if (!raw) {
            props.onSecondsChange(0);
            setDisplayValue('');
            return;
        }

        const seconds = parseTime(raw);
        if (seconds !== null) {
            props.onSecondsChange(seconds);
            setDisplayValue(formatTime(seconds));
        } else {
            props.onSecondsChange(0);
            setDisplayValue('');
        }
    }

    function handleBlur() {
        const raw = displayValue();
        setEditing(false);
        if (!saveOnBlur) {
            saveOnBlur = true;
            return;
        }
        commitValue(raw);
    }

    function handleInput(e: Event) {
        setDisplayValue((e.target as HTMLInputElement).value);
    }

    function handleFocus(e: Event) {
        setEditing(true);
        const inputElement = e.target as HTMLInputElement;
        if (inputElement) {
            inputElement.select();
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        const input = e.target as HTMLInputElement;
        if (e.key === 'Enter') {
            e.preventDefault();
            const raw = displayValue();
            setEditing(false);
            commitValue(raw);
            saveOnBlur = false;
            input.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditing(false);
            setDisplayValue(props.seconds > 0 ? formatTime(props.seconds) : '');
            input.blur();
        }
    }

    return (
        <input
            class="time-input"
            value={displayValue()}
            onInput={handleInput}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="—"
            autocomplete="off"
        />
    );
}
