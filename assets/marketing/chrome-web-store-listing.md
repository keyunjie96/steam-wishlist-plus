# Chrome Web Store Listing

Copy-paste ready content for Chrome Web Store submission.

---

## Product Details

**Name:**
```
Steam Cross-Platform Wishlist
```

**Summary (132 char max):**
```
See which Steam wishlist games are on Switch, PlayStation, Xbox & Steam Deck. Plus HowLongToBeat completion times.
```

**Description:**
```
Shows which Steam wishlist games are also available on Nintendo Switch, PlayStation, Xbox, and Steam Deck — plus HowLongToBeat completion times.

WHY THIS EXISTS
Steam's wishlist doesn't show platform availability. Checking manually means clicking through 4 different storefronts per game. This extension does that lookup automatically and shows icons inline.

FEATURES
• Cross-platform icons — Nintendo Switch, PlayStation, Xbox, Steam Deck status at a glance
• Completion times — HowLongToBeat data shown inline
• Direct store links — Click any icon to jump to that platform's store page
• No backend — Runs entirely client-side with 7-day cache
• No telemetry — Wikidata queries only, nothing phoned home

HOW IT WORKS
Platform data comes from Wikidata (free, crowd-sourced database). Steam Deck verification status is read from Steam's own page data. Completion times come from HowLongToBeat.

PRIVACY
• No account required
• No personal data collected
• No analytics or tracking
• All cached data stored locally on your device
• Open source: https://github.com/keyunjie96/steam-cross-platform-wishlist

LIMITATIONS
• Wikidata coverage is incomplete (volunteer-maintained). You can contribute missing data at wikidata.org
• HowLongToBeat uses an undocumented API that occasionally changes

~70KB, runs entirely client-side. One tool, one job.
```

---

## Category

**Category:**
```
Shopping
```
(or "Productivity" if Shopping isn't available)

**Language:**
```
English
```

---

## Store Listing Graphics

| Asset | File |
|-------|------|
| Icon 128x128 | `assets/icons/icon128.png` |
| Screenshot | `assets/marketing/screenshot-1.png` |
| Small promo tile (440x280) | `assets/marketing/promo-tile-440x280.png` |
| Large promo tile (920x680) | `assets/marketing/promo-tile-920x680-v3.png` |

---

## Privacy Tab

**Single purpose description:**
```
Display cross-platform availability icons (Nintendo Switch, PlayStation, Xbox, Steam Deck) and completion times on Steam wishlist pages.
```

**Permission justifications:**

| Permission | Justification |
|------------|---------------|
| `storage` | Cache game platform data locally for 7 days to reduce API requests |
| `host_permissions: store.steampowered.com` | Read Steam wishlist pages to extract game IDs and inject platform icons |
| `host_permissions: query.wikidata.org` | Query Wikidata SPARQL API for game platform availability data |
| `host_permissions: howlongtobeat.com` | Fetch game completion time estimates |
| `host_permissions: store.playstation.com` | Validate PlayStation store links before displaying |
| `host_permissions: www.nintendo.com` | Validate Nintendo eShop links before displaying |
| `host_permissions: www.xbox.com` | Validate Xbox store links before displaying |

**Data usage:**
- Are you collecting personal data? **No**
- Are you using remote code? **No**

**Privacy policy URL:**
```
https://github.com/keyunjie96/steam-cross-platform-wishlist/blob/main/PRIVACY.md
```

---

## Support Tab (optional)

**Homepage URL:**
```
https://github.com/keyunjie96/steam-cross-platform-wishlist
```

**Support URL:**
```
https://github.com/keyunjie96/steam-cross-platform-wishlist/issues
```
