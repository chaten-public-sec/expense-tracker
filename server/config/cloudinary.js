const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    // Check if cloudinary is configured properly
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'demo') {
      // Fallback: create data URI if Cloudinary credentials are mock
      const base64Data = buffer.toString('base64');
      const dataUri = `data:image/png;base64,${base64Data}`;
      return resolve({ secure_url: dataUri });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'expense_tracker/screenshots' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

module.exports = { cloudinary, uploadToCloudinary };
