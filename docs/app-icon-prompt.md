# FitStreak App Icon — Image Generation Prompt

## Core Concept

A minimalist app icon combining a **flame** (representing streak/consistency) with a **subtle fitness element** (representing workout), using the app's signature emerald green color palette on a dark background.

---

## Detailed Prompt

```
Minimalist app icon for "FitStreak" fitness habit tracking app.

SYMBOL: A stylized flame with 3 smooth curves rising upward, the flame shape
subtly incorporates an abstract running figure or upward arrow suggesting
forward momentum and progress. The flame is geometric and modern, not
cartoonish — clean vector-style with soft rounded edges.

COLOR PALETTE:
- Primary: Vibrant emerald green gradient (#34d399 to #10b981)
- Accent: Subtle lighter green highlight on flame edge for depth (#6ee7b7)
- Background: Deep slate navy (#020617) or transparent for adaptability

STYLE:
- Flat design with subtle gradient for dimension
- No outlines or strokes — solid filled shapes only
- Centered composition with generous padding (safe area for maskable icons)
- Single focal point — the flame symbol only, no text
- Soft inner glow or ambient light effect around the flame suggesting energy

MOOD: Energetic, motivating, consistent, modern, premium fitness app aesthetic

TECHNICAL REQUIREMENTS:
- Square 1:1 aspect ratio
- Works at 1024x1024px master size
- Recognizable at 48x48px (small app grid)
- iOS/Android maskable icon safe zones respected (centered, 80% of canvas)
- No fine details that disappear at small sizes

AVOID:
- Text or letterforms
- Complex gradients or patterns
- Realistic fire textures
- Multiple colors beyond the green spectrum
- Sharp corners or aggressive angles
- Generic fitness symbols (dumbbells, hearts)
```

---

## Visual Reference Summary

| Element | Description |
|---------|-------------|
| **Shape** | Stylized 3-curve flame, geometric, smooth |
| **Hidden meaning** | Flame + upward motion = streak + progress |
| **Primary color** | Emerald green `#34d399` |
| **Background** | Dark slate `#020617` |
| **Style** | Flat with subtle gradient, no stroke |
| **Personality** | Modern, energetic, premium, minimal |

---

## Design Rationale

1. **Flame = Streak**: The 🔥 emoji is already used throughout the app for active streaks
2. **Emerald green**: Matches the app's theme color (`#34d399`) and creates instant brand recognition
3. **Upward motion**: Suggests progress, improvement, consistency
4. **Simplicity**: Single shape reads clearly at all sizes
5. **Dark-mode native**: Designed for the app's dark UI aesthetic

---

## Color Codes

| Name | Hex | Usage |
|------|-----|-------|
| Emerald 400 | `#34d399` | Primary flame color |
| Emerald 500 | `#10b981` | Gradient end |
| Emerald 300 | `#6ee7b7` | Highlight accent |
| Slate 950 | `#020617` | Background |

---

## Platform Specifications

### iOS / iPadOS
- Create 1024×1024 layered master icon
- System auto-generates all runtime sizes
- Supports Liquid Glass effect (iOS 26+)

### Android / Google Play
- 512×512px full-bleed PNG
- No shadows or rounded corners (added dynamically)
- Foreground layer for adaptive icons

### PWA
- 192×192px and 512×512px PNG
- Maskable icon support (safe zone: 80% centered)

---

## Alternative Concepts

### Option B: Abstract Checkmark Flame
Flame shape where the top curve forms a subtle checkmark, representing completion + streak.

### Option C: Stacked Bars
Three ascending bars forming a flame silhouette, representing progress/growth + fire.

### Option D: Lightning Bolt
Stylized bolt (⚡) in emerald green — represents energy, quick workouts, nano workouts feature.
