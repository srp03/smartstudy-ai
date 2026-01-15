import express from 'express';
import multer from 'multer';
import { google } from 'googleapis';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// Load service account credentials
const SERVICE_ACCOUNT = JSON.parse(
  fs.readFileSync('./service-account.json', 'utf8')
);

const DRIVE_FOLDER_ID = "1hwjnawvbkomdWPZf_59cWlTk1qQ_8miG"; // YOUR Drive Folder ID

const auth = new google.auth.GoogleAuth({
  credentials: SERVICE_ACCOUNT,
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

// Upload file endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { originalname, buffer, mimetype } = req.file;

    const response = await drive.files.create({
      requestBody: {
        name: originalname,
        parents: [DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: mimetype,
        body: buffer
      }
    });

    // Make file public
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const downloadURL = `https://drive.google.com/uc?id=${response.data.id}&export=download`;

    res.status(200).json({ success: true, downloadURL });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

app.listen(3000, () => console.log('Drive upload server running on port 3000'));

