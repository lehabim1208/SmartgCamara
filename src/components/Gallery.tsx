import { useState, useEffect } from 'react';
import { getPhotos, deletePhoto, PhotoRecord } from '../services/storageService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, Download, X, CloudOff } from 'lucide-react';
import { toast } from 'sonner';

export default function Gallery() {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setPhotos(getPhotos());
  }, []);

  const handleDelete = () => {
    if (selectedPhoto) {
      deletePhoto(selectedPhoto.id);
      setPhotos(getPhotos());
      setSelectedPhoto(null);
      setShowDeleteConfirm(false);
      toast.success('Foto eliminada del historial');
    }
  };

  const handleDownload = async (photo: PhotoRecord) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Descarga iniciada');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error al descargar la imagen');
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-zinc-100 dark:bg-zinc-950 p-2 pb-20 transition-colors">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between px-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Galería</h1>
          <span className="text-sm text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800">
            {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
          </span>
        </div>

        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-4">
            <div className="w-16 h-16 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
              <span className="text-2xl">📸</span>
            </div>
            <p>No hay fotos en el historial local.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {photos.map((photo) => (
              <div 
                key={photo.id} 
                className="relative aspect-square bg-zinc-200 dark:bg-zinc-900 overflow-hidden cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img 
                  src={photo.url} 
                  alt={photo.filename} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {photo.isPendingUpload && (
                  <div className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                    <CloudOff size={12} className="text-yellow-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Photo View */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Top Bar */}
          <div className="h-14 bg-black/50 backdrop-blur-md flex items-center justify-between px-4 absolute top-0 left-0 right-0 z-10">
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleDownload(selectedPhoto)}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <Download size={24} />
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-500 hover:bg-red-500/20 rounded-full transition-colors"
              >
                <Trash2 size={24} />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <img 
              src={selectedPhoto.url} 
              alt={selectedPhoto.filename} 
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Info Bar */}
          <div className="bg-black/80 backdrop-blur-md p-4 text-white text-sm space-y-1 absolute bottom-0 left-0 right-0 pb-safe">
            <p className="font-medium">{format(new Date(selectedPhoto.date), "dd MMM yyyy, HH:mm:ss", { locale: es })}</p>
            <p className="text-zinc-400 text-xs line-clamp-2">{selectedPhoto.address}</p>
            {selectedPhoto.isPendingUpload && (
              <p className="text-yellow-400 text-xs flex items-center gap-1 mt-1">
                <CloudOff size={12} /> Pendiente de subir a la nube
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">¿Eliminar fotografía?</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
              Esta acción eliminará la foto de tu galería local. {selectedPhoto?.delete_url ? 'También se intentará eliminar de la nube.' : ''}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
