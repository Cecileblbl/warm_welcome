const { google } = require('googleapis');
const express = require('express');
const multer = require('multer');
const keys = require('C:\\Users\\Cecib\\Desktop\\finalproject\\Website\\api\\id.json')

const app = express();
const upload = multer();

// Configure OAuth2 credentials
const oauth2Client = new google.auth.OAuth2(
  keys.client_id,
  keys.client_secret,
  keys.auth_uri
);

// Generate the URL for user consent
const scopes = ['https://www.googleapis.com/auth/gmail.send'];
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

// Handle the OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  // Continue with sending the email or store the tokens for later use

  res.redirect('/');
});

app.post('/send-email', upload.single('audio'), async (req, res) => {
  const { buffer, originalname } = req.file;

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const encodedEmail = Buffer.from(buffer).toString('base64');

  const message = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });

  console.log('Message sent:', message.data);

  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send(`<a href="${authUrl}">Authorize Gmail API</a>`);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
