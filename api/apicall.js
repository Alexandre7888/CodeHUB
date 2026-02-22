// ============================================
// API DE SINALIZAÇÃO WEBRTC - SEM PACKAGE
// URL: https://seu-app.vercel.app/api
// ============================================

// Banco em memória (dados temporários)
const sinalizacao = {};

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { grupoid, botid, destino } = req.query;

    try {
        // ============================================
        // POST - ENVIAR SINAL WEBRTC
        // ============================================
        if (req.method === 'POST') {
            if (!grupoid || !botid) {
                return res.status(400).json({ 
                    erro: 'grupoid e botid são obrigatórios' 
                });
            }

            const { tipo, dados } = req.body;

            // Criar estrutura
            if (!sinalizacao[grupoid]) sinalizacao[grupoid] = {};
            if (!sinalizacao[grupoid][botid]) {
                sinalizacao[grupoid][botid] = {
                    offer: null,
                    answer: null,
                    candidates: []
                };
            }

            // Salvar conforme tipo
            if (tipo === 'offer') {
                sinalizacao[grupoid][botid].offer = dados;
                console.log(`📞 Offer de ${botid}`);
            }
            else if (tipo === 'answer') {
                if (destino) {
                    if (!sinalizacao[grupoid][destino]) {
                        sinalizacao[grupoid][destino] = {
                            offer: null,
                            answer: null,
                            candidates: []
                        };
                    }
                    sinalizacao[grupoid][destino].answer = dados;
                    console.log(`📞 Answer de ${botid} para ${destino}`);
                }
            }
            else if (tipo === 'candidate') {
                if (destino) {
                    if (!sinalizacao[grupoid][destino]) {
                        sinalizacao[grupoid][destino] = {
                            offer: null,
                            answer: null,
                            candidates: []
                        };
                    }
                    sinalizacao[grupoid][destino].candidates.push(dados);
                } else {
                    sinalizacao[grupoid][botid].candidates.push(dados);
                }
                console.log(`🧊 Candidate de ${botid}`);
            }

            return res.status(200).json({
                sucesso: true,
                mensagem: `Sinal ${tipo} salvo`,
                grupoid,
                botid
            });
        }

        // ============================================
        // GET - PEGAR SINAL WEBRTC
        // ============================================
        if (req.method === 'GET') {
            // Pegar sinal de um bot específico
            if (grupoid && botid) {
                const dados = sinalizacao[grupoid]?.[botid] || {
                    offer: null,
                    answer: null,
                    candidates: []
                };

                // Limpar após pegar (opcional)
                // delete sinalizacao[grupoid]?.[botid];

                return res.status(200).json({
                    grupoid,
                    botid,
                    ...dados
                });
            }

            // Listar todos os grupos
            return res.status(200).json({
                grupos: Object.keys(sinalizacao),
                dados: sinalizacao
            });
        }

        // ============================================
        // PUT - ATUALIZAR LIGAÇÃO
        // ============================================
        if (req.method === 'PUT') {
            if (!grupoid || !botid) {
                return res.status(400).json({ 
                    erro: 'grupoid e botid são obrigatórios' 
                });
            }

            const { status, tipo } = req.body;

            if (!sinalizacao[grupoid]) sinalizacao[grupoid] = {};
            if (!sinalizacao[grupoid][botid]) {
                sinalizacao[grupoid][botid] = {
                    offer: null,
                    answer: null,
                    candidates: []
                };
            }

            sinalizacao[grupoid][botid].status = status || 'em_ligacao';
            sinalizacao[grupoid][botid].tipo = tipo || 'video';
            sinalizacao[grupoid][botid].ultimaAtualizacao = Date.now();

            return res.status(200).json({
                sucesso: true,
                mensagem: 'Ligação atualizada',
                grupoid,
                botid,
                status: sinalizacao[grupoid][botid].status
            });
        }

        // ============================================
        // DELETE - ENCERRAR LIGAÇÃO
        // ============================================
        if (req.method === 'DELETE') {
            if (!grupoid || !botid) {
                return res.status(400).json({ 
                    erro: 'grupoid e botid são obrigatórios' 
                });
            }

            if (sinalizacao[grupoid]?.[botid]) {
                delete sinalizacao[grupoid][botid];
            }

            return res.status(200).json({
                sucesso: true,
                mensagem: 'Ligação encerrada',
                grupoid,
                botid
            });
        }

        return res.status(405).json({ 
            erro: 'Método não permitido' 
        });

    } catch (error) {
        console.error('Erro:', error);
        return res.status(500).json({ 
            erro: 'Erro interno',
            detalhes: error.message 
        });
    }
}