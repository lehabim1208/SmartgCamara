export interface PhotoRecord {
  id: string;
  url: string;
  date: string;
  address: string;
  filename: string;
  delete_url?: string;
  isPendingUpload?: boolean;
  base64Data?: string;
}

export interface AppSettings {
  companyName: string;
  driverName: string;
  userId: string;
  expirationDays: number;
  showCompany: boolean;
  showDateTime: boolean;
  showAddress: boolean;
  showDriver: boolean;
  showUser: boolean;
  showLogoImage: boolean;
  customLogoBase64: string;
  saveLocation: 'cloud' | 'local';
  theme: 'dark' | 'light' | 'system';
  volumeKeyCapture: boolean;
}

const PHOTOS_KEY = 'smartgo_photos';
const SETTINGS_KEY = 'smartgo_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'SmartGo',
  driverName: '',
  userId: '',
  expirationDays: 30,
  showCompany: true,
  showDateTime: true,
  showAddress: true,
  showDriver: true,
  showUser: true,
  showLogoImage: false,
  customLogoBase64: '',
  saveLocation: 'cloud',
  theme: 'system',
  volumeKeyCapture: true,
};

export function applyTheme(theme: 'dark' | 'light' | 'system') {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function getSettings(): AppSettings {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Migrate old settings
      if (parsed.showLogo !== undefined) {
        parsed.showCompany = parsed.showLogo;
        delete parsed.showLogo;
      }
      if (parsed.theme === undefined) parsed.theme = 'system';
      if (parsed.saveLocation === undefined) parsed.saveLocation = 'cloud';
      if (parsed.showLogoImage === undefined) parsed.showLogoImage = false;
      if (parsed.customLogoBase64 === undefined) parsed.customLogoBase64 = '';
      if (parsed.volumeKeyCapture === undefined) parsed.volumeKeyCapture = true;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      console.error('Failed to parse settings', e);
    }
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applyTheme(settings.theme);
}

export function getPhotos(): PhotoRecord[] {
  const stored = localStorage.getItem(PHOTOS_KEY);
  let photos: PhotoRecord[] = [];
  if (stored) {
    try {
      photos = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse photos', e);
    }
  }

  // Clean up photos older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const filteredPhotos = photos.filter(photo => {
    const photoDate = new Date(photo.date);
    return photoDate >= thirtyDaysAgo;
  });

  if (filteredPhotos.length !== photos.length) {
    savePhotos(filteredPhotos);
  }

  // Sort by newest first
  return filteredPhotos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function savePhotos(photos: PhotoRecord[]): void {
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
}

export function addPhoto(photo: PhotoRecord): void {
  const photos = getPhotos();
  photos.push(photo);
  savePhotos(photos);
}

export function deletePhoto(id: string): void {
  const photos = getPhotos();
  const filtered = photos.filter(p => p.id !== id);
  savePhotos(filtered);
}

export function updatePhoto(id: string, updates: Partial<PhotoRecord>): void {
  const photos = getPhotos();
  const index = photos.findIndex(p => p.id === id);
  if (index !== -1) {
    photos[index] = { ...photos[index], ...updates };
    savePhotos(photos);
  }
}

