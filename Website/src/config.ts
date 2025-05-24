import dotenv from 'dotenv';

dotenv.config();

export const config = {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
    port: process.env.PORT,
    jwtSecret: process.env.JWT_SECRET,
    mongoUri: process.env.MONGO_URI,
    dbName: process.env.DB_NAME
};

// Validate required environment variables
const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLIC_KEY',
    'JWT_SECRET',
    'MONGO_URI',
    'DB_NAME'
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}