import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Deletes a file from Firebase Storage given its download URL.
 * @param url The download URL of the file to delete.
 * @returns A promise that resolves to true if deleted, false otherwise.
 */
export async function deleteFile(url: string | undefined | null): Promise<boolean> {
  if (!url) return false;
  
  try {
    // Check if it's a Firebase Storage URL
    if (url.includes('firebasestorage.googleapis.com')) {
      // Extract the path from the URL
      // Firebase URLs are in the format: https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[path]?alt=media&token=[token]
      // The ref() function can take the full URL directly
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
      return true;
    }
  } catch (error: any) {
    // If the file doesn't exist, we consider it "deleted"
    if (error.code === 'storage/object-not-found') {
      return true;
    }
    console.error('Failed to delete file from storage:', error);
  }
  return false;
}
