const { MercadoPagoConfig, Preference } = require('mercadopago');

// CONFIGURAÇÃO DO MERCADO PAGO (VOCÊ PREENCHERÁ NO VERCEL)
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || 'SEU_ACCESS_TOKEN_AQUI'
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Método não permitido');

  const { items, payer } = req.body;

  try {
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: items.map(it => ({
          title: it.name,
          unit_price: Number(it.price),
          quantity: Number(it.quantity),
          id: it.id,
          picture_url: it.img
        })),
        payer: {
          email: payer.email,
          name: payer.name
        },
        back_urls: {
          success: `https://${req.headers.host}/index.html`,
          failure: `https://${req.headers.host}/checkout.html`,
          pending: `https://${req.headers.host}/index.html`
        },
        auto_return: "approved",
        payment_methods: {
          excluded_payment_types: [
            { id: "ticket" } // Opcional: Remove boleto se quiser focar em Pix/Cartão
          ],
          installments: 12
        }
      }
    });

    res.status(200).json({ id: result.id, init_point: result.init_point });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
