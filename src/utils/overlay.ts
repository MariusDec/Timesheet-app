/**
 * Handlers for a modal backdrop that closes only on a real click on the
 * backdrop itself. A plain onClick also fires when a text selection started
 * inside the dialog and the mouse is released over the backdrop (the click
 * goes to the common ancestor), which would close the dialog unexpectedly.
 */
export function backdropClose(close: () => void) {
  let pressedOnBackdrop = false;
  return {
    onMouseDown: (e: MouseEvent) => {
      pressedOnBackdrop = e.target === e.currentTarget;
    },
    onClick: (e: MouseEvent) => {
      if (pressedOnBackdrop && e.target === e.currentTarget) close();
      pressedOnBackdrop = false;
    },
  };
}
