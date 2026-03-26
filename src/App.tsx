import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Camera as CameraIcon, Image as ImageIcon, Settings as SettingsIcon } from 'lucide-react';
import Camera from './components/Camera';
import Gallery from './components/Gallery';
import Settings from './components/Settings';
import { Toaster } from 'sonner';
import { getSettings, getPhotos, updatePhoto, applyTheme } from './services/storageService';
import { uploadToImgBB } from './services/apiService';

export default function App() {
  useEffect(() => {
    // Apply initial theme
    const settings = getSettings();
    applyTheme(settings.theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentSettings = getSettings();
      if (currentSettings.theme === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);

    // Offline sync logic
    const syncOfflinePhotos = async () => {
      if (!navigator.onLine) return;
      
      const currentSettings = getSettings();
      if (currentSettings.saveLocation !== 'cloud') return;

      const photos = getPhotos();
      const pendingPhotos = photos.filter(p => p.isPendingUpload && p.base64Data);

      for (const photo of pendingPhotos) {
        try {
          const expirationSeconds = currentSettings.expirationDays === 60 ? 5184000 : 2592000;
          const { url, delete_url } = await uploadToImgBB(photo.base64Data!, expirationSeconds);
          
          updatePhoto(photo.id, {
            url,
            delete_url,
            isPendingUpload: false,
            base64Data: undefined // Clear base64 to save space
          });
        } catch (error) {
          console.error('Failed to sync photo', photo.id, error);
        }
      }
    };

    window.addEventListener('online', syncOfflinePhotos);
    // Initial check in case we start online with pending photos
    syncOfflinePhotos();

    return () => {
      window.removeEventListener('online', syncOfflinePhotos);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors">
        <main className="flex-1 relative overflow-hidden">
          <Routes>
            <Route path="/" element={<Camera />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        
        <nav className="h-16 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around px-4 pb-safe transition-colors">
          <NavLink 
            to="/gallery" 
            className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
          >
            <ImageIcon size={24} />
            <span className="text-[10px] mt-1 font-medium">Galería</span>
          </NavLink>
          
          <NavLink 
            to="/" 
            className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
          >
            <CameraIcon size={24} />
            <span className="text-[10px] mt-1 font-medium">Cámara</span>
          </NavLink>
          
          <NavLink 
            to="/settings" 
            className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
          >
            <SettingsIcon size={24} />
            <span className="text-[10px] mt-1 font-medium">Ajustes</span>
          </NavLink>
        </nav>
      </div>
      <Toaster theme="system" position="top-center" />
    </BrowserRouter>
  );
}
