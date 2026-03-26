// We use import.meta.env for Vite environment variables
// The user will need to set VITE_IMGBB_API_KEY in the AI Studio Settings -> Secrets
export const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || '';

export const locationCache = {
  lat: 0,
  lon: 0,
  address: '',
  timestamp: 0
};

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function uploadToImgBB(base64Image: string, expirationSeconds: number): Promise<{url: string, delete_url: string}> {
  if (!IMGBB_API_KEY) {
    throw new Error('La API Key de ImgBB no está configurada. Por favor, añádela en los ajustes de Secrets (VITE_IMGBB_API_KEY).');
  }

  const formData = new FormData();
  // Remove the data:image/jpeg;base64, part
  const base64Data = base64Image.split(',')[1];
  formData.append('image', base64Data);
  formData.append('expiration', expirationSeconds.toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `Error HTTP ${response.status}`;
      throw new Error(`Error de ImgBB: ${errorMessage}`);
    }

    const data = await response.json();
    return {
      url: data.data.url,
      delete_url: data.data.delete_url
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('La subida a ImgBB ha tardado demasiado (tiempo de espera agotado). Verifica tu conexión.');
    }
    throw error;
  }
}

export async function getAddressFromCoords(lat: number, lon: number): Promise<string> {
  try {
    // Try Nominatim first
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&email=lehabimgroup@gmail.com`, {
      headers: {
        'Accept-Language': 'es'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.address) {
        const { amenity, building, shop, leisure, road, house_number, suburb, neighbourhood, city, town, village } = data.address;
        const exactLocation = amenity || building || shop || leisure || '';
        const street = road || '';
        const num = house_number || '';
        const neighborhood = suburb || neighbourhood || '';
        const locality = city || town || village || '';
        
        const parts = [exactLocation, `${street} ${num}`.trim(), neighborhood, locality].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
      if (data.display_name) return data.display_name;
    }
  } catch (error) {
    console.warn('Nominatim geocoding error:', error);
  }

  // Fallback to BigDataCloud if Nominatim fails or rate limits
  try {
    const fallbackResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`);
    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      if (fallbackData && fallbackData.locality) {
        const parts = [fallbackData.locality, fallbackData.city, fallbackData.principalSubdivision].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    }
  } catch (fallbackError) {
    console.error('Fallback geocoding error:', fallbackError);
  }

  // Final fallback to coordinates
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
