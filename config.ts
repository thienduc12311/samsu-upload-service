// config.ts
require('dotenv').config();
export interface AppConfig {
    port: string;
    maximumFilesAllowed: number;
    bucketName: string;
    bucketEndpoint: string;
    bucketRegion: string;
    accessKeyId: string;
    secretAccessKey: string;
    backendApi: string;
    backendSecret: string;
}

const config: AppConfig = {
    port: process.env.PORT || '3001',
    maximumFilesAllowed: 10,
    bucketName: process.env.BUCKET_NAME || 'samsu',
    bucketEndpoint: process.env.BUCKET_ENDPOINT || 'https://sgp1.digitaloceanspaces.com',
    bucketRegion: process.env.BUCKET_REGION || 'ap-southeast-1',
    accessKeyId: process.env.ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SECRET_ACCESS_KEY || '',
    backendApi: process.env.BACKEND_API || 'https://api.samsu-fpt.software/api/auth/validateToken',
    backendSecret: process.env.BACKEND_SECRET || '',
};

export default config;
