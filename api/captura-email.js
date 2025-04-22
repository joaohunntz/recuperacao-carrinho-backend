const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();  // Carregar variáveis de ambiente do arquivo .env

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { email } = req.body; // Captura o e-mail enviado pelo InLead (via Webhook)

    try {
      // Verificar se o e-mail já existe no banco (evitar duplicação)
      const { data: existingLead, error: findError } = await supabase
        .from('leads')
        .select('email')
        .eq('email', email)
        .single();

      if (findError) {
        return res.status(500).send('Erro ao verificar e-mail');
      }

      // Se o e-mail já existe, não salvar novamente
      if (existingLead) {
        return res.status(400).send('E-mail já foi capturado');
      }

      // Salvar o e-mail no Supabase
      const { data, error } = await supabase
        .from('leads')
        .insert([{ email, status: 'iniciado', data_captura: new Date() }]);

      if (error) {
        return res.status(500).send('Erro ao salvar e-mail no banco');
      }

      // Iniciar o timer de 20 minutos para verificar se a compra foi feita
      iniciarVerificacaoCompra(email);

      return res.status(200).send('E-mail salvo com sucesso!');
    } catch (error) {
      console.error('Erro inesperado:', error);
      return res.status(500).send('Erro inesperado ao salvar o e-mail');
    }
  } else {
    return res.status(405).send('Método não permitido');
  }
};

// Função para iniciar o processo de verificação de compra
async function iniciarVerificacaoCompra(email) {
  // Timer de 20 minutos (1200 segundos)
  setTimeout(async () => {
    const compraFeita = await verificarCompraHotmart(email);

    if (compraFeita) {
      await supabase.from('leads').update({ status: 'comprado' }).eq('email', email);
    } else {
      await supabase.from('leads').update({ status: 'em recuperação' }).eq('email', email);
      await enviarEmailsDeRecuperacao(email);
    }
  }, 20 * 60 * 1000); // 20 minutos
}

// Função para verificar se a compra foi feita via Hotmart
async function verificarCompraHotmart(email) {
  try {
    const response = await axios.post('https://api.hotmart.com/v2/purchase-status', {
      email: email,
    });

    return response.data.status === 'approved';  // Retorna true se a compra for aprovada
  } catch (error) {
    console.error('Erro ao verificar compra:', error);
    return false;
  }
}

// Função para enviar os e-mails de recuperação
async function enviarEmailsDeRecuperacao(email) {
  try {
    // Enviar o primeiro e-mail de recuperação
    await axios.post('https://api.resend.com/send', {
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,  // Usando a chave de API do Resend
      },
      data: {
        to: email,
        subject: 'Você esqueceu algo no seu carrinho!',
        body: 'Oi, você ainda tem um item esperando por você! Não deixe para depois!',
        from: 'noreply@pedagoteca.io',  // Remetente configurado
      }
    });

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
    console.error('Erro ao enviar e-mail:', error);
  }
}
