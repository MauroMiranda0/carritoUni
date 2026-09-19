require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PAYPAL_API = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

async function getAccessToken() {
  const { data } = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      auth: {
        username: process.env.PAYPAL_CLIENT_ID,
        password: process.env.PAYPAL_CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  return data.access_token;
}

app.post('/api/orders', async (req, res) => {
  try {
    const { cart } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    const items = cart.map((item) => {
      const price = parseFloat(String(item.precio).replace(/[^0-9.]/g, ''));
      const unitValue = (Number.isFinite(price) && price > 0 ? price : 15).toFixed(2);
      return {
        name: item.titulo || 'Curso',
        unit_amount: {
          currency_code: 'USD',
          value: unitValue,
        },
        quantity: String(item.cantidad),
      };
    });

    const totalValue = items
      .reduce((sum, item) => sum + parseFloat(item.unit_amount.value) * parseInt(item.quantity, 10), 0)
      .toFixed(2);

    const accessToken = await getAccessToken();

    const { data } = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: 'purchase_1',
            amount: {
              currency_code: 'USD',
              value: totalValue,
              breakdown: {
                item_total: {
                  currency_code: 'USD',
                  value: totalValue,
                },
              },
            },
            items,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({ id: data.id });
  } catch (error) {
    console.error('Error creando la orden:', error.response?.data || error.message);
    res.status(500).json(error.response?.data || { error: 'No se pudo crear la orden' });
  }
});

app.post('/api/orders/:orderID/capture', async (req, res) => {
  try {
    const { orderID } = req.params;
    const accessToken = await getAccessToken();

    const { data } = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json(data);
  } catch (error) {
    console.error('Error capturando la orden:', error.response?.data || error.message);
    res.status(500).json(error.response?.data || { error: 'No se pudo capturar la orden' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});