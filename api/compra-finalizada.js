const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();  // Carregar variáveis de ambiente do arquivo .env

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    console.log('Recebendo requisição da Hotmart');
    console.log('Corpo da requisição:', req.body); // Log para verificar todos os dados recebidos

    const { email, status } = req.body.data ? req.body.data.buyer : {};  // Acessando os dados corretamente

    if (!email || !status) {
      console.error('Parâmetros obrigatórios ausentes: email ou status');
      return res.status(400).send('Parâmetros obrigatórios ausentes');
    }

    console.log('E-mail:', email);
    console.log('Status da compra:', status);

    if (status === 'APPROVED') {
      try {
        // Tente atualizar o status do lead para "comprado"
        const { data, error } = await supabase
          .from('leads')
          .update({ status: 'comprado' })
          .eq('email', email);

        if (error) {
          console.error('Erro ao atualizar status no Supabase:', error);
          return res.status(500).send('Erro ao atualizar o status da compra');
        }

        console.log('Compra confirmada e status atualizado no Supabase');
        return res.status(200).send('Compra confirmada e status atualizado!');
      } catch (error) {
        console.error('Erro ao processar a compra:', error);
        return res.status(500).send('Erro ao processar a compra');
      }
    } else {
      console.error('Compra não aprovada:', status);
      return res.status(400).send('Compra não aprovada');
    }
  } else {
    console.error('Método não permitido:', req.method);  // Log para diagnósticos
    return res.status(405).send('Método não permitido');
  }
};
