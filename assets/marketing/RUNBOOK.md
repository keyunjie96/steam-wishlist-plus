# Marketing Assets Runbook

This document explains how to regenerate all marketing assets for the Chrome Web Store listing.

## Prerequisites

1. **Local HTTP server** running on port 8765:
   ```bash
   cd /path/to/cross-platform-steam-wishlist
   npx http-server -p 8765 -c-1 &
   ```

2. **Python 3 with Pillow** for PNG icon generation:
   ```bash
   pip3 install Pillow
   ```

3. **Playwright MCP** or browser automation tool for capturing screenshots

## Asset Structure

```
assets/
├── icons/
│   ├── icon.png              # Master icon (1024x1024 source)
│   ├── icon-cropped.png      # Auto-cropped for better fill
│   ├── icon16.png            # Generated (toolbar)
│   ├── icon48.png            # Generated (extensions page)
│   ├── icon128.png           # Generated (store, options, promo)
│   ├── ns.svg                # Platform icons (source)
│   ├── ps.svg
│   ├── xbox.svg
│   └── sd.svg
└── marketing/
    ├── RUNBOOK.md                # This file
    ├── screenshot-1.png          # Cropped wishlist screenshot (generated)
    ├── promo-tile-440x280.html   # Small tile template
    ├── promo-tile-440x280.png    # Generated
    ├── promo-tile-920x680.html   # Large tile v1 (split layout)
    ├── promo-tile-920x680.png    # Generated
    ├── promo-tile-920x680-v2.html # Large tile v2 (screenshot with bottom bar)
    ├── promo-tile-920x680-v2.png  # Generated
    ├── promo-tile-920x680-v3.html # Large tile v3 (centered branding)
    ├── promo-tile-920x680-v3.png  # Generated
    └── chrome-web-store-badge.png # Official badge (optional)
```

## Regeneration Steps

### 0. Capture Wishlist Screenshot (Using Playwright MCP)

The promo tiles use a real screenshot from Steam wishlist. To recapture:

1. **Load the extension** in a Chromium browser with the extension installed

2. **Navigate to the wishlist**:
   ```
   browser_navigate: https://store.steampowered.com/wishlist/id/YOUR_STEAM_ID/
   ```

3. **Wait for extension icons to load** (3-5 seconds):
   ```
   browser_wait_for: time=5
   ```

4. **Resize viewport to capture more items**:
   ```
   browser_resize: width=900, height=1200
   ```

5. **Scroll to trigger lazy loading, then back to top**:
   ```javascript
   // browser_evaluate
   window.scrollTo(0, 2000);
   setTimeout(() => window.scrollTo(0, 0), 1000);
   ```

6. **Take a viewport screenshot**:
   ```
   browser_take_screenshot: filename=wishlist-tall.png
   ```

7. **Crop to show only wishlist items** (removes header/nav):
   ```bash
   python3 -c "
   from PIL import Image
   img = Image.open('.playwright-mcp/wishlist-tall.png')
   # Crop: start at y=260 (below header), show ~5 items
   cropped = img.crop((0, 260, 900, 1110))
   cropped.save('assets/marketing/screenshot-1.png')
   "
   ```

**Note**: Adjust crop coordinates if Steam's UI layout changes.

### 1. Extension Icons (16/48/128 PNG)

If you update `icon.png`, the regeneration script handles cropping and resizing automatically:

```bash
./scripts/regen-marketing.sh
```

Or manually with Python/Pillow:

```bash
cd assets/icons
python3 << 'EOF'
from PIL import Image

# Open and crop to content
img = Image.open("icon.png").convert('RGBA')
bbox = img.getbbox()
if bbox:
    padding = int(max(bbox[2]-bbox[0], bbox[3]-bbox[1]) * 0.02)
    cropped = img.crop((max(0,bbox[0]-padding), max(0,bbox[1]-padding),
                        min(img.width,bbox[2]+padding), min(img.height,bbox[3]+padding)))
    size = max(cropped.size)
    square = Image.new('RGBA', (size, size), (0,0,0,0))
    square.paste(cropped, ((size-cropped.width)//2, (size-cropped.height)//2))
else:
    square = img

square.save('icon-cropped.png')
for s in [128, 48, 16]:
    square.resize((s, s), Image.LANCZOS).save(f'icon{s}.png')
EOF
```

### 2. Promotional Tiles

Tiles are HTML templates rendered via Playwright MCP.

**Using Playwright MCP:**
```
1. browser_resize: width=920, height=680 (or 440x280 for small)
2. browser_navigate: http://localhost:8765/assets/marketing/promo-tile-920x680.html
3. browser_take_screenshot: filename=promo-tile-920x680.png
4. Copy from .playwright-mcp/ to assets/marketing/
```

#### Small Tile (440x280) - REQUIRED
- **Template**: `promo-tile-440x280.html`
- **Viewport**: 440x280
- **Design**: Extension icon, white platform icons, minimal tagline

#### Large Tile v1 (920x680) - Split Layout
- **Template**: `promo-tile-920x680.html`
- **Design**: Branding left (40%), screenshot right (60%)

#### Large Tile v2 (920x680) - Screenshot Dominant
- **Template**: `promo-tile-920x680-v2.html`
- **Design**: Full screenshot background with bottom bar overlay

#### Large Tile v3 (920x680) - Centered Branding
- **Template**: `promo-tile-920x680-v3.html`
- **Design**: Dimmed screenshot background, centered icon + tagline

### 3. Options Page Screenshot

```bash
playwright screenshot --viewport-size=640,1200 --full-page \
  http://localhost:8765/src/options.html \
  assets/marketing/options-page-full.png
```

### 4. All-in-One Regeneration Script

Run the existing script:

```bash
./scripts/regen-marketing.sh
```

This script:
1. Crops `icon.png` to remove padding (saves as `icon-cropped.png`)
2. Generates `icon16.png`, `icon48.png`, `icon128.png` using Pillow
3. Starts HTTP server on port 8765
4. Captures all promo tile screenshots via Playwright
5. Captures options page screenshot

See `scripts/regen-marketing.sh` header comments for detailed icon update instructions.

## Customization Guide

### Changing Colors

All marketing templates use CSS variables. Key colors:

| Variable | Value | Usage |
|----------|-------|-------|
| `--nintendo` | `#e60012` | Nintendo Switch red |
| `--playstation` | `#006fcd` | PlayStation blue |
| `--xbox` | `#107c10` | Xbox green |
| `--steamdeck` | `#8b5cf6` | Steam Deck purple |
| `--accent-steam` | `#66c0f4` | Steam blue accent |
| `--bg-deep` | `#0e1419` | Darkest background |
| `--bg-raised` | `#1e2837` | Card backgrounds |

### Changing Games in Mockups

Edit `promo-tile-920x680.html` and update the `.wishlist-card` elements:
- Change game names in `.game-art` and `.game-title`
- Add/remove platform icons as needed
- Update HLTB times in `.hltb-badge`

### Changing Tagline

Edit the `<h1 class="tagline">` in the promotional tile templates.

### Changing Extension Icon Design

1. Replace `assets/icons/icon.png` with your new icon (1024×1024 recommended)
2. Run `./scripts/regen-marketing.sh`
3. The script will auto-crop padding and generate all sizes

## Chrome Web Store Requirements

| Asset | Size | Format | Required |
|-------|------|--------|----------|
| Icon | 128x128 | PNG | Yes |
| Screenshot | 1280x800 or 640x400 | PNG/JPEG | Yes (1-5) |
| Small promo tile | 440x280 | PNG | No |
| Large promo tile | 920x680 | PNG | No |
| Marquee | 1400x560 | PNG | No |

## Troubleshooting

### HTTP server won't start
- Check if port 8765 is in use: `lsof -i :8765`
- Kill existing process: `kill -9 <PID>`

### Screenshots look wrong
- Ensure fonts are loaded (wait for page load)
- Check viewport size matches template dimensions
- Clear browser cache

### Icons look blurry
- Ensure source `icon.png` is at least 512×512 (1024×1024 recommended)
- Use Pillow with `Image.LANCZOS` resampling for best quality
- Avoid excessive padding in source image (script auto-crops)
