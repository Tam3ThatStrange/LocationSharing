const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('.'));

let locations = [];

app.post('/update-location', (req, res) => {
    const { latitude, longitude } = req.body;

    locations = [{ latitude, longitude }]; // overwrite for demo

    res.sendStatus(200);
});

app.get('/locations', (req, res) => {
    res.json(locations);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
