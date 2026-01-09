import { useState, useRef, useEffect, useCallback } from "react";
import { useBigPictureStore } from "../store";
import "./OnScreenKeyboard.css";

export interface OnScreenKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClose?: () => void;
  placeholder?: string;
}

const QWERTY_LAYOUT = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"]
];

const SPECIAL_KEYS = {
  BACKSPACE: "⌫",
  SPACE: "Space",
  SHIFT: "⇧",
  CLEAR: "Clear",
  CLOSE: "Close",
  SUBMIT: "Submit"
};

/**
 * On-screen keyboard component for Big Picture Mode
 * Designed for controller navigation
 */
export function OnScreenKeyboard({
  value,
  onChange,
  onSubmit,
  onClose,
  placeholder = "Type here..."
}: OnScreenKeyboardProps) {
  const [shift, setShift] = useState(false);
  const [focusedRow, setFocusedRow] = useState(0);
  const [focusedCol, setFocusedCol] = useState(0);
  const keyboardRef = useRef<HTMLDivElement>(null);
  
  const keyboardLayout = useBigPictureStore((state) => state.keyboardLayout);

  // Calculate total rows including special keys row
  const totalRows = QWERTY_LAYOUT.length + 1; // +1 for special keys row

  // Get the current key at focus position - memoized to avoid recreation
  const getCurrentKey = useCallback(() => {
    if (focusedRow < QWERTY_LAYOUT.length) {
      const row = QWERTY_LAYOUT[focusedRow];
      if (focusedCol < row.length) {
        const key = row[focusedCol];
        return shift ? key.toUpperCase() : key;
      }
    } else {
      // Special keys row
      const specialKeysArray = [
        SPECIAL_KEYS.SHIFT,
        SPECIAL_KEYS.SPACE,
        SPECIAL_KEYS.BACKSPACE,
        SPECIAL_KEYS.CLEAR,
        SPECIAL_KEYS.CLOSE,
        SPECIAL_KEYS.SUBMIT
      ];
      return specialKeysArray[focusedCol] || null;
    }
    return null;
  }, [focusedRow, focusedCol, shift]);

  // Handle key press - memoized to avoid recreation
  const handleKeyPress = useCallback((key: string) => {
    if (key === SPECIAL_KEYS.BACKSPACE) {
      onChange(value.slice(0, -1));
    } else if (key === SPECIAL_KEYS.SPACE) {
      onChange(value + " ");
    } else if (key === SPECIAL_KEYS.SHIFT) {
      setShift(!shift);
    } else if (key === SPECIAL_KEYS.CLEAR) {
      onChange("");
    } else if (key === SPECIAL_KEYS.CLOSE) {
      onClose?.();
    } else if (key === SPECIAL_KEYS.SUBMIT) {
      onSubmit?.();
    } else {
      onChange(value + key);
      // Auto-disable shift after typing a letter
      if (shift) {
        setShift(false);
      }
    }
  }, [value, shift, onChange, onClose, onSubmit]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow key navigation
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedRow((r) => Math.max(0, r - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedRow((r) => Math.min(totalRows - 1, r + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedCol((c) => {
          return Math.max(0, c - 1);
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedCol((c) => {
          const currentRow = focusedRow < QWERTY_LAYOUT.length 
            ? QWERTY_LAYOUT[focusedRow].length 
            : 6; // special keys row has 6 keys
          return Math.min(currentRow - 1, c + 1);
        });
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const key = getCurrentKey();
        if (key) {
          handleKeyPress(key);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedRow, focusedCol, shift, value, totalRows, getCurrentKey, handleKeyPress, onClose]);

  // Normalize focused column when changing rows
  useEffect(() => {
    const currentRow = focusedRow < QWERTY_LAYOUT.length 
      ? QWERTY_LAYOUT[focusedRow].length 
      : 6; // special keys row
    if (focusedCol >= currentRow) {
      setFocusedCol(currentRow - 1);
    }
  }, [focusedRow, focusedCol]);

  return (
    <div className="onscreen-keyboard" ref={keyboardRef}>
      <div className="keyboard-input-wrapper">
        <div className="keyboard-input">
          {value || <span className="keyboard-placeholder">{placeholder}</span>}
          <span className="keyboard-cursor" />
        </div>
      </div>
      
      <div className="keyboard-keys">
        {QWERTY_LAYOUT.map((row, rowIndex) => (
          <div key={rowIndex} className="keyboard-row">
            {row.map((key, colIndex) => {
              const displayKey = shift ? key.toUpperCase() : key;
              const isFocused = focusedRow === rowIndex && focusedCol === colIndex;
              
              return (
                <button
                  key={colIndex}
                  className={`keyboard-key ${isFocused ? "focused" : ""}`}
                  onClick={() => handleKeyPress(displayKey)}
                  data-key={displayKey}
                >
                  {displayKey}
                </button>
              );
            })}
          </div>
        ))}
        
        {/* Special keys row */}
        <div className="keyboard-row special-keys">
          <button
            className={`keyboard-key special ${shift ? "active" : ""} ${focusedRow === QWERTY_LAYOUT.length && focusedCol === 0 ? "focused" : ""}`}
            onClick={() => handleKeyPress(SPECIAL_KEYS.SHIFT)}
          >
            {SPECIAL_KEYS.SHIFT}
          </button>
          <button
            className={`keyboard-key space ${focusedRow === QWERTY_LAYOUT.length && focusedCol === 1 ? "focused" : ""}`}
            onClick={() => handleKeyPress(SPECIAL_KEYS.SPACE)}
          >
            {SPECIAL_KEYS.SPACE}
          </button>
          <button
            className={`keyboard-key special ${focusedRow === QWERTY_LAYOUT.length && focusedCol === 2 ? "focused" : ""}`}
            onClick={() => handleKeyPress(SPECIAL_KEYS.BACKSPACE)}
          >
            {SPECIAL_KEYS.BACKSPACE}
          </button>
          <button
            className={`keyboard-key special ${focusedRow === QWERTY_LAYOUT.length && focusedCol === 3 ? "focused" : ""}`}
            onClick={() => handleKeyPress(SPECIAL_KEYS.CLEAR)}
          >
            {SPECIAL_KEYS.CLEAR}
          </button>
          <button
            className={`keyboard-key special ${focusedRow === QWERTY_LAYOUT.length && focusedCol === 4 ? "focused" : ""}`}
            onClick={() => handleKeyPress(SPECIAL_KEYS.CLOSE)}
          >
            {SPECIAL_KEYS.CLOSE}
          </button>
          {onSubmit && (
            <button
              className={`keyboard-key special submit ${focusedRow === QWERTY_LAYOUT.length && focusedCol === 5 ? "focused" : ""}`}
              onClick={() => handleKeyPress(SPECIAL_KEYS.SUBMIT)}
            >
              {SPECIAL_KEYS.SUBMIT}
            </button>
          )}
        </div>
      </div>
      
      <div className="keyboard-hints">
        <span>Use Arrow Keys or D-Pad to navigate</span>
        <span>Press A/Enter to select</span>
        <span>Press B/ESC to close</span>
      </div>
    </div>
  );
}
