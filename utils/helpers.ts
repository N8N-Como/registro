
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 0) milliseconds = 0;
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
};

// Haversine formula to calculate distance between two points on Earth
export const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Radius of the Earth in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// COMPRESSED IMAGE CONVERSION (Punto 2.A)
export const blobToBase64 = (blob: Blob, maxWidth = 1024, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If it's not an image (e.g. PDF), return standard base64
    if (!blob.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize logic
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const getDaysInMonth = (month: number, year: number): Date[] => {
    const date = new Date(year, month - 1, 1);
    const days = [];
    while (date.getMonth() === month - 1) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};

// --- DEVICE FINGERPRINTING HELPERS ---

export const getOrCreateDeviceId = (): string => {
    const STORAGE_KEY = 'comoencasa_device_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);
    
    if (!deviceId) {
        // Generate a simple persistent random ID
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem(STORAGE_KEY, deviceId);
    }
    return deviceId;
};

export const getBrowserInfo = (): string => {
    const ua = navigator.userAgent;
    let browser = "Desconocido";
    let os = "Desconocido";

    // Simple detection logic
    if (ua.indexOf("Firefox") > -1) browser = "Firefox";
    else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Internet";
    else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
    else if (ua.indexOf("Trident") > -1) browser = "Internet Explorer";
    else if (ua.indexOf("Edge") > -1) browser = "Edge";
    else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Safari";

    if (ua.indexOf("Win") > -1) os = "Windows";
    else if (ua.indexOf("Mac") > -1) os = "MacOS";
    else if (ua.indexOf("Linux") > -1) os = "Linux";
    else if (ua.indexOf("Android") > -1) os = "Android";
    else if (ua.indexOf("like Mac") > -1) os = "iOS";

    return `${os} - ${browser}`;
};
