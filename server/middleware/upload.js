const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const createUploader = (folder, allowedFormats, resourceType = 'auto') => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `personal-social-hub/${folder}`,
      allowed_formats: allowedFormats,
      resource_type: resourceType,
    },
  });
  return multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  });
};

const imageUpload = createUploader('images', ['jpg', 'jpeg', 'png', 'gif', 'webp'], 'image');
const audioUpload = createUploader('audio', ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma', 'webm'], 'auto');
const videoUpload = createUploader('videos', ['mp4', 'mov', 'avi', 'webm', 'mkv'], 'video');
const fileUpload = createUploader('files', ['pdf', 'doc', 'docx', 'txt', 'zip', 'jpg', 'png', 'mp3', 'mp4'], 'auto');
// Chat accepts images, voice, and files — needs broader format support
const chatUpload = createUploader('chat', [
  'jpg', 'jpeg', 'png', 'gif', 'webp',         // images
  'mp3', 'wav', 'ogg', 'aac', 'm4a', 'webm',   // audio/voice
  'mp4', 'mov',                                   // video
  'pdf', 'doc', 'docx', 'txt', 'zip',            // documents
], 'auto');

// Posts accept images + audio + video
const postMediaUpload = createUploader('posts', [
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma', 'webm',
  'mp4', 'mov', 'avi', 'mkv',
], 'auto');

module.exports = { imageUpload, audioUpload, videoUpload, fileUpload, chatUpload, postMediaUpload };
