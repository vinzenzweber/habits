# PWA Setup - Habits App

This document explains the Progressive Web App (PWA) implementation for bypassing browser autoplay restrictions.

## What Was Implemented

### 1. **PWA Manifest** (`/public/manifest.json`)
- App name, description, and theme colors
- Standalone display mode for app-like experience
- Portrait orientation optimized for mobile workouts
- App icons (192x192 and 512x512)

### 2. **App Icons**
- `/public/icon.svg` - Source SVG icon
- `/public/icon-192.png` - Small icon for home screen
- `/public/icon-512.png` - Large icon for splash screen

To customize: Replace these files with your own branding.

### 3. **PWA Detection Utilities** (`/src/lib/pwa.ts`)

#### `useIsPWA()` Hook
Detects if the app is running as an installed PWA.

#### `useCanInstallPWA()` Hook
Provides install prompt functionality for browsers that support it.

#### `useAutoplayCapability()` Hook
Detects platform-specific autoplay capabilities:
- **Android PWA**: ✅ Unmuted autoplay works
- **Desktop PWA**: ✅ Unmuted autoplay works (with Media Engagement)
- **iOS PWA**: ❌ Still requires user tap for sound (Apple restriction)
- **Browser**: ❌ Requires user interaction

### 4. **Updated WorkoutPlayer** (`/src/components/WorkoutPlayer.tsx`)
- Auto-detects PWA installation status
- Automatically starts playback with sound on Android/Desktop PWAs
- Shows "Play with Sound" button as fallback (iOS, browsers)
- Platform-aware UI messages

### 5. **Install Prompt** (`/src/components/InstallPrompt.tsx`)
- Appears on home page when PWA is installable
- Dismissible banner with Install/Not Now buttons
- Automatically hidden when already installed

## How to Install the PWA

### Android (Chrome/Edge)
1. Open the app in Chrome or Edge
2. Tap the install banner or
3. Menu → "Add to Home Screen"
4. Videos will auto-play with sound when opened!

### Desktop (Chrome/Edge)
1. Open the app in Chrome or Edge
2. Click the install icon in the address bar or
3. Click the install banner
4. Launch from desktop/start menu

### iOS (Safari)
1. Open the app in Safari
2. Tap Share button
3. "Add to Home Screen"
4. Note: iOS still requires tapping "Play with Sound" button

## Autoplay Behavior

### When Installed as PWA
- **Android/Desktop**: Videos auto-start with sound and fullscreen ✅
- **iOS**: Shows play button (Apple policy, no workaround) ⚠️

### When Used in Browser
- Shows "Play with Sound" button on all platforms
- Tap required due to browser autoplay policies

## Testing

### Local Development
```bash
npm run dev
# Open http://localhost:3000
```

The install prompt will appear in supported browsers (Chrome, Edge, etc.).

### Production Testing
After deploying, test on actual devices:
- Android phone with Chrome
- Desktop Chrome/Edge
- iPhone with Safari

### Verifying Installation
Check if the app is running as PWA:
- URL bar should not be visible
- App should fill the entire screen
- Status bar color should match theme

## Deployment Notes

### Required Files in Production
Make sure your Dockerfile copies:
- ✅ `next.config.ts` (for serverActions bodySizeLimit)
- ✅ `public/manifest.json`
- ✅ `public/icon-*.png`

Already fixed in: `/Dockerfile:23`

### HTTPS Required
PWAs only work over HTTPS in production. Local development works on `localhost`.

## Troubleshooting

### Install prompt not showing?
- Check if HTTPS is enabled
- Clear browser data and reload
- Try Chrome DevTools → Application → Manifest

### Videos not auto-playing on Android PWA?
- Verify app is installed (no URL bar visible)
- Check browser console for errors
- Ensure video file is accessible

### iOS still showing play button?
- This is expected. iOS Safari blocks unmuted autoplay even in PWAs.
- No workaround exists due to Apple's WebKit policies.

## Files Modified/Created

```
✅ /public/manifest.json
✅ /public/icon.svg
✅ /public/icon-192.png
✅ /public/icon-512.png
✅ /src/app/layout.tsx (added PWA metadata)
✅ /src/lib/pwa.ts (new)
✅ /src/components/InstallPrompt.tsx (new)
✅ /src/components/WorkoutPlayer.tsx (updated)
✅ /src/app/page.tsx (added InstallPrompt)
✅ /Dockerfile (added next.config.ts copy)
```

## Benefits

1. **Better UX**: Seamless workout start on Android/Desktop
2. **App-like**: Full screen, no browser UI
3. **Offline-ready**: PWA foundation for future offline support
4. **Home screen**: One-tap access from device home screen
5. **Private use**: Perfect for personal workout tracking

---

**Recommendation**: Encourage users to install on Android for the best auto-play experience!
