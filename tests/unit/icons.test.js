/**
 * Unit tests for icons.js
 */

describe('icons.js', () => {
  beforeEach(() => {
    // Load the module fresh for each test
    jest.resetModules();
    // icons.js uses window, so set it up
    global.window = global;
    require('../../src/icons.js');
  });

  afterEach(() => {
    delete global.window;
  });

  describe('PLATFORM_ICONS', () => {
    it('should export PLATFORM_ICONS to window', () => {
      expect(window.XCPW_Icons).toBeDefined();
      expect(typeof window.XCPW_Icons).toBe('object');
    });

    it('should have all four platform icons', () => {
      const icons = window.XCPW_Icons;
      expect(icons.nintendo).toBeDefined();
      expect(icons.playstation).toBeDefined();
      expect(icons.xbox).toBeDefined();
      expect(icons.steamdeck).toBeDefined();
    });

    describe('SVG format validation', () => {
      it('should have valid SVG strings for all platforms', () => {
        const icons = window.XCPW_Icons;
        const platforms = ['nintendo', 'playstation', 'xbox', 'steamdeck'];

        platforms.forEach(platform => {
          expect(icons[platform]).toMatch(/^<svg/);
          expect(icons[platform]).toMatch(/<\/svg>$/);
        });
      });

      it('should use currentColor for fill', () => {
        const icons = window.XCPW_Icons;
        const platforms = ['nintendo', 'playstation', 'xbox', 'steamdeck'];

        platforms.forEach(platform => {
          expect(icons[platform]).toContain('fill="currentColor"');
        });
      });

      it('should have 16x16 dimensions', () => {
        const icons = window.XCPW_Icons;
        const platforms = ['nintendo', 'playstation', 'xbox', 'steamdeck'];

        platforms.forEach(platform => {
          expect(icons[platform]).toContain('width="16"');
          expect(icons[platform]).toContain('height="16"');
        });
      });

      it('should have aria-hidden for accessibility', () => {
        const icons = window.XCPW_Icons;
        const platforms = ['nintendo', 'playstation', 'xbox', 'steamdeck'];

        platforms.forEach(platform => {
          expect(icons[platform]).toContain('aria-hidden="true"');
        });
      });

      it('should have focusable="false" for accessibility', () => {
        const icons = window.XCPW_Icons;
        const platforms = ['nintendo', 'playstation', 'xbox', 'steamdeck'];

        platforms.forEach(platform => {
          expect(icons[platform]).toContain('focusable="false"');
        });
      });

      it('should have xmlns attribute', () => {
        const icons = window.XCPW_Icons;
        const platforms = ['nintendo', 'playstation', 'xbox', 'steamdeck'];

        platforms.forEach(platform => {
          expect(icons[platform]).toContain('xmlns="http://www.w3.org/2000/svg"');
        });
      });
    });
  });

  describe('PLATFORM_INFO', () => {
    it('should export PLATFORM_INFO to window', () => {
      expect(window.XCPW_PlatformInfo).toBeDefined();
      expect(typeof window.XCPW_PlatformInfo).toBe('object');
    });

    it('should have info for all four platforms', () => {
      const info = window.XCPW_PlatformInfo;
      expect(info.nintendo).toBeDefined();
      expect(info.playstation).toBeDefined();
      expect(info.xbox).toBeDefined();
      expect(info.steamdeck).toBeDefined();
    });

    describe('platform info structure', () => {
      it('should have name, abbr, and searchLabel for each platform', () => {
        const info = window.XCPW_PlatformInfo;
        const platforms = ['nintendo', 'playstation', 'xbox', 'steamdeck'];

        platforms.forEach(platform => {
          expect(info[platform].name).toBeDefined();
          expect(typeof info[platform].name).toBe('string');
          expect(info[platform].abbr).toBeDefined();
          expect(typeof info[platform].abbr).toBe('string');
          expect(info[platform].searchLabel).toBeDefined();
          expect(typeof info[platform].searchLabel).toBe('string');
        });
      });

      it('should have correct Nintendo info', () => {
        const info = window.XCPW_PlatformInfo;
        expect(info.nintendo.name).toBe('Nintendo Switch');
        expect(info.nintendo.abbr).toBe('NS');
        expect(info.nintendo.searchLabel).toContain('Nintendo');
      });

      it('should have correct PlayStation info', () => {
        const info = window.XCPW_PlatformInfo;
        expect(info.playstation.name).toBe('PlayStation');
        expect(info.playstation.abbr).toBe('PS');
        expect(info.playstation.searchLabel).toContain('PlayStation');
      });

      it('should have correct Xbox info', () => {
        const info = window.XCPW_PlatformInfo;
        expect(info.xbox.name).toBe('Xbox');
        expect(info.xbox.abbr).toBe('XB');
        expect(info.xbox.searchLabel).toContain('Xbox');
      });

      it('should have correct Steam Deck info', () => {
        const info = window.XCPW_PlatformInfo;
        expect(info.steamdeck.name).toBe('Steam Deck');
        expect(info.steamdeck.abbr).toBe('SD');
        expect(info.steamdeck.searchLabel).toContain('ProtonDB');
      });
    });
  });

  describe('STATUS_INFO', () => {
    it('should export STATUS_INFO to window', () => {
      expect(window.XCPW_StatusInfo).toBeDefined();
      expect(typeof window.XCPW_StatusInfo).toBe('object');
    });

    it('should have info for all three statuses', () => {
      const status = window.XCPW_StatusInfo;
      expect(status.available).toBeDefined();
      expect(status.unavailable).toBeDefined();
      expect(status.unknown).toBeDefined();
    });

    describe('status info structure', () => {
      it('should have tooltip function and className for each status', () => {
        const status = window.XCPW_StatusInfo;
        const statuses = ['available', 'unavailable', 'unknown'];

        statuses.forEach(s => {
          expect(typeof status[s].tooltip).toBe('function');
          expect(typeof status[s].className).toBe('string');
        });
      });

      it('should generate correct tooltips for available status', () => {
        const status = window.XCPW_StatusInfo;
        expect(status.available.tooltip('nintendo')).toContain('Nintendo Switch');
        expect(status.available.tooltip('nintendo')).toContain('Available');
        expect(status.available.tooltip('playstation')).toContain('PlayStation');
        expect(status.available.tooltip('xbox')).toContain('Xbox');
      });

      it('should generate correct tooltips for unavailable status', () => {
        const status = window.XCPW_StatusInfo;
        expect(status.unavailable.tooltip('nintendo')).toContain('Not available');
        expect(status.unavailable.tooltip('playstation')).toContain('Not available');
      });

      it('should generate correct tooltips for unknown status', () => {
        const status = window.XCPW_StatusInfo;
        expect(status.unknown.tooltip('xbox')).toContain('Unknown');
        expect(status.unknown.tooltip('xbox')).toContain('search');
      });

      it('should have correct CSS class names', () => {
        const status = window.XCPW_StatusInfo;
        expect(status.available.className).toBe('xcpw-available');
        expect(status.unavailable.className).toBe('xcpw-unavailable');
        expect(status.unknown.className).toBe('xcpw-unknown');
      });
    });
  });

  describe('PROTONDB_TIERS', () => {
    it('should export PROTONDB_TIERS to window', () => {
      expect(window.XCPW_ProtonDBTiers).toBeDefined();
      expect(typeof window.XCPW_ProtonDBTiers).toBe('object');
    });

    it('should have all tier levels', () => {
      const tiers = window.XCPW_ProtonDBTiers;
      const expectedTiers = ['native', 'platinum', 'gold', 'silver', 'bronze', 'borked', 'pending', 'unknown'];

      expectedTiers.forEach(tier => {
        expect(tiers[tier]).toBeDefined();
      });
    });

    it('should have label, color, and tooltip for each tier', () => {
      const tiers = window.XCPW_ProtonDBTiers;

      Object.keys(tiers).forEach(tier => {
        expect(tiers[tier].label).toBeDefined();
        expect(typeof tiers[tier].label).toBe('string');
        expect(tiers[tier].color).toBeDefined();
        expect(tiers[tier].color).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(tiers[tier].tooltip).toBeDefined();
        expect(typeof tiers[tier].tooltip).toBe('string');
      });
    });

    it('should have correct colors for key tiers', () => {
      const tiers = window.XCPW_ProtonDBTiers;
      expect(tiers.native.color).toBe('#5cba5c');  // Green
      expect(tiers.platinum.color).toBe('#b4c7dc');  // Platinum
      expect(tiers.gold.color).toBe('#cfb53b');  // Gold
      expect(tiers.borked.color).toBe('#ff0000');  // Red
    });
  });
});
