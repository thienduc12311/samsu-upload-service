// middleware.ts
import axios from 'axios';
import { NextFunction, Request, Response } from 'express';
import { AppConfig } from './config';

export function checkCredentialsMiddleware(config: AppConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const bearerToken = req.headers.authorization;

        if (!bearerToken || !bearerToken.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Bearer token in the request header' });
        }

        const token = bearerToken.replace('Bearer ', '');

        try {
            const response = await axios.get(config.backendApi, {
                headers: {
                    Authorization: bearerToken,
                },
                data: config.backendSecret
            });

            if (response.status === 200) {
                next();
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (error) {
            console.error('Error checking credentials:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
