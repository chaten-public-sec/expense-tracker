const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    // Check if cloudinary credentials are functional
    const isConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_KEY !== 'your_api_key';

    if (!isConfigured) {
      // Development fallback: data URI fallback when credentials are not populated yet
      console.warn('[Cloudinary Warning] Missing active Cloudinary credentials in .env — using Data URI fallback.');
      const base64Data = buffer.toString('base64');
      const dataUri = `data:image/png;base64,${base64Data}`;
      return resolve({ secure_url: dataUri });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'expense_tracker/screenshots',
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error]:', error);
          return reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

module.exports = { cloudinary, uploadToCloudinary };
