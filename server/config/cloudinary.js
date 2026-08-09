const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a buffer to Cloudinary
 * Returns Promise<{ secure_url: string, public_id: string }>
 */
const uploadToCloudinary = (buffer, folder = 'expense_tracker/screenshots') => {
  return new Promise((resolve, reject) => {
    // Check if cloudinary credentials are functional
    const isConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_KEY !== 'your_api_key';

    if (!isConfigured) {
      console.warn('[Cloudinary Warning] Missing active Cloudinary credentials in .env — using Data URI fallback.');
      const base64Data = buffer.toString('base64');
      const dataUri = `data:image/png;base64,${base64Data}`;
      return resolve({ secure_url: dataUri, public_id: `mock_${Date.now()}` });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error]:', error);
          return reject(error);
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Delete an asset from Cloudinary by publicId
 */
const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve) => {
    if (!publicId || publicId.startsWith('mock_') || publicId.startsWith('data:')) {
      return resolve(null);
    }

    const isConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';

    if (!isConfigured) return resolve(null);

    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error(`[Cloudinary Destroy Error for ${publicId}]:`, error);
      } else {
        console.log(`[Cloudinary Destroy Success for ${publicId}]:`, result);
      }
      resolve(result);
    });
  });
};

module.exports = { cloudinary, uploadToCloudinary, deleteFromCloudinary };
