import { useEffect, useRef, useState } from "react";

export type GamepadButton = "A" | "B" | "X" | "Y" | "LB" | "RB" | "LT" | "RT" | "SELECT" | "START" | "L3" | "R3" | "DPAD_UP" | "DPAD_DOWN" | "DPAD_LEFT" | "DPAD_RIGHT";

export type GamepadState = {
  connected: boolean;
  buttons: Record<GamepadButton, boolean>;
  axes: { leftX: number; leftY: number; rightX: number; rightY: number };
};

// Constants
const AXIS_THRESHOLD = 0.5;
const NAVIGATE_COOLDOWN_MS = 200; // Cooldown between navigation events to prevent double-input

const BUTTON_MAP: Record<number, GamepadButton> = {
  0: "A",        // Cross (PS) / A (Xbox)
  1: "B",        // Circle (PS) / B (Xbox)
  2: "X",        // Square (PS) / X (Xbox)
  3: "Y",        // Triangle (PS) / Y (Xbox)
  4: "LB",       // L1 / LB
  5: "RB",       // R1 / RB
  6: "LT",       // L2 / LT
  7: "RT",       // R2 / RT
  8: "SELECT",   // Share / Select
  9: "START",    // Options / Start
  10: "L3",      // L3
  11: "R3",      // R3
  12: "DPAD_UP",
  13: "DPAD_DOWN",
  14: "DPAD_LEFT",
  15: "DPAD_RIGHT"
};

export function useGamepad() {
  const [gamepadState, setGamepadState] = useState<GamepadState>({
    connected: false,
    buttons: {} as Record<GamepadButton, boolean>,
    axes: { leftX: 0, leftY: 0, rightX: 0, rightY: 0 }
  });
  
  const animationFrameRef = useRef<number>();
  const prevButtonsRef = useRef<Record<GamepadButton, boolean>>({} as Record<GamepadButton, boolean>);

  useEffect(() => {
    let connected = false;

    const checkGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gamepad = gamepads[0]; // Use first gamepad

      if (gamepad) {
        connected = true;
        
        // Map buttons
        const buttons: Record<GamepadButton, boolean> = {} as Record<GamepadButton, boolean>;
        gamepad.buttons.forEach((button, index) => {
          const buttonName = BUTTON_MAP[index];
          if (buttonName) {
            buttons[buttonName] = button.pressed;
          }
        });

        // Map axes
        const leftX = gamepad.axes[0] || 0;
        const leftY = gamepad.axes[1] || 0;
        const rightX = gamepad.axes[2] || 0;
        const rightY = gamepad.axes[3] || 0;

        // Convert axes to digital directions
        if (Math.abs(leftX) > AXIS_THRESHOLD) {
          if (leftX < 0) buttons.DPAD_LEFT = true;
          if (leftX > 0) buttons.DPAD_RIGHT = true;
        }
        if (Math.abs(leftY) > AXIS_THRESHOLD) {
          if (leftY < 0) buttons.DPAD_UP = true;
          if (leftY > 0) buttons.DPAD_DOWN = true;
        }

        setGamepadState({
          connected: true,
          buttons,
          axes: { leftX, leftY, rightX, rightY }
        });

        prevButtonsRef.current = buttons;
      } else if (connected) {
        // Gamepad disconnected
        setGamepadState({
          connected: false,
          buttons: {} as Record<GamepadButton, boolean>,
          axes: { leftX: 0, leftY: 0, rightX: 0, rightY: 0 }
        });
        connected = false;
      }

      animationFrameRef.current = requestAnimationFrame(checkGamepad);
    };

    // Start polling
    animationFrameRef.current = requestAnimationFrame(checkGamepad);

    // Listen for gamepad connect/disconnect events
    const handleGamepadConnected = () => {
      connected = true;
    };

    const handleGamepadDisconnected = () => {
      connected = false;
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
    };
  }, []);

  return gamepadState;
}

export function useGamepadNavigation(onNavigate: (direction: "up" | "down" | "left" | "right") => void, onSelect: () => void, onBack: () => void) {
  const gamepadState = useGamepad();
  const prevButtonsRef = useRef<Record<GamepadButton, boolean>>({} as Record<GamepadButton, boolean>);
  const lastNavigateTimeRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    const { buttons } = gamepadState;

    // Check for button press (not held)
    const wasPressed = (button: GamepadButton) => {
      return buttons[button] && !prevButtonsRef.current[button];
    };

    // Navigation with cooldown
    if (now - lastNavigateTimeRef.current > NAVIGATE_COOLDOWN_MS) {
      if (buttons.DPAD_UP) {
        onNavigate("up");
        lastNavigateTimeRef.current = now;
      } else if (buttons.DPAD_DOWN) {
        onNavigate("down");
        lastNavigateTimeRef.current = now;
      } else if (buttons.DPAD_LEFT) {
        onNavigate("left");
        lastNavigateTimeRef.current = now;
      } else if (buttons.DPAD_RIGHT) {
        onNavigate("right");
        lastNavigateTimeRef.current = now;
      }
    }

    // Button presses (no cooldown)
    if (wasPressed("A")) {
      onSelect();
    }
    if (wasPressed("B")) {
      onBack();
    }

    prevButtonsRef.current = { ...buttons };
  }, [gamepadState, onNavigate, onSelect, onBack]);

  return gamepadState;
}
