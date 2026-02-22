// ============================================
// API PARA LIGAÇÕES WEBRTC
// URL: https://seu-site.vercel.app/api/ligacao
// ============================================

const sinalizacao = {};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { sala, botid } = req.query;

    try {
        if (req.method === 'POST') {
            if (!sala || !botid) {
                return res.status(400).json({ erro: 'sala e botid são obrigatórios' });
            }

            const { tipo, dados, destino } = req.body;

            if (!sinalizacao[sala]) sinalizacao[sala] = {};
            if (!sinalizacao[sala][botid]) {
                sinalizacao[sala][botid] = { offer: null, answer: null, candidates: [] };
            }

            if (tipo === 'offer') {
                sinalizacao[sala][botid].offer = dados;
            }
            else if (tipo === 'answer') {
                if (destino && sinalizacao[sala][destino]) {
                    sinalizacao[sala][destino].answer = dados;
                }
            }
            else if (tipo === 'candidate') {
                if (destino && sinalizacao[sala][destino]) {
                    if (!sinalizacao[sala][destino].candidates) {
                        sinalizacao[sala][destino].candidates = [];
                    }
                    sinalizacao[sala][destino].candidates.push(dados);
                }
            }

            return res.status(200).json({ sucesso: true });
        }

        if (req.method === 'GET') {
            if (!sala || !botid) {
                return res.status(400).json({ erro: 'sala e botid são obrigatórios' });
            }

            const dados = sinalizacao[sala]?.[botid] || {
                offer: null,
                answer: null,
                candidates: []
            };

            return res.status(200).json(dados);
        }

        if (req.method === 'DELETE') {
            if (sinalizacao[sala]?.[botid]) {
                delete sinalizacao[sala][botid];
            }
            return res.status(200).json({ sucesso: true });
        }

        return res.status(405).json({ erro: 'Método não permitido' });

    } catch (error) {
        return res.status(500).json({ erro: error.message });
    }
}