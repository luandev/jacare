# Big Picture Mode

Big Picture Mode is a controller-friendly, full-screen interface designed for TVs and couch gaming. It provides an immersive experience for browsing and managing your ROM collection with Xbox and PlayStation controllers.

## Features

### Controller Support
- **Xbox Controllers**: Full support for Xbox 360, Xbox One, and Xbox Series X/S controllers
- **PlayStation Controllers**: Full support for DualShock 4 and DualSense controllers
- **Haptic Feedback**: Vibration feedback for button presses and navigation (when supported)
- **Button Remapping**: Customize button mappings to your preference

### Navigation
- **D-Pad/Left Stick**: Navigate through the game grid
- **A Button (✕ on PlayStation)**: Select game or confirm action
- **B Button (○ on PlayStation)**: Go back or cancel
- **X Button (□ on PlayStation)**: Open search
- **Y Button (△ on PlayStation)**: Open menu
- **LB/RB (L1/R1)**: Navigate between pages
- **START Button**: Open menu

### UI Features
- **Dynamic Grid Sizing**: Automatically adjusts grid layout based on screen resolution
- **On-Screen Keyboard**: Full keyboard for text input without needing a physical keyboard
- **Search**: Find games quickly with controller-friendly search
- **Downloads View**: Monitor active downloads with progress bars
- **Fullscreen Mode**: Automatic fullscreen for distraction-free gaming
- **Multi-Monitor Support**: Choose which monitor to display Big Picture Mode on

## Getting Started

### Accessing Big Picture Mode

1. **From Settings Page**:
   - Navigate to Settings
   - Scroll to "Big Picture Mode" section
   - Click "🎮 Launch Big Picture Mode"

2. **Direct URL**:
   - Navigate to `/big-picture` in your browser

### Controller Setup

Big Picture Mode automatically detects connected controllers. Simply:

1. Connect your Xbox or PlayStation controller to your PC
2. Launch Big Picture Mode
3. Start navigating with your controller

The controller will be detected automatically, and you'll see haptic feedback when you press buttons (if your controller supports it).

### Configuration

#### Haptic Feedback
Enable or disable controller vibration:
- Go to Settings → Big Picture Mode
- Toggle "Enable haptic feedback (controller vibration)"

#### Grid Size
Adjust the number of games displayed in the grid:
- **Auto**: Dynamic sizing based on screen resolution (recommended)
- **Small**: 3 columns
- **Medium**: 4 columns
- **Large**: 5 columns

#### Multi-Monitor Setup
If you have multiple monitors:
1. Big Picture Mode will automatically detect them
2. Go to Settings → Big Picture Mode → Monitor Selection
3. Choose your preferred monitor

## Controls Reference

### Main Screen (Browse Games)

| Action | Xbox | PlayStation | Keyboard |
|--------|------|-------------|----------|
| Navigate | D-Pad / Left Stick | D-Pad / Left Stick | Arrow Keys |
| Select Game | A | ✕ (Cross) | Enter |
| Go Back | B | ○ (Circle) | Escape |
| Search | X | □ (Square) | S |
| Menu | Y / START | △ (Triangle) / OPTIONS | M |
| Previous Page | LB | L1 | Page Up |
| Next Page | RB | R1 | Page Down |

### On-Screen Keyboard

| Action | Xbox | PlayStation | Keyboard |
|--------|------|-------------|----------|
| Navigate Keys | D-Pad / Left Stick | D-Pad / Left Stick | Arrow Keys |
| Select Key | A | ✕ (Cross) | Enter / Space |
| Close Keyboard | B | ○ (Circle) | Escape |

### Downloads View

| Action | Xbox | PlayStation | Keyboard |
|--------|------|-------------|----------|
| Navigate | D-Pad Up/Down | D-Pad Up/Down | Arrow Keys |
| Go Back | B / START | ○ (Circle) / OPTIONS | Escape |

## Menu Options

Press Y (△ on PlayStation) or START to open the menu:

- **Browse Games**: Return to main Big Picture browse view
- **Library**: View your local game library
- **Downloads**: View active downloads
- **Queue**: View job queue
- **Settings**: Access application settings
- **Exit Big Picture**: Return to standard desktop mode

## Tips & Tricks

1. **Analog Stick Sensitivity**: If navigation feels too sensitive, adjust the deadzone in settings
2. **Search Optimization**: Use the on-screen keyboard with D-Pad for precise navigation
3. **Page Navigation**: Use LB/RB (L1/R1) to quickly jump between pages
4. **Haptic Feedback**: Different intensities indicate different actions (light for navigation, medium for selection, heavy for controller connection)
5. **Fullscreen Toggle**: Press F11 to manually toggle fullscreen if needed

## Troubleshooting

### Controller Not Detected
1. Ensure your controller is properly connected
2. For wireless controllers, make sure they're paired
3. Try reconnecting the controller
4. Check browser console for gamepad connection messages

### Haptic Feedback Not Working
- Some controllers (especially older models) may not support vibration
- Check that haptic feedback is enabled in Settings
- Try a different USB port or wireless receiver

### Navigation Feels Unresponsive
- Adjust the deadzone setting in Big Picture Mode settings
- Try using D-Pad instead of analog stick for more precise control
- Ensure no other applications are capturing controller input

### Multi-Monitor Issues
1. Ensure you've selected the correct monitor in settings
2. Restart Big Picture Mode after changing monitor selection
3. Some browsers may not fully support multi-monitor APIs

## Performance Optimization

Big Picture Mode includes several optimizations:

- **Virtual Scrolling**: Only renders visible game cards for better performance
- **Image Lazy Loading**: Loads cover art on-demand as you scroll
- **Debounced Navigation**: Prevents input overload during rapid navigation
- **Request Animation Frame**: Uses RAF for smooth 60fps controller polling

## Accessibility

While Big Picture Mode is designed for controllers, it remains fully accessible:

- **Keyboard Support**: All controller actions have keyboard equivalents
- **Focus Indicators**: Clear visual feedback shows currently selected items
- **High Contrast**: Works well with both light and dark themes
- **Screen Reader Friendly**: Semantic HTML structure for screen reader compatibility

## Browser Support

Big Picture Mode uses modern web APIs:

- **Gamepad API**: For controller support (Chrome 21+, Firefox 29+, Safari 10.1+)
- **Fullscreen API**: For immersive experience (All modern browsers)
- **Vibration Actuator API**: For haptic feedback (Chrome 68+, experimental in others)

For the best experience, we recommend:
- **Chrome/Edge**: Full support for all features including haptic feedback
- **Firefox**: Full support except vibration may be limited
- **Safari**: Basic controller support, limited haptic feedback

## Future Enhancements

Planned improvements for Big Picture Mode:

- [ ] Analog stick scrolling support
- [ ] Advanced button remapping UI
- [ ] Voice control integration
- [ ] Achievement notifications
- [ ] Friend presence indicators
- [ ] Cloud save status
- [ ] Quick launch from Big Picture Mode

## Contributing

Found a bug or have a feature request? Please open an issue on GitHub:
https://github.com/luandev/jacare/issues

When reporting controller issues, please include:
- Controller model and brand
- Connection type (USB/Bluetooth)
- Operating system
- Browser and version
