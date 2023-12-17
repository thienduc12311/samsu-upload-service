import AWS from 'aws-sdk';
import bodyParser from 'body-parser';
import cors from 'cors';
import express, { Express } from 'express';
import morgan from 'morgan';
import config from './config';
import { configureRoutes } from './routes';
const puppeteer = require('puppeteer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
// Set up DigitalOcean Spaces configuration
const s3 = new AWS.S3({
    endpoint: process.env.BUCKET_ENDPOINT, // Replace with your Space endpoint
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
});
require('dotenv').config();
const app: Express = express();
const { port } = config;
app.use(cors('*'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const routes = configureRoutes(config);

app.use(morgan('combined'));

app.use('/', routes);
async function generatePDF(htmlContent) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set page size to A4 and landscape orientation
    await page.pdf({
        format: 'A4',
        landscape: true,
        preferCSSPageSize: true,
        printBackground: true
    });

    await page.setContent(htmlContent);

    // Generate PDF as buffer
    const pdfBuffer = await page.pdf({ format: 'A4', landscape: true });

    await browser.close();

    return pdfBuffer;
}
app.post('/generate-participant-certificates', async (req, res) => {
    console.log('haha');
    try {
        const { eventTitle, departmentName, eventDate, participants } = req.body;
        console.log(req.body);
        // Process each participant
        const certificatePromises = participants.map(async (participant) => {
            const certificateData = {
                name: participant.name, // Update with your actual property names
                rollnumber: participant.rollnumber, // Update with your actual property names
                achievement: `Certificate for ${eventTitle}`,
                description: `${departmentName} Department`,
                date: eventDate,
            };

            // Read HTML template file
            const htmlTemplate = fs.readFileSync('certificate_of_ participation.html', 'utf-8');

            // Replace placeholders with actual data
            const filledHTML = htmlTemplate.replace(/{{(.*?)}}/g, (match, p1) => certificateData[p1.trim()] || match);

            // Generate a unique filename for the certificate
            const certificateFilename = `certificate_${uuidv4()}.pdf`;

            // Generate PDF
            const pdfBuffer = await generatePDF(filledHTML);

            // Upload PDF to S3 bucket
            await uploadToS3(pdfBuffer, certificateFilename);

            // Get the public URL of the uploaded file
            const certificateUrl = await getS3ObjectUrl(certificateFilename);

            return {
                rollnumber: participant.rollnumber,
                certificateUrl,
            };
        });

        // Wait for all promises to resolve
        const participantCertificates = await Promise.all(certificatePromises);

        res.json(participantCertificates);
    } catch (error) {
        console.error('Error generating participant certificates:', error);
        res.status(500).send('Internal Server Error');
    }
});
// Function to upload file to S3 bucket
async function uploadToS3(fileBuffer, filename) {
    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: filename,
        Body: fileBuffer,
        ContentType: 'application/pdf',
    };

    await s3.upload(params).promise();
}

// Function to get the public URL of an S3 object
async function getS3ObjectUrl(filename) {
    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: filename,
        Expires: 60 * 60 * 100,
    };

    const signedUrl = await s3.getSignedUrlPromise('getObject', params);

    return signedUrl;
}

app.get('/generate-certificate', async (req, res) => {
    try {
        const certificateData = {
            name: 'John Doe',
            rollnumber: '123456',
            achievement: 'Certificate of Completion',
            description: 'Course Description',
            date: '2023-12-17',
        };

        // Read HTML template file
        const htmlTemplate = fs.readFileSync('certificate_template.html', 'utf-8');

        // Replace placeholders with actual data
        const filledHTML = htmlTemplate.replace(/{{(.*?)}}/g, (match, p1) => certificateData[p1.trim()] || match);

        // Generate PDF
        const pdfBuffer = await generatePDF(filledHTML);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=certificate.pdf');

        // Send the PDF buffer as the response
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/display-certificate', (req, res) => {
    try {
        const certificateData = {
            name: 'John Doe',
            rollnumber: '123456',
            achievement: 'Certificate of Completion',
            description: 'Course Description',
            date: '2023-12-17',
        };

        // Read HTML template file
        const htmlTemplate = fs.readFileSync('certificate_template.html', 'utf-8');

        // Replace placeholders with actual data
        const filledHTML = htmlTemplate.replace(/{{(.*?)}}/g, (match, p1) => certificateData[p1.trim()] || match);

        // Set response headers
        res.setHeader('Content-Type', 'text/html');

        // Send the filled HTML as the response
        res.send(filledHTML);
    } catch (error) {
        console.error('Error reading HTML template:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
