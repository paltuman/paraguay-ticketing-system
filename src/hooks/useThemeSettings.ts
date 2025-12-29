import { useEffect, useState } from 'react';

interface ThemeSettings {
  primaryColor: string;
  accentColor: string;
  fontSize: string;
  compactMode: boolean;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  primaryColor: 'default',
  accentColor: 'blue',
  fontSize: 'medium',
  compactMode: false,
};

const COLOR_MAP: Record<string, { primary: string; accent: string }> = {
  default: {
    primary: '211 84% 45%',
    accent: '205 85% 92%',
  },
  blue: {
    primary: '211 84% 45%',
    accent: '205 85% 92%',
  },
  navy: {
    primary: '215 50% 30%',
    accent: '210 40% 90%',
  },
  red: {
    primary: '0 72% 51%',
    accent: '0 72% 95%',
  },
  green: {
    primary: '142 71% 45%',
    accent: '142 71% 92%',
  },
  purple: {
    primary: '262 80% 50%',
    accent: '262 80% 92%',
  },
};

const FONT_SIZE_MAP: Record<string, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

export function useThemeSettings() {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('themeSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Error parsing theme settings:', e);
      }
    }

    // Listen for storage changes (other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'themeSettings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (err) {
          console.error('Error parsing theme settings:', err);
        }
      }
    };

    // Listen for custom event (same tab)
    const handleThemeChange = (e: CustomEvent<ThemeSettings>) => {
      setSettings({ ...DEFAULT_SETTINGS, ...e.detail });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themeSettingsChanged', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeSettingsChanged', handleThemeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    // Apply theme settings to CSS variables
    const root = document.documentElement;
    
    // Apply colors
    const colorKey = settings.primaryColor === 'default' ? 'blue' : settings.primaryColor;
    const colors = COLOR_MAP[colorKey] || COLOR_MAP.blue;
    
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--ring', colors.primary);
    root.style.setProperty('--sidebar-primary', colors.primary);
    root.style.setProperty('--sidebar-ring', colors.primary);

    // Apply font size
    const fontSize = FONT_SIZE_MAP[settings.fontSize] || FONT_SIZE_MAP.medium;
    root.style.setProperty('--base-font-size', fontSize);
    root.style.fontSize = fontSize;

    // Apply compact mode
    if (settings.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
  }, [settings]);

  const saveSettings = (newSettings: Partial<ThemeSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('themeSettings', JSON.stringify(updated));
    
    // Trigger a custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('themeSettingsChanged', { detail: updated }));
  };

  return { settings, saveSettings };
}
