// routes.ts
import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3';
import { Router } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { AppConfig } from './config';
import { checkCredentialsMiddleware } from './middleware';

export function configureRoutes(config: AppConfig) {
    const router = Router();
    const s3 = new S3Client({
        endpoint: config.bucketEndpoint,
        region: config.bucketRegion,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });

    const isValidFile = (file: Express.Multer.File) => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.doc', '.docx', '.pdf'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        return allowedExtensions.includes(fileExtension);
    };

    const upload = multer({
        storage: multerS3({
            s3,
            bucket: config.bucketName,
            acl: 'public-read',
            key: (req, file, cb) => {
                const prefix = (req as any).query.pathPrefix || ''; // Get the prefix from the request query parameters
                const uploadPath = path.join('attachments', prefix, file.originalname);
                cb(null, uploadPath);
            },
        }),
        fileFilter: (req, file, cb) => {
            if (isValidFile(file)) {
                cb(null, true);
            } else {
                cb(new Error('Invalid file type. Only images (jpg, jpeg, png) and documents (doc, docx, pdf) are allowed.'));
            }
        },
    });

    router.get('/', checkCredentialsMiddleware(config), (req, res) => {
        res.send('SAMSU upload service');
    });

    router.post('/upload', checkCredentialsMiddleware(config), upload.array('files', config.maximumFilesAllowed), (req, res) => {
        const fileLocations = (req.files as Express.Multer.File[]).map((file) => (file as any).location);
        res.json({ message: 'Files uploaded successfully', locations: fileLocations });
    });

    router.delete('/delete-files', checkCredentialsMiddleware(config), async (req, res) => {
        const fileKeys = req.body.fileKeys;

        if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
            return res.status(400).json({ error: 'Invalid or empty fileKeys array.' });
        }

        const params = {
            Bucket: config.bucketName,
            Delete: {
                Objects: fileKeys.map((key) => ({ Key: key })),
            },
        };

        try {
            await s3.send(new DeleteObjectsCommand(params));
            res.json({ message: 'Files deleted successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete files' });
        }
    });

    return router;
}
