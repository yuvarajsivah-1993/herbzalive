import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// FIX: Import faUser icon to be used as a placeholder.
import { faCamera, faUpload, faTimes, faSync, faUser } from '@fortawesome/free-solid-svg-icons';
import Button from './Button';

interface PhotoCaptureInputProps {
  onPhotoTaken: (file: File | string | null) => void;
  initialPhotoUrl?: string | null;
}

const CameraModal: React.FC<{
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}> = ({ onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access the camera. Please check permissions.");
      }
    };

    startStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const width = videoRef.current.videoWidth;
        const height = videoRef.current.videoHeight;
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        context.drawImage(videoRef.current, 0, 0, width, height);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        onCapture(dataUrl);
        onClose();
      }
    }
  };

  return (
     <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl m-4 p-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Take Photo</h3>
            {error ? (
                <p className="text-red-500 p-4 bg-red-100 dark:bg-red-900/50 rounded-lg">{error}</p>
            ) : (
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-md bg-slate-900"></video>
            )}
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="flex justify-end space-x-2 mt-4">
                <Button variant="light" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleCapture} disabled={!!error}>Capture</Button>
            </div>
        </div>
    </div>
  );
};

const PhotoCaptureInput: React.FC<PhotoCaptureInputProps> = ({ onPhotoTaken, initialPhotoUrl }) => {
  const [preview, setPreview] = useState<string | null>(initialPhotoUrl || null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(initialPhotoUrl || null);
  }, [initialPhotoUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        onPhotoTaken(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = (dataUrl: string) => {
    setPreview(dataUrl);
    onPhotoTaken(dataUrl);
  };
  
  const handleRemovePhoto = () => {
    setPreview(null);
    onPhotoTaken(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        Patient Photo
      </label>
      <div className="mt-1 flex items-center space-x-4 p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
        <div className="h-24 w-24 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
          {preview ? (
            <img src={preview} alt="Patient preview" className="h-full w-full object-cover" />
          ) : (
            <FontAwesomeIcon icon={faUser} className="h-12 w-12 text-slate-400 dark:text-slate-600" />
          )}
        </div>
        <div className="flex-grow">
          {preview ? (
             <div className="flex items-center gap-2">
                 <Button type="button" variant="light" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <FontAwesomeIcon icon={faSync} className="mr-2 h-4 w-4" /> Change
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={handleRemovePhoto}>
                    <FontAwesomeIcon icon={faTimes} className="mr-2 h-4 w-4" /> Remove
                </Button>
             </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button type="button" variant="light" size="sm" onClick={() => fileInputRef.current?.click()}>
                <FontAwesomeIcon icon={faUpload} className="mr-2 h-4 w-4" /> Upload File
              </Button>
              <Button type="button" variant="light" size="sm" onClick={() => setIsCameraOpen(true)}>
                <FontAwesomeIcon icon={faCamera} className="mr-2 h-4 w-4" /> Take Photo
              </Button>
            </div>
          )}
          <input ref={fileInputRef} type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">JPG, PNG, or GIF. Max size of 2MB.</p>
        </div>
      </div>
      {isCameraOpen && <CameraModal onClose={() => setIsCameraOpen(false)} onCapture={handleCapture} />}
    </div>
  );
};

export default PhotoCaptureInput;