import { rest } from 'msw';

export const handlers = [
    rest.post('https://api.telebirr.et/v1/payments', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                ussd_string: `*127*1*${req.body.amount}*${req.body.customer_phone}#`,
                transaction_id: `MOCK-${Date.now()}`,
                message: 'Development mock - Dial USSD to simulate payment'
            })
        );
    })
];