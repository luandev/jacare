import { useEffect, useCallback, useRef } from "react";

export type GamepadButton = 
  | "A" | "B" | "X" | "Y"
  | "LB" | "RB" | "LT" | "RT"
  | "SELECT" | "START"
  | "L3" | "R3"
  | "UP" | "DOWN" | "LEFT" | "RIGHT";

export type ButtonMapping = {
  [key in GamepadButton]?: () => void;
};

export interface GamepadNavigationOptions {
  enabled?: boolean;
  deadzone?: number;
  buttonMapping?: ButtonMapping;
  onConnect?: (gamepad: Gamepad) => void;
  onDisconnect?: (gamepad: Gamepad) => void;
}

// Standard gamepad button indices (Xbox/PlayStation layout)
const BUTTON_INDICES: Record<GamepadButton, number> = {
  A: 0,         // Cross on PlayStation
  B: 1,         // Circle on PlayStation
  X: 2,         // Square on PlayStation
  Y: 3,         // Triangle on PlayStation
  LB: 4,        // L1 on PlayStation
  RB: 5,        // R1 on PlayStation
  LT: 6,        // L2 on PlayStation
  RT: 7,        // R2 on PlayStation
  SELECT: 8,    // Share on PlayStation
  START: 9,     // Options on PlayStation
  L3: 10,       // Left stick button
  R3: 11,       // Right stick button
  UP: 12,       // D-pad up
  DOWN: 13,     // D-pad down
  LEFT: 14,     // D-pad left
  RIGHT: 15     // D-pad right
};

/**
 * Custom hook for gamepad/controller navigation
 * Supports Xbox and PlayStation controllers via Gamepad API
 */
export function useGamepadNavigation(options: GamepadNavigationOptions = {}) {
  const {
    enabled = true,
    buttonMapping = {},
    onConnect,
    onDisconnect
  } = options;

  const frameRef = useRef<number>();
  const lastButtonStatesRef = useRef<Map<number, boolean[]>>(new Map());
  const connectedGamepadsRef = useRef<Set<number>>(new Set());
  const pollFunctionRef = useRef<() => void>();

  // Get connected gamepads
  const getGamepads = useCallback((): Gamepad[] => {
    const gamepads = navigator.getGamepads?.() || [];
    return Array.from(gamepads).filter((gp): gp is Gamepad => gp !== null);
  }, []);

  // Check if button was just pressed (rising edge)
  const wasButtonJustPressed = useCallback((gamepadIndex: number, buttonIndex: number, pressed: boolean): boolean => {
    const _lastStates = lastButtonStatesRef.current.get(gamepadIndex) || [];
    const wasPressed = _lastStates[buttonIndex] || false;
    return pressed && !wasPressed;
  }, []);

  // Handle gamepad connection
  const handleGamepadConnected = useCallback((e: GamepadEvent) => {
    console.log(`[Gamepad] Connected: ${e.gamepad.id} (index: ${e.gamepad.index})`);
    connectedGamepadsRef.current.add(e.gamepad.index);
    onConnect?.(e.gamepad);
  }, [onConnect]);

  // Handle gamepad disconnection
  const handleGamepadDisconnected = useCallback((e: GamepadEvent) => {
    console.log(`[Gamepad] Disconnected: ${e.gamepad.id} (index: ${e.gamepad.index})`);
    connectedGamepadsRef.current.delete(e.gamepad.index);
    lastButtonStatesRef.current.delete(e.gamepad.index);
    onDisconnect?.(e.gamepad);
  }, [onDisconnect]);

  // Poll gamepad state
  useEffect(() => {
    const pollGamepads = () => {
      if (!enabled) return;

      const gamepads = getGamepads();

      for (const gamepad of gamepads) {
        const currentStates: boolean[] = [];

        // Check each button
        for (const [buttonName, handler] of Object.entries(buttonMapping)) {
          const buttonIndex = BUTTON_INDICES[buttonName as GamepadButton];
          if (buttonIndex === undefined) continue;

          const button = gamepad.buttons[buttonIndex];
          const pressed = button?.pressed || false;
          currentStates[buttonIndex] = pressed;

          // Trigger on button press (rising edge)
          if (wasButtonJustPressed(gamepad.index, buttonIndex, pressed)) {
            handler?.();
          }
        }

        // Save current button states for next frame
        lastButtonStatesRef.current.set(gamepad.index, currentStates);
      }

      frameRef.current = requestAnimationFrame(pollGamepads);
    };

    pollFunctionRef.current = pollGamepads;
  }, [enabled, buttonMapping, getGamepads, wasButtonJustPressed]);

  useEffect(() => {
    if (!enabled) return;

    // Add event listeners
    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    // Start polling
    if (pollFunctionRef.current) {
      pollFunctionRef.current();
    }

    return () => {
      // Clean up
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
      
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
      
      // Clear refs
      lastButtonStatesRef.current.clear();
      connectedGamepadsRef.current.clear();
    };
  }, [enabled, handleGamepadConnected, handleGamepadDisconnected]);

  return {
    getGamepads,
    getConnectedGamepads: () => Array.from(connectedGamepadsRef.current)
  };
}

/**
 * Get haptic feedback support for a gamepad
 */
export function supportsHaptics(gamepad: Gamepad): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (gamepad as any).vibrationActuator !== undefined;
}

/**
 * Trigger haptic feedback on a gamepad
 */
export async function triggerHapticFeedback(
  gamepad: Gamepad,
  options: {
    duration?: number;
    weakMagnitude?: number;
    strongMagnitude?: number;
  } = {}
): Promise<void> {
  const {
    duration = 100,
    weakMagnitude = 0.5,
    strongMagnitude = 0.5
  } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actuator = (gamepad as any).vibrationActuator;
  
  if (actuator && typeof actuator.playEffect === "function") {
    try {
      await actuator.playEffect("dual-rumble", {
        duration,
        weakMagnitude,
        strongMagnitude
      });
    } catch (error) {
      console.warn("[Gamepad] Haptic feedback failed:", error);
    }
  }
}
