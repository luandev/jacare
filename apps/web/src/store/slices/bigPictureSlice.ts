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
  availableMonitors: number; // Number of detected monitors
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
  setAvailableMonitors: (count: number) => void;
  detectMonitors: () => Promise<void>;
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
  autoHideDelay: 3,
  availableMonitors: 1
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
      
      setAutoHideDelay: (delay) => set({ autoHideDelay: delay }),
      
      setAvailableMonitors: (count) => set({ availableMonitors: count }),
      
      detectMonitors: async () => {
        // Use Screen Orientation API if available
        if (window.screen && 'isExtended' in window.screen) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isExtended = await (window.screen as any).isExtended?.();
            if (isExtended) {
              // Multi-monitor setup detected
              // We can't get exact count, but we know there's more than one
              set({ availableMonitors: 2 });
            } else {
              set({ availableMonitors: 1 });
            }
          } catch {
            // If the API call fails, assume single monitor
            set({ availableMonitors: 1 });
          }
        } else {
          // Fallback: assume single monitor
          set({ availableMonitors: 1 });
        }
      }
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
