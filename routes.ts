// routes.ts
import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3';
import { S3 } from 'aws-sdk'; // Import the AWS SDK

import { Router } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
    const s3Bucket = new S3({
        endpoint: config.bucketEndpoint,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
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
    // Add a new route to request a presigned URL for uploading to Digital Ocean
    router.get('/presigned-url', checkCredentialsMiddleware(config), (req, res) => {
        // Generate a unique filename for the object
        const contentName = req.query.filename as string;
        const isImage = /\.(jpg|jpeg|png|gif)$/i.test(contentName as string);
        const uniqueFilename = uuidv4();
        const expirationInSeconds = Number(process.env.PRESIGNED_URL_EXPIRATION_TIME) || 120; // 2min

        const params = {
            Bucket: config.bucketName,
            Expires: expirationInSeconds, // Pre-signed POST request expiration time (1 hour)
            Fields: {
                key: `assets/${uniqueFilename}_${(contentName as string).replace(/\s/g, "")}`,
                acl: 'public-read', // Set ACL as needed
                'Content-Type': isImage ? `image/${contentName.substring(contentName.lastIndexOf('.') + 1)}` : 'multipart/form-data', // Set content type as needed
            },
            Conditions: [],
        };

        const preSignedPost = s3Bucket.createPresignedPost(params);
        res.json(preSignedPost);
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
