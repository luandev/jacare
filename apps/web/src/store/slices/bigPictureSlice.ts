import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GamepadButtonName = 
  | "A" | "B" | "X" | "Y"
  | "LB" | "RB" | "LT" | "RT"
  | "SELECT" | "START"
  | "L3" | "R3"
  | "UP" | "DOWN" | "LEFT" | "RIGHT";

export type GamepadAction =
  | "SELECT"
  | "BACK"
  | "DETAILS"
  | "MENU"
  | "PAGE_UP"
  | "PAGE_DOWN"
  | "SCROLL_UP"
  | "SCROLL_DOWN"
  | "NAVIGATE_UP"
  | "NAVIGATE_DOWN"
  | "NAVIGATE_LEFT"
  | "NAVIGATE_RIGHT";

export type ButtonMappingConfig = Record<GamepadButtonName, GamepadAction>;

// Default button mapping (Xbox/PlayStation standard)
const DEFAULT_BUTTON_MAPPING: ButtonMappingConfig = {
  A: "SELECT",           // Confirm/Select
  B: "BACK",             // Back/Cancel
  X: "DETAILS",          // Show details
  Y: "MENU",             // Open menu
  LB: "PAGE_UP",         // Previous page
  RB: "PAGE_DOWN",       // Next page
  LT: "SCROLL_UP",       // Scroll up
  RT: "SCROLL_DOWN",     // Scroll down
  SELECT: "MENU",        // Menu
  START: "MENU",         // Menu
  L3: "SELECT",          // Confirm
  R3: "DETAILS",         // Details
  UP: "NAVIGATE_UP",     // Navigate up
  DOWN: "NAVIGATE_DOWN", // Navigate down
  LEFT: "NAVIGATE_LEFT", // Navigate left
  RIGHT: "NAVIGATE_RIGHT" // Navigate right
};

export interface BigPictureState {
  enabled: boolean;
  buttonMapping: ButtonMappingConfig;
  hapticFeedbackEnabled: boolean;
  deadzone: number;
  selectedMonitor: number;
  showOnScreenKeyboard: boolean;
  keyboardLayout: "qwerty" | "azerty" | "dvorak";
  gridSize: "small" | "medium" | "large" | "auto";
  autoHideUI: boolean;
  autoHideDelay: number; // in seconds
}

type BigPictureActions = {
  setEnabled: (enabled: boolean) => void;
  setButtonMapping: (mapping: ButtonMappingConfig) => void;
  resetButtonMapping: () => void;
  setHapticFeedbackEnabled: (enabled: boolean) => void;
  setDeadzone: (deadzone: number) => void;
  setSelectedMonitor: (monitor: number) => void;
  setShowOnScreenKeyboard: (show: boolean) => void;
  setKeyboardLayout: (layout: "qwerty" | "azerty" | "dvorak") => void;
  setGridSize: (size: "small" | "medium" | "large" | "auto") => void;
  setAutoHideUI: (autoHide: boolean) => void;
  setAutoHideDelay: (delay: number) => void;
};

export type BigPictureStore = BigPictureState & BigPictureActions;

const initialState: BigPictureState = {
  enabled: false,
  buttonMapping: DEFAULT_BUTTON_MAPPING,
  hapticFeedbackEnabled: true,
  deadzone: 0.25,
  selectedMonitor: 0,
  showOnScreenKeyboard: false,
  keyboardLayout: "qwerty",
  gridSize: "auto",
  autoHideUI: false,
  autoHideDelay: 3
};

export const useBigPictureStore = create<BigPictureStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      setEnabled: (enabled) => set({ enabled }),
      
      setButtonMapping: (mapping) => set({ buttonMapping: mapping }),
      
      resetButtonMapping: () => set({ buttonMapping: DEFAULT_BUTTON_MAPPING }),
      
      setHapticFeedbackEnabled: (enabled) => set({ hapticFeedbackEnabled: enabled }),
      
      setDeadzone: (deadzone) => set({ deadzone }),
      
      setSelectedMonitor: (monitor) => set({ selectedMonitor: monitor }),
      
      setShowOnScreenKeyboard: (show) => set({ showOnScreenKeyboard: show }),
      
      setKeyboardLayout: (layout) => set({ keyboardLayout: layout }),
      
      setGridSize: (size) => set({ gridSize: size }),
      
      setAutoHideUI: (autoHide) => set({ autoHideUI: autoHide }),
      
      setAutoHideDelay: (delay) => set({ autoHideDelay: delay })
    }),
    {
      name: "crocdesk-bigpicture-storage",
      partialize: (state) => ({
        enabled: state.enabled,
        buttonMapping: state.buttonMapping,
        hapticFeedbackEnabled: state.hapticFeedbackEnabled,
        deadzone: state.deadzone,
        selectedMonitor: state.selectedMonitor,
        keyboardLayout: state.keyboardLayout,
        gridSize: state.gridSize,
        autoHideUI: state.autoHideUI,
        autoHideDelay: state.autoHideDelay
      })
    }
  )
);
