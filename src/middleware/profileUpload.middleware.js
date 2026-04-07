import multer from 'multer';
import cloudinary from '../config/cloudinary.js';

const PROFILE_FOLDER = 'human-rights-evidence/profile-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

const profileStorage = {
    _handleFile(req, file, cb) {
        const ext = file.originalname.split('.').pop().toLowerCase();
        if (!ALLOWED_FORMATS.includes(ext)) {
            return cb(
                Object.assign(new Error(`Invalid format. Allowed: ${ALLOWED_FORMATS.join(', ')}`), {
                    statusCode: 400,
                })
            );
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: PROFILE_FOLDER,
                resource_type: 'image',
                transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
                use_filename: false,
                unique_filename: true,
            },
            (error, result) => {
                if (error) return cb(error);
                file.path = result.secure_url;
                file.filename = result.public_id;
                cb(null, { path: result.secure_url, filename: result.public_id, size: result.bytes });
            }
        );

        if (file.stream) {
            file.stream.pipe(uploadStream);
        } else {
            uploadStream.end(file.buffer);
        }
    },

    _removeFile(_req, file, cb) {
        if (file.filename) {
            cloudinary.uploader.destroy(file.filename, { resource_type: 'image' }, cb);
        } else {
            cb(null);
        }
    },
};

const profileUpload = multer({
    storage: profileStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter(_req, file, cb) {
        const ext = file.originalname.split('.').pop().toLowerCase();
        if (!ALLOWED_FORMATS.includes(ext)) {
            return cb(
                Object.assign(new Error(`Invalid format. Allowed: ${ALLOWED_FORMATS.join(', ')}`), {
                    statusCode: 400,
                })
            );
        }
        cb(null, true);
    },
});

export default profileUpload;
