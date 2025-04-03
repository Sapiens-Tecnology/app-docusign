require('dotenv/config');
const errorMiddleware = require('./middleware/error.middleware');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const auth = require('./middleware/auth.middleware');
const docusignRouter = require('./router/docusign')
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: '*',
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(auth);

app.use(docusignRouter);

app.use(errorMiddleware);

const server = (
  app.listen(PORT, () => {
    console.log(`dev running at ${PORT} 🔥`);
  })
)

module.exports = server;
