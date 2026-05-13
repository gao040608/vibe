require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PORT } = require('./config');
const chatRouter = require('./routes/chat');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', chatRouter);

app.listen(PORT, () => {
  console.log(`VibeCoding backend running on http://localhost:${PORT}`);
});

