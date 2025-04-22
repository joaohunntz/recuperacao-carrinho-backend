const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();  // Carregar variáveis de ambiente do arquivo .env

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  console.log("Recebendo requisição da InLead");

  if (req.method === 'POST') {
    console.log('Corpo da requisição:', req.body);

    // Extraindo o e-mail da requisição (presumido que é 'email' ou 'Jg3rc4')
    const email = req.body['email'];  // Pegando o e-mail corretamente

    if (!email) {
      console.error('Erro: E-mail não fornecido');
      return res.status(400).send('E-mail não fornecido');
    }

    try {
      console.log('Verificando e-mail no Supabase:', email);
      // Verificar se o e-mail já existe no banco (evitar duplicação)
      const { data: existingLead, error: findError } = await supabase
        .from('leads')
        .select('email')
        .eq('email', email)
        .single();  // Usar .single() para garantir que retorne apenas um único resultado

      if (findError && findError.code !== 'PGRST116') {
        console.error('Erro ao verificar e-mail no Supabase:', findError);
        return res.status(500).send('Erro ao verificar e-mail');
      }

      if (existingLead) {
        console.log('E-mail já existe:', email);
        return res.status(400).send('E-mail já foi capturado');
      }

      // Salvar o e-mail no Supabase
      console.log('Salvando e-mail no Supabase:', email);
      const { data, error } = await supabase
        .from('leads')
        .insert([{ email, status: 'iniciado', data_captura: new Date() }]);

      if (error) {
        console.error('Erro ao salvar e-mail no Supabase:', error);
        return res.status(500).send('Erro ao salvar e-mail no banco');
      }

      console.log('E-mail salvo com sucesso:', email);
      iniciarVerificacaoCompra(email);

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

// Função para iniciar o processo de verificação de compra
async function iniciarVerificacaoCompra(email) {
  console.log(`Iniciando verificação de compra para o e-mail: ${email}`);

  setTimeout(async () => {
    console.log(`Verificando compra para o e-mail: ${email}`);
    const compraFeita = await verificarCompraHotmart(email);

    if (compraFeita) {
      console.log('Compra confirmada, atualizando status para "comprado"');
      await supabase.from('leads').update({ status: 'comprado' }).eq('email', email);
    } else {
      console.log('Compra não realizada, atualizando status para "em recuperação"');
      await supabase.from('leads').update({ status: 'em recuperação' }).eq('email', email);
      await enviarEmailsDeRecuperacao(email);
    }
  }, 30 * 1000); // 30 segundos para teste
}

// Função para verificar se a compra foi feita via Hotmart
async function verificarCompraHotmart(email) {
  try {
    console.log(`Verificando compra para o e-mail: ${email} na Hotmart`);
    const response = await axios.post('https://api.hotmart.com/v2/purchase-status', {
      email: email,
    });

    return response.data.status === 'approved';  // Retorna true se a compra for aprovada
  } catch (error) {
    console.error('Erro ao verificar compra na Hotmart:', error);
    return false;
  }
}

// Função para enviar os e-mails de recuperação
async function enviarEmailsDeRecuperacao(email) {
  try {
    console.log(`Enviando e-mails de recuperação para: ${email}`);

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
    console.error('Erro ao enviar e-mail de recuperação:', error);
  }
}
