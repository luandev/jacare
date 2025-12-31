# EmulatorJS Integration - Experimental

This document describes the experimental EmulatorJS integration for Jacare's Big Picture Mode.

## Overview

EmulatorJS is a web-based emulator wrapper that allows playing classic console games directly in the browser. This integration is **experimental** and requires additional setup.

## Features

- **In-Browser Emulation**: Play games without external emulators
- **Multi-Platform**: Supports NES, SNES, GB/GBC/GBA, N64, PS1, PSP, DS, Arcade, and Sega systems
- **Controller Support**: Works with gamepads via the existing gamepad integration
- **Big Picture Integration**: Seamlessly launches from the library view

## Installation

### 1. Install EmulatorJS

```bash
# Option 1: Via npm (if you want to bundle it)
npm install emulatorjs

# Option 2: Download from GitHub
# Download from https://github.com/EmulatorJS/EmulatorJS/releases
```

### 2. Set Up EmulatorJS Files

EmulatorJS requires specific files to be served from your web server:

```
public/
  emulatorjs/
    data/           # Core emulator files
      nes.data
      snes.data
      gba.data
      n64.data
      psx.data
      ... (other cores)
    loader.js       # Main EmulatorJS loader
```

### 3. Add EmulatorJS Script to Your HTML

Add this to your `index.html` (or load it dynamically):

```html
<script src="/emulatorjs/loader.js"></script>
```

### 4. Configure ROM Serving

Ensure your server can serve ROM files from a configured path. By default, the integration expects ROMs to be accessible via:

```
/library-files/{rom-path}
```

You may need to configure your server to serve files from the library directory.

## Usage

### From Big Picture Mode

1. Navigate to the Library section
2. Select a game that has a supported platform
3. Press Enter or A button to launch
4. The emulator will load automatically if EmulatorJS is installed

### Supported Platforms

| Platform | Core | BIOS Required |
|----------|------|---------------|
| NES | nes | No |
| SNES | snes | No |
| Game Boy | gb | No |
| Game Boy Color | gbc | No |
| Game Boy Advance | gba | No |
| N64 | n64 | No |
| PlayStation 1 | psx | Yes |
| PSP | psp | Yes |
| Nintendo DS | nds | No |
| Genesis/Mega Drive | segaMD | No |
| Master System | segaMS | No |
| Game Gear | segaGG | No |
| Arcade (MAME) | mame | No |

### BIOS Files

Some systems (PS1, PSP) require BIOS files. Place these in:

```
public/emulatorjs/data/bios/
```

Required BIOS files:
- **PS1**: `scph1001.bin`, `scph5500.bin`, `scph5501.bin`
- **PSP**: `ppsspp/` directory with PSP firmware files

## Configuration

### Custom Paths

If you need to customize paths, modify the `EmulatorPlayer` component:

```typescript
// In EmulatorPlayer.tsx
(window as any).EJS_pathtodata = "/your-custom-path/data/";
```

### Save States

To enable save state persistence, provide a save state URL:

```typescript
const config: EmulatorConfig = {
  core: "nes",
  romUrl: "/path/to/rom.nes",
  saveStateUrl: "/api/save-states/game-id", // Your API endpoint
  // ...
};
```

## Controls

### Keyboard

Default EmulatorJS keyboard controls:
- **Arrow Keys**: D-Pad
- **Z / X**: A / B buttons
- **A / S**: X / Y buttons (SNES)
- **Enter**: Start
- **Shift**: Select
- **ESC**: Exit emulator

### Gamepad

Controllers are automatically detected and mapped by EmulatorJS.

## Troubleshooting

### "EmulatorJS library not found"

**Cause**: EmulatorJS script not loaded or path incorrect

**Solution**:
1. Verify EmulatorJS files are in `public/emulatorjs/`
2. Check that `loader.js` is loaded in your HTML
3. Open browser console to see any loading errors

### "Failed to load ROM"

**Cause**: ROM file not accessible or CORS issues

**Solution**:
1. Verify ROM file path is correct
2. Check server is serving files from library directory
3. Ensure CORS headers allow file access
4. Check browser console for 404 or CORS errors

### Black Screen / No Video

**Cause**: Missing core files or unsupported ROM format

**Solution**:
1. Verify correct core files are in `data/` directory
2. Check ROM file is not corrupted
3. Ensure ROM format matches the core (e.g., .nes for NES)

### Performance Issues

**Cause**: Heavy cores (N64, PSP) require significant CPU

**Solution**:
1. Use a modern browser with good performance
2. Close other browser tabs
3. Try lighter cores (NES, SNES, GBA) first
4. Consider native emulators for heavy systems

## Limitations

- **Performance**: Web-based emulation is slower than native emulators
- **Compatibility**: Not all games work perfectly
- **Heavy Systems**: N64, PS1, PSP may struggle on slower machines
- **Mobile**: Limited support on mobile browsers
- **Save States**: Require server-side storage implementation

## Security Considerations

⚠️ **Important**: 
- Do not serve copyrighted ROMs
- Ensure users only play games they legally own
- Consider adding authentication/authorization for ROM access
- Be aware of copyright laws in your jurisdiction

## Development

### Adding Support for New Cores

1. Download the core data files from EmulatorJS repo
2. Add core to `CORE_MAP` in `EmulatorPlayer.tsx`:

```typescript
const CORE_MAP: Record<string, string> = {
  // ... existing cores
  "new-platform": "new-core-name"
};
```

3. Test with sample ROM

### Custom UI

The EmulatorPlayer component can be customized:
- Modify `emulator.css` for styling
- Add custom controls in `EmulatorPlayer.tsx`
- Integrate with your settings/save system

## Resources

- **EmulatorJS GitHub**: https://github.com/EmulatorJS/EmulatorJS
- **EmulatorJS Demo**: https://emulatorjs.org/
- **Documentation**: https://github.com/EmulatorJS/EmulatorJS/wiki
- **Supported Cores**: https://github.com/EmulatorJS/EmulatorJS#supported-systems

## Contributing

To improve the EmulatorJS integration:

1. Test with various ROM formats and platforms
2. Improve error handling and user feedback
3. Add save state management
4. Optimize loading and performance
5. Add more customization options

## License

EmulatorJS is licensed under GPL-3.0. Ensure compliance when using this integration.

Jacare's EmulatorJS integration code is part of Jacare and follows its MIT license.
