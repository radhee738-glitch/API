require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const loanRoutes = require('./routes/loans');
const ticketRoutes = require('./routes/tickets');
const securityRoutes = require('./routes/security');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const otpRoutes = require('./routes/otp');
const swaggerUi = require('swagger-ui-express');
const { audit } = require('./middleware/auth');
const swaggerSpec = require('./swagger');

const app = express();
app.use(cors());
app.use(express.json());
app.use(audit);

app.use(
  '/api/docs',
  swaggerUi.serveFiles(swaggerSpec, {
    swaggerOptions: {
      url: '/api/docs/swagger.json'
    }
  }),
  swaggerUi.setup(null, {
    swaggerOptions: {
      url: '/api/docs/swagger.json'
    }
  })
);
app.get('/api/docs/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/otp', otpRoutes);

app.get('/', (req, res) => {
  return res.json({ service: 'banking-api', status: 'ready' });
});

app.use((req, res) => {
  return res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Banking API listening on port ${port}`);
});
