const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  // Certifique-se de que o método é POST
  if (req.method === 'POST') {
    const { email, status } = req.body;  // O corpo da requisição vai conter os dados da compra

    if (status === 'APPROVED') {
      try {
        // Atualize o status do lead para "comprado" no Supabase
        await supabase.from('leads').update({ status: 'comprado' }).eq('email', email);
        return res.status(200).send('Compra confirmada e status atualizado!');
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return res.status(500).send('Erro ao atualizar o status da compra');
      }
    } else {
      return res.status(400).send('Compra não aprovada');
    }
  } else {
    // Se o método não for POST, retorne um erro
    return res.status(405).send('Método não permitido');
  }
};
