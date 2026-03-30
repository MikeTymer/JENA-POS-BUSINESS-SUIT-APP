import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File, maxSizeMB: number = 0.5, maxWidthOrHeight: number = 1024): Promise<File> => {
  const options = {
    maxSizeMB: maxSizeMB,
    maxWidthOrHeight: maxWidthOrHeight,
    useWebWorker: true,
  };
  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Fallback to original file if compression fails
  }
};
