const { MercadoPagoConfig, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'SEU_ACCESS_TOKEN_AQUI',
  options: { timeout: 5000 }
});

const payment = new Payment(client);

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { token, issuer_id, payment_method_id, transaction_amount, installments, payer } = req.body;

        const body = {
            transaction_amount: Number(transaction_amount),
            token,
            description: 'Compra QB Oficial — Luxury Tech Eyewear',
            installments: Number(installments),
            payment_method_id,
            issuer_id,
            payer: {
                email: payer.email,
                identification: {
                    type: payer.identification.type,
                    number: payer.identification.number
                }
            }
        };

        const result = await payment.create({ body });
        
        res.status(201).json({
            id: result.id,
            status: result.status,
            status_detail: result.status_detail
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar o pagamento no servidor.' });
    }
};
