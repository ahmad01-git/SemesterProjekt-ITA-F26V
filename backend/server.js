const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server virker!');
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server kører på http://localhost:${PORT}`);
});