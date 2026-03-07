
import { useState, useCallback } from 'react';

const DEFAULT_SETTINGS = {
  fontFamily: 'SimSun, 宋体, serif',
  fontSize: '18px',
  fontColor: '#000000',
  lineHeight: '1.8',
  textAlign: 'left',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none'
};

export const useEditorSettings = (initialSettings = {}) => {
  const [settings, setSettings] = useState({
    ...DEFAULT_SETTINGS,
    ...initialSettings
  });

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const loadSettings = useCallback((newSettings) => {
    if (!newSettings || Object.keys(newSettings).length === 0) {
      setSettings(DEFAULT_SETTINGS);
      return;
    }
    // Ensure numeric values usually stored as strings in DB are handled gracefully if needed
    setSettings(prev => ({
      ...DEFAULT_SETTINGS,
      ...newSettings
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSetting,
    loadSettings,
    resetSettings
  };
};
