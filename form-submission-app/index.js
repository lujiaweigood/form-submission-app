const fs = require('fs');
const { google } = require('googleapis');
const formidable = require('formidable');


// Configure the Google Drive API credentials
const credentials = {
  client_id: 'YOUR_CLIENT_ID',
  client_secret: 'YOUR_CLIENT_SECRET',
  redirect_uri: 'YOUR_REDIRECT_URI',
};

// Create an OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  credentials.redirect_uri
);

// Scopes required for accessing Google Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Generate an authentication URL
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

// Handle the form submission
function handleFormSubmission(req, res) {
  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      res.status(500).send('Error parsing form');
      return;
    }

    try {
      // Authorize the client
      const tokens = await oAuth2Client.getToken(fields.code);
      oAuth2Client.setCredentials(tokens.tokens);

      // Upload the form data to Google Drive
      await uploadFormDataToDrive(fields, files);

      res.status(200).send('Form data submitted successfully');
    } catch (error) {
      console.error('Error submitting form data:', error);
      res.status(500).send('Error submitting form data');
    }
  });
}

// Upload form data to Google Drive
async function uploadFormDataToDrive(fields, files) {
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  // Create a TXT file with form data
  const formData = Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  const txtFile = await createDriveFile(drive, 'form_data.txt', 'text/plain', formData);

  // Upload pictures as PNG files
  const pictures = Object.values(files)
    .filter(file => file.type === 'image/png');
  const pngFiles = await Promise.all(
    pictures.map(file => createDriveFile(drive, file.name, file.type, fs.readFileSync(file.path)))
  );

  console.log('Form data uploaded to Google Drive:');
  console.log('- TXT file:', txtFile);
  console.log('- PNG files:', pngFiles);
}

// Create a file in Google Drive
async function createDriveFile(drive, name, mimeType, data) {
  const media = {
    mimeType,
    body: data,
  };
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType,
    },
    media,
  });

  return res.data;
}

// Usage example
const express = require('express');
const app = express();
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.post('/submit-form', handleFormSubmission);

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
  console.log('Authorize the app by visiting:', authUrl);
});

