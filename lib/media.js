import { ref as sRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, storage } from './firebase';
import { RETENTION_OPTIONS } from './constants';

export function expiryFromRetention(retention) {
  const opt = RETENTION_OPTIONS.find((o) => o.value === retention);
  if (!opt || !opt.days) return null;
  return new Date(Date.now() + opt.days * 24 * 60 * 60 * 1000);
}

/**
 * Uploads a file to Firebase Storage and tracks metadata in `tournament_media`.
 */
export function uploadFileWithTracking({
  file, path, user,
  mediaType,
  retentionPeriod = '90d',
  tournamentId = null,
  entityType = null,
  entityId = null,
  onProgress,
}) {
  return new Promise((resolve, reject) => {
    const r = sRef(storage, path);
    const task = uploadBytesResumable(r, file);
    task.on('state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          const expiryDate = expiryFromRetention(retentionPeriod);
          await addDoc(collection(db, 'tournament_media'), {
            mediaUrl: url,
            mediaPath: path,
            mediaType,
            fileName: file.name,
            sizeBytes: file.size || 0,
            tournamentId,
            entityType,
            entityId,
            retentionPeriod,
            expiryDate: expiryDate ? expiryDate.toISOString() : null,
            isPermanent: !expiryDate,
            uploadedAt: serverTimestamp(),
            uploadedBy: user?.uid || null,
            archived: false,
          });
          resolve({ url, path });
        } catch (e) { reject(e); }
      }
    );
  });
}
