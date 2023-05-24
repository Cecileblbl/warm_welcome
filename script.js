const { google } = require("googleapis");
const fs = require("fs");
const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];
const CREDENTIALS_FOLDER = "./";
/* GLOBAL VARIABLES*/
let credentials, authUrl;


// ----------  OAUTH2 CLIENT ----------------
// Credentials files is open and validated
try {
  const files = fs.readdirSync(CREDENTIALS_FOLDER);
  const credentialsFile = files.find(
    (file) => file.startsWith("client_secret_") && file.endsWith(".json")
  );

  if (!credentialsFile) throw new Error("credentials file not found");

  const credentialsPath = CREDENTIALS_FOLDER + credentialsFile;
  const file = fs.readFileSync(credentialsPath);
  credentials = JSON.parse(file);
} catch (error) {
  console.log("unable to read file");
}
const REQUIRED_CREDENTIALS_PROPERTIES = [
  "client_id",
  "project_id",
  "auth_uri",
  "auth_provider_x509_cert_url",
  "token_uri",
  "client_secret",
  "redirect_uris",
];
if (credentials && credentials.installed)
  Object.keys(credentials.installed).forEach((key) => {
    if (!REQUIRED_CREDENTIALS_PROPERTIES.includes(key))
      throw new Error("invalid credentials");
  });

const {
  installed: { client_id, client_secret, redirect_uris },
} = credentials;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// If token exists, use it
authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

// ----------  EXPRESS APPLICATION  ----------------
const express = require("express");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const app = express();
const cookieParser = require("cookie-parser");
const { Base64 } = require("js-base64");

app.use(cookieParser());


app.get('/', (req, res) => {
  if (req.cookies.token) {
    const http = 
    `
    <script> 
    //Recording stuff
let mediaRecorder;
let recordedChunks = [];

function startRecording() {
  recordedChunks = []; // Reset the recorded chunks
  console.log("start recording function triggered")
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    mediaRecorder = new MediaRecorder(stream);
    console.log("audio access activated")

    mediaRecorder.addEventListener("dataavailable", function (event) {
      recordedChunks.push(event.data);
      console.log("recording chunks")
    });

    mediaRecorder.start();
  });
}

function stopRecording() {
  mediaRecorder.stop();
  console.log("stop recording function triggered")
  const audioBlob = new Blob(recordedChunks, { type: "audio/wav" });
  const audioUrl = URL.createObjectURL(audioBlob);

  const audioBlobInput = document.getElementById("audioBlob");
  audioBlobInput.value = audioUrl;
}
</script>
    <button onclick="startRecording()">Start Recording</button>
    <button onclick="stopRecording()">Stop Recording</button>
    <form action="/sendemail" method="post" enctype="multipart/form-data">
      <input type="hidden" name="audioBlob" id="audioBlob" />
      <button type="submit">Send</button>
    </form>`
    res.send(http);
  } else {
    // The user is not authenticated.
    res.send(`<a href="${authUrl}">Authorize Gmail API</a>`);
  }
});
let tokens;
app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  const object_tokens = await oAuth2Client.getToken(code);
  tokens = object_tokens.tokens;
  res.cookie("token", JSON.stringify(tokens), {
    maxAge: 900000,
    httpOnly: true,
    // secure: true // UNCOMMENT THIS FOR HTTPS IN PRODUCTION
  });
  oAuth2Client.setCredentials(tokens);
  res.redirect("/");
});

app.post('/sendemail', upload.none(), async (req, res) => {
  console.log("send email triggered")
  tokens = req.cookies.token;
  const object_tokens = JSON.parse(tokens);

  const audioBlobUrl = req.body.audioBlob;
  console.log("audioBlobUrl:", audioBlobUrl);
  const audioBlob = await fetch(audioBlobUrl).then((response) => response.blob());

  const { 
    originalname,
    mimetype,
  } = req.file;

  const raw = makeBody(
    'thisisfromwarmwelcome@gmail.com', 
    'thisisfromwarmwelcome@gmail.com', 
    'Your subject here', 
    'Your message here', 
    audioBlob,
    originalname,
    mimetype,
  );
  const encodedEmail = Base64.encodeURI(raw);
  oAuth2Client.setCredentials(object_tokens);
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  const { data } = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail
    }
  });

  res.send('success');
}) ;


function notFound(req, res, next) {
  res.status(404);
  const error = new Error("Not Found - " + req.originalUrl);
  next(error);
}

function errorHandler(err, req, res, next) {
  res.status(res.statusCode || 500);
  res.json({
    message: err.message,
    stack: err.stack,
  });
}

app.use(notFound);
app.use(errorHandler);

// gets the localhost IP address
var interfaces = require("os").networkInterfaces(),
  localhostIP;
for (var k in interfaces) {
  for (var k2 in interfaces[k]) {
    let ipFamily = interfaces[k][k2].family;
    if (
      ipFamily === "IPv4" ||
      (ipFamily === 4 && !interfaces[k][k2].internal)
    ) {
      localhostIP = interfaces[k][k2].address;
    }
  }
}

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Listening on http://${localhostIP}:${port}`);
});

function makeBody(to, from, subject, message, filePath, filename, mimetype) {
  const boundary = "foo_bar_baz";
  let mail = [
    "MIME-Version: 1.0",
    "To: " + to,
    "From: " + from,
    "Subject: " + subject,
    "Content-Type: multipart/mixed; boundary=" + boundary,
    "",
    "--" + boundary,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    message,
    "",
    "--" + boundary,
    "Content-Type: " + mimetype,
    "Content-Transfer-Encoding: base64",
    "Content-Disposition: attachment; filename=" + filename,
    "",
    fs.readFileSync(filePath, { encoding: "base64" }),
    "",
    "--" + boundary + "--",
    "",
  ].join("\r\n");

  return mail;
}
