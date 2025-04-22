const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();  // Carregar variáveis de ambiente do arquivo .env

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  console.log("Recebendo requisição da InLead");

  if (req.method === 'POST') {
    console.log('Corpo da requisição:', req.body);

    // Extraindo o e-mail da requisição
    const email = req.body['email'];  // Pegando o e-mail corretamente

    if (!email) {
      console.error('Erro: E-mail não fornecido');
      return res.status(400).send('E-mail não fornecido');
    }

    try {
      console.log('Verificando e-mail no Supabase:', email);

      // Salvar o e-mail no Supabase com status 'iniciado'
      console.log('Salvando e-mail no Supabase:', email);
      const { data, error } = await supabase
        .from('leads')
        .insert([{ email, status: 'iniciado', data_captura: new Date() }]);

      if (error) {
        console.error('Erro ao salvar e-mail no Supabase:', error);
        return res.status(500).send('Erro ao salvar e-mail no banco');
      }

      console.log('E-mail salvo com sucesso:', email);

      // Enviar o primeiro e-mail de recuperação imediatamente após o registro
      await enviarEmailsDeRecuperacao(email);

      return res.status(200).send('E-mail salvo com sucesso!');
    } catch (error) {
      console.error('Erro inesperado:', error);
      return res.status(500).send('Erro inesperado ao salvar o e-mail');
    }
  } else {
    console.error('Método não permitido:', req.method);
    return res.status(405).send('Método não permitido');
  }
};

// Função para enviar os e-mails de recuperação
async function enviarEmailsDeRecuperacao(email) {
  try {
    console.log(`Enviando e-mails de recuperação para: ${email}`);

    // Enviar o primeiro e-mail de recuperação
    await axios.post('https://api.resend.com/send', {
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      data: {
        to: email,
        subject: 'Você esqueceu algo no seu carrinho!',
        body: 'Oi, você ainda tem um item esperando por você! Não deixe para depois!',
        from: 'noreply@pedagoteca.io',  // Remetente configurado
      }
    });

    // Enviar o segundo e-mail com intervalo de 1 dia
    setTimeout(async () => {
      await axios.post('https://api.resend.com/send', {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        data: {
          to: email,
          subject: 'Ainda está de olho no produto?',
          body: 'Seu carrinho está esperando! Aproveite antes que acabe.',
          from: 'noreply@pedagoteca.io',  // Remetente configurado
        }
      });
    }, 24 * 60 * 60 * 1000); // Enviar 1 dia depois

    // Enviar o terceiro e-mail com intervalo de 3 dias
    setTimeout(async () => {
      await axios.post('https://api.resend.com/send', {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        data: {
          to: email,
          subject: 'Última chance para garantir seu produto!',
          body: 'Não perca! Finalize sua compra agora e receba um desconto exclusivo.',
          from: 'noreply@pedagoteca.io',  // Remetente configurado
        }
      });
    }, 3 * 24 * 60 * 60 * 1000); // Enviar 3 dias depois

  } catch (error) {
    console.error('Erro ao enviar e-mail de recuperação:', error);
  }
}
