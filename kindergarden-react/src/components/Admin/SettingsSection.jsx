import React, { useState } from 'react';

const SettingsSection = ({ showNotification }) => {
  const [settings, setSettings] = useState({
    notifications: true,
    autosave: true,
    language: 'ru',
    maintenance: false
  });

  const saveSettings = () => {
    showNotification('✅ Настройки сохранены!', 'success');
  };

  return (
    <div id="section-settings" className="admin-section">
      <div className="settings-group">
        <h3>Системные настройки</h3>
        
        <div className="setting-item">
          <label>Уведомления включены</label>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.notifications}
              onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <label>Автосохранение</label>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.autosave}
              onChange={(e) => setSettings({ ...settings, autosave: e.target.checked })}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <label>Язык интерфейса:</label>
          <select 
            value={settings.language}
            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="setting-item">
          <label>Режим обслуживания:</label>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.maintenance}
              onChange={(e) => setSettings({ ...settings, maintenance: e.target.checked })}
            />
            <span className="slider"></span>
          </label>
        </div>

        <button className="btn-primary" onClick={saveSettings}>Сохранить настройки</button>
      </div>
    </div>
  );
};

export default SettingsSection;
