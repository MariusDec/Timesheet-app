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
    // Set on focus so the mouseup/pointerup that follows a click or tap doesn't
    // collapse the select-all we just made (which made the value hard to replace).
    let keepSelection = false;

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
            keepSelection = true;
            // Touch browsers place the caret after focus; re-select once that's done.
            setTimeout(() => {
                if (document.activeElement === inputElement && keepSelection) inputElement.select();
                keepSelection = false;
            }, 0);
        }
    }

    function handlePointerUp(e: Event) {
        if (keepSelection) {
            e.preventDefault();
            keepSelection = false;
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

    // While editing, grow to fit the whole value (it can overflow into the
    // neighbouring cells); otherwise the full value is available as a tooltip.
    const editWidth = () =>
        editing() ? `calc(${Math.max(displayValue().length, 8)}ch + 24px)` : undefined;

    return (
        <div class="time-input-wrap">
        <input
            class="time-input"
            classList={{ 'time-input-editing': editing() }}
            style={{ 'min-width': editWidth() }}
            title={displayValue() || undefined}
            value={displayValue()}
            onMouseUp={handlePointerUp}
            onInput={handleInput}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="—"
            autocomplete="off"
        />
        </div>
    );
}
