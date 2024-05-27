const express = require('express');
const multer = require('multer');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });
let storedData = [];
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    processCSV(filePath);

    res.status(200).json({ message: 'File successfully uploaded' });
})
const processCSV = (filePath) => {
    let totalRows = 0;
    let processedRows = 0;
    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', () => {
            totalRows++;
        })
        .on('end', () => {
            // Process rows in chunks
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    storedData.push(row);
                    processedRows++;
                    const progress = (processedRows / totalRows) * 100;
                    io.emit('progress', { progress: Math.round(progress) });
                })
                .on('end', () => {
                    fs.unlinkSync(filePath); // Remove file after processing
                });
        });
};

app.get('/data', (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const pageSize = 10;
    const offset = page * pageSize;
    const paginatedData = storedData.slice(offset, offset + pageSize);
    const pageCount = Math.ceil(storedData.length / pageSize);
    
    res.json({ rows: paginatedData, pageCount });
});

io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});