import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera as CameraIcon, RefreshCcw, MapPin, Loader2, Zap, ZapOff } from 'lucide-react';
import { getAddressFromCoords, uploadToImgBB } from '../services/apiService';
import { getSettings, addPhoto, AppSettings } from '../services/storageService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Camera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [address, setAddress] = useState<string>('Obteniendo ubicación...');
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [flashOn, setFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Load settings
  useEffect(() => {
    setSettings(getSettings());
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get GPS Location
  useEffect(() => {
    if (!navigator.geolocation) {
      setAddress('Geolocalización no soportada');
      return;
    }

    let lastGeocodedCoords: {lat: number, lon: number} | null = null;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        setPermissionError(null); // Clear error if we get location (sometimes permissions are linked)
        
        // Calculate distance to prevent spamming the geocoding API
        let shouldGeocode = true;
        if (lastGeocodedCoords) {
          const R = 6371e3; // metres
          const lat1 = lastGeocodedCoords.lat * Math.PI/180;
          const lat2 = latitude * Math.PI/180;
          const dLat = (latitude - lastGeocodedCoords.lat) * Math.PI/180;
          const dLon = (longitude - lastGeocodedCoords.lon) * Math.PI/180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1) * Math.cos(lat2) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          if (distance < 20) {
            shouldGeocode = false;
          }
        }

        if (shouldGeocode) {
          lastGeocodedCoords = { lat: latitude, lon: longitude };
          const addr = await getAddressFromCoords(latitude, longitude);
          setAddress(addr);
        }
      },
      (error) => {
        console.error('GPS Error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setAddress('Permiso de ubicación denegado');
        } else {
          setAddress('Error obteniendo ubicación');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Initialize Camera
  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setPermissionError(null);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1440 },
          height: { ideal: 1920 }
        },
        audio: false
      });
      
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Check for flash capabilities
      const track = newStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) {
        setHasFlash(true);
      } else {
        setHasFlash(false);
        setFlashOn(false);
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
        setPermissionError('Permiso de cámara denegado. Por favor, permite el acceso a la cámara en tu navegador.');
      } else if (err.name === 'NotFoundError') {
        setPermissionError('No se encontró ninguna cámara en este dispositivo.');
      } else {
        setPermissionError(`Error de cámara: ${err.message || 'Desconocido'}`);
      }
      toast.error('Error al acceder a la cámara. Verifica los permisos.');
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleFlash = async () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: !flashOn }] as any
        });
        setFlashOn(!flashOn);
      } catch (e) {
        console.error("Flash error", e);
      }
    }
  };

  const drawOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!settings) return;

    const padding = Math.floor(width * 0.04);
    const timeFontSize = Math.floor(width * 0.1);
    const dateFontSize = Math.floor(width * 0.035);
    const addressFontSize = Math.floor(width * 0.03);
    const boxFontSize = Math.floor(width * 0.03);
    
    let currentY = height - padding;

    // Draw Box (Empresa & Nombre)
    if (settings.showCompany || settings.showDriver || settings.showUser) {
        ctx.font = `normal ${boxFontSize}px sans-serif`;
        const boxPadding = padding * 0.5;
        const lineHeight = boxFontSize * 1.5;
        
        let boxLines = [];
        if (settings.showCompany && settings.companyName) boxLines.push({ label: 'Empresa: ', value: settings.companyName });
        if (settings.showDriver && settings.driverName) boxLines.push({ label: 'Nombre: ', value: settings.driverName });
        if (settings.showUser && settings.userId) boxLines.push({ label: 'ID: ', value: settings.userId.toUpperCase() });
        
        const boxHeight = (boxLines.length * lineHeight) + (boxPadding * 2);
        const boxY = currentY - boxHeight;
        
        // Calculate max text width for the box
        let maxTextWidth = 0;
        boxLines.forEach(line => {
            let w = ctx.measureText(line.label).width;
            if (line.label === 'Empresa: ') {
                ctx.font = `bold ${boxFontSize * 1.2}px sans-serif`;
                w += ctx.measureText(line.value).width;
                ctx.font = `normal ${boxFontSize}px sans-serif`;
            } else {
                w += ctx.measureText(line.value).width;
            }
            if (w > maxTextWidth) maxTextWidth = w;
        });
        const boxWidth = maxTextWidth + (boxPadding * 2);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Semi-transparent white/grey
        ctx.fillRect(padding, boxY, boxWidth, boxHeight);
        
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        boxLines.forEach((line, index) => {
            const lineY = boxY + boxPadding + (index * lineHeight);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(line.label, padding + boxPadding, lineY);
            
            if (line.label === 'Empresa: ') {
              const labelWidth = ctx.measureText(line.label).width;
              ctx.fillStyle = '#0066cc'; // Azul bonito
              ctx.font = `bold ${boxFontSize * 1.2}px sans-serif`; // Make company name larger
              ctx.fillText(line.value, padding + boxPadding + labelWidth, lineY - (boxFontSize * 0.1));
              ctx.font = `normal ${boxFontSize}px sans-serif`; // Reset font
            } else {
              const labelWidth = ctx.measureText(line.label).width;
              ctx.fillText(line.value, padding + boxPadding + labelWidth, lineY);
            }
        });
        
        // Draw Logo next to the box
        if (settings.showLogoImage && settings.customLogoBase64) {
          const logoImg = new Image();
          logoImg.src = settings.customLogoBase64;
          
          const logoHeight = boxHeight;
          const aspectRatio = logoImg.width / logoImg.height;
          const logoWidth = logoHeight * aspectRatio;
          
          const logoX = padding + boxWidth + padding;
          const logoY = boxY;
          
          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        }
        
        currentY = boxY - padding;
    } else {
        // If no box, but there is a logo, draw it at the bottom left
        if (settings.showLogoImage && settings.customLogoBase64) {
          const logoImg = new Image();
          logoImg.src = settings.customLogoBase64;
          
          const logoHeight = width * 0.1;
          const aspectRatio = logoImg.width / logoImg.height;
          const logoWidth = logoHeight * aspectRatio;
          
          const logoX = padding;
          const logoY = currentY - logoHeight;
          
          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
          currentY = logoY - padding;
        }
    }

    // Draw Address
    if (settings.showAddress) {
        ctx.font = `normal ${addressFontSize}px sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        
        // Split address into 2 lines if needed
        const addressLines = address.split(', ');
        let line1 = addressLines.slice(0, Math.ceil(addressLines.length / 2)).join(', ');
        let line2 = addressLines.slice(Math.ceil(addressLines.length / 2)).join(', ');
        
        if (line2) {
            ctx.fillText(line2, padding, currentY);
            currentY -= (addressFontSize * 1.2);
        }
        ctx.fillText(line1, padding, currentY);
        currentY -= (addressFontSize * 1.5);
    }

    // Draw Time and Date
    if (settings.showDateTime) {
        const timeStr = format(currentTime, "HH:mm");
        const dateStr = format(currentTime, "dd 'de' MMM yyyy", { locale: es });
        const dayStr = format(currentTime, "EEE", { locale: es });
        
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        
        // Time
        ctx.font = `normal ${timeFontSize}px sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(timeStr, padding, currentY);
        
        const timeWidth = ctx.measureText(timeStr).width;
        
        // Vertical Line
        const lineX = padding + timeWidth + (padding * 0.5);
        ctx.beginPath();
        ctx.moveTo(lineX, currentY - timeFontSize + (timeFontSize * 0.2));
        ctx.lineTo(lineX, currentY);
        ctx.strokeStyle = '#F97316'; // Orange-500
        ctx.lineWidth = Math.max(2, Math.floor(width * 0.005));
        ctx.stroke();
        
        // Date and Day
        const dateX = lineX + (padding * 0.5);
        ctx.font = `normal ${dateFontSize}px sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        // Capitalize first letter of day
        const capitalizedDay = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
        ctx.fillText(capitalizedDay, dateX, currentY);
        ctx.fillText(dateStr, dateX, currentY - (dateFontSize * 1.2));
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !settings) return;

    setIsCapturing(true);
    const toastId = toast.loading('Procesando imagen...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not get canvas context');

      // Calculate crop for 3:4 aspect ratio
      const targetRatio = 3 / 4;
      const videoRatio = video.videoWidth / video.videoHeight;
      
      let drawWidth = video.videoWidth;
      let drawHeight = video.videoHeight;
      let offsetX = 0;
      let offsetY = 0;

      // Add a small tolerance to avoid floating point issues
      if (videoRatio > targetRatio + 0.01) {
        // Video is wider than 3:4. Crop sides.
        drawWidth = video.videoHeight * targetRatio;
        offsetX = (video.videoWidth - drawWidth) / 2;
      } else if (videoRatio < targetRatio - 0.01) {
        // Video is taller than 3:4. Crop top/bottom.
        drawHeight = video.videoWidth / targetRatio;
        offsetY = (video.videoHeight - drawHeight) / 2;
      }

      canvas.width = drawWidth;
      canvas.height = drawHeight;

      // Draw video frame
      if (facingMode === 'user') {
        // Mirror the image for front camera
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
      
      // Reset transform before drawing overlay
      if (facingMode === 'user') {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      // Draw overlay
      drawOverlay(ctx, canvas.width, canvas.height);

      // Get base64 image
      const base64Image = canvas.toDataURL('image/jpeg', 0.85);
      const filename = `SmartGo_${format(new Date(), 'yyyyMMdd_HHmmss')}.jpg`;

      if (settings.saveLocation === 'local') {
        // Save locally (download)
        const a = document.createElement('a');
        a.href = base64Image;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        addPhoto({
          id: crypto.randomUUID(),
          url: base64Image, // Use base64 as URL for local gallery
          date: new Date().toISOString(),
          address: address,
          filename: filename
        });
        toast.success('Foto guardada en el dispositivo', { id: toastId });
      } else {
        // Save to cloud
        if (navigator.onLine) {
          toast.loading('Subiendo a ImgBB...', { id: toastId });
          const expirationSeconds = settings.expirationDays === 60 ? 5184000 : 2592000;
          const { url, delete_url } = await uploadToImgBB(base64Image, expirationSeconds);
          
          addPhoto({
            id: crypto.randomUUID(),
            url: url,
            delete_url: delete_url,
            date: new Date().toISOString(),
            address: address,
            filename: filename
          });
          toast.success('Foto subida exitosamente', { id: toastId });
        } else {
          // Offline queue
          addPhoto({
            id: crypto.randomUUID(),
            url: base64Image, // Temporary URL for gallery
            date: new Date().toISOString(),
            address: address,
            filename: filename,
            isPendingUpload: true,
            base64Data: base64Image
          });
          toast.success('Guardada sin conexión. Se subirá al tener internet.', { id: toastId });
        }
      }

      // Visual feedback flash
      const flash = document.createElement('div');
      flash.className = 'absolute inset-0 bg-white z-50 animate-pulse opacity-0 pointer-events-none';
      flash.style.animation = 'flash 0.5s ease-out';
      document.body.appendChild(flash);
      setTimeout(() => document.body.removeChild(flash), 500);

    } catch (error: any) {
      console.error('Capture error:', error);
      toast.error(error.message || 'Error al capturar o procesar la foto', { id: toastId });
    } finally {
      setIsCapturing(false);
    }
  };

  // Volume key capture
  useEffect(() => {
    if (!settings?.volumeKeyCapture) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'AudioVolumeUp' || e.key === 'VolumeUp' || e.key === '+' || e.key === '=') {
        if (!isCapturing && !permissionError) {
          // Prevent default volume change if possible
          e.preventDefault();
          capturePhoto();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings?.volumeKeyCapture, isCapturing, permissionError, capturePhoto]);

  return (
    <div className="relative h-full w-full bg-black flex flex-col">
      {/* Camera Viewfinder */}
      <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden">
        {permissionError ? (
          <div className="p-6 text-center text-white max-w-md w-full">
            <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700 shadow-xl">
              <CameraIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Acceso a la Cámara</h3>
              <p className="text-zinc-400 text-sm mb-6">
                {permissionError}
              </p>
              <button 
                onClick={startCamera}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-[3/4] max-h-full bg-zinc-900 flex items-center justify-center overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            
            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Live Overlay Preview (CSS based, matches canvas output roughly) */}
            {settings && (
              <div className="absolute inset-0 p-4 text-white text-sm sm:text-base pointer-events-none flex flex-col justify-end">
                {/* Bottom Area for Info */}
                <div className="flex flex-col gap-1">
                  {settings.showDateTime && (
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-5xl font-normal leading-none">{format(currentTime, "HH:mm")}</span>
                      <div className="h-10 w-0.5 bg-orange-500"></div>
                      <div className="flex flex-col text-sm leading-tight">
                        <span>{format(currentTime, "dd 'de' MMM yyyy", { locale: es })}</span>
                        <span>{format(currentTime, "EEE", { locale: es }).charAt(0).toUpperCase() + format(currentTime, "EEE", { locale: es }).slice(1)}</span>
                      </div>
                    </div>
                  )}
                  
                  {settings.showAddress && (
                    <div className="text-sm mb-2 max-w-[85%] drop-shadow-md">
                      {address}
                    </div>
                  )}
                  
                  <div className="flex items-end gap-3">
                    {(settings.showCompany || settings.showDriver || settings.showUser) && (
                      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-sm text-sm w-fit">
                        {settings.showCompany && settings.companyName && (
                          <div>Empresa: <span className="text-blue-500 font-bold text-base">{settings.companyName}</span></div>
                        )}
                        {settings.showDriver && settings.driverName && <div>Nombre: {settings.driverName}</div>}
                        {settings.showUser && settings.userId && <div>ID: {settings.userId.toUpperCase()}</div>}
                      </div>
                    )}
                    {settings.showLogoImage && settings.customLogoBase64 && (
                      <div className="h-14">
                        <img 
                          src={settings.customLogoBase64} 
                          alt="Logo" 
                          className="h-full w-auto object-contain drop-shadow-md"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Top Controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium text-white">
                {coords ? <MapPin size={14} className="text-green-400" /> : <Loader2 size={14} className="text-yellow-400 animate-spin" />}
                <span className="max-w-[150px] truncate">{coords ? 'GPS Activo' : 'Buscando GPS...'}</span>
              </div>

              {hasFlash && (
                <button 
                  onClick={toggleFlash}
                  className={`p-2 rounded-full backdrop-blur-md transition-colors ${flashOn ? 'bg-yellow-400 text-black' : 'bg-black/50 text-white'}`}
                >
                  {flashOn ? <Zap size={20} /> : <ZapOff size={20} />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-32 bg-black flex items-center justify-around px-6 pb-4">
        <button 
          onClick={toggleCamera}
          disabled={isCapturing || !!permissionError}
          className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCcw size={24} />
        </button>

        <button 
          onClick={capturePhoto}
          disabled={isCapturing || !!permissionError}
          className="w-20 h-20 rounded-full border-4 border-zinc-300 flex items-center justify-center p-1 disabled:opacity-50 transition-transform active:scale-95"
        >
          <div className={`w-full h-full rounded-full ${isCapturing ? 'bg-zinc-500' : 'bg-white'}`}></div>
        </button>

        <div className="w-14 h-14">
          {/* Placeholder for symmetry */}
        </div>
      </div>
      
      <style>{`
        @keyframes flash {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
