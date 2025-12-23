# App Icons

This directory should contain the application icons for all platforms.

## Required Files

### Windows (`icon.ico`)
- Format: ICO
- Sizes: 16x16, 32x32, 48x48, 256x256
- Recommended: 256x256 minimum, include all sizes for best compatibility

### macOS (`icon.icns`)
- Format: ICNS
- Contains multiple sizes: 16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024
- Can be created from a 1024x1024 PNG using:
  ```bash
  # Create icon.iconset directory structure
  # Then convert to .icns:
  iconutil -c icns icon.iconset
  ```

### Linux (`icon.png`)
- Format: PNG
- Size: 512x512 pixels minimum
- Recommended: 1024x1024 for high-DPI displays

## Creating Icons

### From a single PNG (1024x1024)

**Windows (ICO):**
- Use online tools like https://convertio.co/png-ico/ or ImageMagick:
  ```bash
  convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
  ```

**macOS (ICNS):**
- Use `iconutil` (macOS only) or online converters
- Or use electron-icon-maker: `npx electron-icon-maker --input=icon.png --output=build`

**Linux (PNG):**
- Simply resize your source image to 512x512 or 1024x1024

## Placeholder Note

Until icons are added, electron-builder will use default Electron icons. The build will still succeed, but the app will not have custom branding.

## Resources

- Electron Builder icon documentation: https://www.electron.build/icons
- Icon design guidelines:
  - macOS: https://developer.apple.com/design/human-interface-guidelines/app-icons
  - Windows: https://docs.microsoft.com/en-us/windows/uwp/design/style/app-icons-and-logos
  - Linux: Follow freedesktop.org icon theme specifications

