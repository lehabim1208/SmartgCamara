import { useState, useEffect, ChangeEvent } from 'react';
import { getSettings, saveSettings, AppSettings } from '../services/storageService';

export default function Settings() {
  const [settings, setSettingsState] = useState<AppSettings | null>(null);

  useEffect(() => {
    setSettingsState(getSettings());
  }, []);

  if (!settings) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setSettingsState(prev => {
      if (!prev) return prev;
      const newSettings = {
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
      };
      saveSettings(newSettings);
      return newSettings;
    });
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSettingsState(prev => {
          if (!prev) return prev;
          const newSettings = { ...prev, customLogoBase64: base64String };
          saveSettings(newSettings);
          return newSettings;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setSettingsState(prev => {
      if (!prev) return prev;
      const newSettings = { ...prev, customLogoBase64: '' };
      saveSettings(newSettings);
      return newSettings;
    });
  };

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="max-w-md mx-auto space-y-8 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Configuración</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Personaliza el overlay y la expiración de tus fotos.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">Apariencia y Guardado</h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tema</label>
            <select 
              name="theme" 
              value={settings.theme} 
              onChange={handleChange}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="system">Sistema</option>
              <option value="dark">Modo Oscuro</option>
              <option value="light">Modo Claro</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ubicación de Guardado</label>
            <select 
              name="saveLocation" 
              value={settings.saveLocation} 
              onChange={handleChange}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="cloud">Nube (ImgBB)</option>
              <option value="local">Dispositivo Local</option>
            </select>
            <p className="text-xs text-zinc-500 mt-1">
              {settings.saveLocation === 'cloud' 
                ? 'Las fotos se subirán a ImgBB. Si no hay internet, se subirán cuando te conectes.' 
                : 'Las fotos se descargarán automáticamente a tu dispositivo al tomarlas.'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">Datos del Usuario</h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nombre de la Empresa</label>
            <input 
              type="text" 
              name="companyName"
              value={settings.companyName}
              onChange={handleChange}
              placeholder="Ej. SmartGo"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nombre del Conductor</label>
            <input 
              type="text" 
              name="driverName"
              value={settings.driverName}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">ID de Usuario</label>
            <input 
              type="text" 
              name="userId"
              value={settings.userId}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
                handleChange(e);
              }}
              placeholder="Ej. ID-12345"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">Elementos del Overlay</h2>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Mostrar Logo</span>
              <input type="checkbox" name="showLogoImage" checked={settings.showLogoImage} onChange={handleChange} className="w-5 h-5 accent-blue-500" />
            </label>
            
            {settings.showLogoImage && (
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-3">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 block">Logo Personalizado</span>
                {settings.customLogoBase64 ? (
                  <div className="flex items-center space-x-4">
                    <img src={settings.customLogoBase64} alt="Logo" className="h-12 w-auto object-contain bg-zinc-100 dark:bg-zinc-800 rounded p-1" />
                    <button 
                      onClick={handleRemoveLogo}
                      className="text-sm text-red-500 hover:text-red-600 font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                ) : (
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoUpload}
                    className="w-full text-sm text-zinc-500 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-zinc-800 dark:file:text-blue-400"
                  />
                )}
              </div>
            )}

            <label className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Nombre de la Empresa</span>
              <input type="checkbox" name="showCompany" checked={settings.showCompany} onChange={handleChange} className="w-5 h-5 accent-blue-500" />
            </label>
            
            <label className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Fecha y Hora</span>
              <input type="checkbox" name="showDateTime" checked={settings.showDateTime} onChange={handleChange} className="w-5 h-5 accent-blue-500" />
            </label>
            
            <label className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Dirección GPS</span>
              <input type="checkbox" name="showAddress" checked={settings.showAddress} onChange={handleChange} className="w-5 h-5 accent-blue-500" />
            </label>
            
            <label className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Conductor</span>
              <input type="checkbox" name="showDriver" checked={settings.showDriver} onChange={handleChange} className="w-5 h-5 accent-blue-500" />
            </label>
            
            <label className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">ID Usuario</span>
              <input type="checkbox" name="showUser" checked={settings.showUser} onChange={handleChange} className="w-5 h-5 accent-blue-500" />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">Avanzado</h2>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Capturar con botón de volumen</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Permite tomar fotos presionando el botón de subir volumen.</span>
              </div>
              <input type="checkbox" name="volumeKeyCapture" checked={settings.volumeKeyCapture} onChange={handleChange} className="w-5 h-5 accent-blue-500 ml-4" />
            </label>
          </div>
        </div>

        {settings.saveLocation === 'cloud' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2">Almacenamiento (ImgBB)</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tiempo de Expiración</label>
              <select 
                name="expirationDays" 
                value={settings.expirationDays} 
                onChange={handleChange}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value={30}>30 días (2,592,000 seg)</option>
                <option value={60}>60 días (5,184,000 seg)</option>
              </select>
              <p className="text-xs text-zinc-500 mt-1">Las fotos se eliminarán automáticamente de la nube después de este tiempo.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
