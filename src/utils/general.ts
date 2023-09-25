import path from 'path';

export function generateRandomString(length = 20) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }

  return randomString;
}

export function categorizeFile(fileUrl: string) {
  const fileExtension = path.extname(fileUrl).toLowerCase();
  const extensions = {
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
    '.webp': 'image',
    '.pdf': 'document',
    '.docx': 'document',
    '.xlsx': 'document',
    '.csv': 'document',
    '.txt': 'document',
  };

  const fileTypes = Object.keys(extensions);
  const fileType =
    fileTypes.find((type) => fileExtension.includes(type)) || 'unknown';

  return {
    [fileType]: {
      url: fileUrl,
    },
  };
}
