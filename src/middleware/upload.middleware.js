import multer from 'multer';
import { Readable } from 'stream';
import cloudinary from '../config/cloudinary.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'pdf', 'mp4'];

/**
 * Custom Multer storage engine that streams files directly to Cloudinary.
 * Compatible with Cloudinary SDK v2.
 */
const cloudinaryStorage = {
    _handleFile(req, file, cb) {
        // Determine target folder using caseNumber (set by route handler after case lookup)
        // caseNumber is attached to req by the evidence service pre-flight, or we use caseId as fallback
        const caseFolder = req.caseFolder || req.params.caseId || 'unknown';
        const folder = `human-rights-evidence/${caseFolder}`;

        // Validate file format
        const ext = file.originalname.split('.').pop().toLowerCase();
        if (!ALLOWED_FORMATS.includes(ext)) {
            return cb(
                Object.assign(new Error(`Invalid file format. Allowed: ${ALLOWED_FORMATS.join(', ')}`), {
                    statusCode: 400,
                })
            );
        }

        // Stream file buffer to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto',
                use_filename: true,
                unique_filename: true,
            },
            (error, result) => {
                if (error) {
                    return cb(error);
                }
                // Attach Cloudinary result to file object (multer convention)
                file.path = result.secure_url;     // fileUrl
                file.filename = result.public_id;  // publicId
                file.cloudinaryResult = result;

                cb(null, {
                    path: result.secure_url,
                    filename: result.public_id,
                    size: result.bytes,
                });
            }
        );

        // Pipe multer's in-memory buffer into the upload stream
        const stream = Readable.from(file.stream || []);

        // multer v2+ exposes req, file stream differently; use buffer approach
        // We need the file buffer, which memoryStorage provides
        // Here we pipe file.stream if available (disk/memory), else handled below
        if (file.stream) {
            file.stream.pipe(uploadStream);
        } else {
            uploadStream.end(file.buffer);
        }
    },

    _removeFile(_req, file, cb) {
        // Delete from Cloudinary if something goes wrong after upload
        if (file.filename) {
            cloudinary.uploader.destroy(file.filename, { resource_type: 'auto' }, cb);
        } else {
            cb(null);
        }
    },
};

/**
 * Multer instance configured with:
 * - Custom Cloudinary storage engine
 * - 10MB file size limit
 * - Single file field: 'file'
 */
const upload = multer({
    storage: cloudinaryStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter(_req, file, cb) {
        const ext = file.originalname.split('.').pop().toLowerCase();
        if (!ALLOWED_FORMATS.includes(ext)) {
            return cb(
                Object.assign(new Error(`Invalid file format. Allowed: ${ALLOWED_FORMATS.join(', ')}`), {
                    statusCode: 400,
                })
            );
        }
        cb(null, true);
    },
});

export default upload;
