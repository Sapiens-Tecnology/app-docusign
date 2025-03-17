require('dotenv/config');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const DsJwtAuth = require('./DSJwtAuth');
const docusignRouter = require('./router/docusign')
const app = express();
const PORT = process.env.PORT || 8080;
;

app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: '*',
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  req.dsAuth = new DsJwtAuth(req);
  next();
});

app.use(docusignRouter);

const server = (
  app.listen(PORT, () => {
    console.log(`dev running at ${PORT} 🔥`);
  })
)

module.exports = server;
