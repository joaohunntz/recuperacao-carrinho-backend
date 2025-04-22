import React, { useState } from 'react';
import axios from 'axios';

const CapturaEmailForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      // Envia o e-mail para o backend
      const response = await axios.post('https://seu-backend.vercel.app/captura-email', { email });

      if (response.status === 200) {
        setMessage('E-mail capturado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao capturar e-mail:', error);
      setMessage('Houve um erro ao capturar seu e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Recupere seu carrinho!</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Digite seu e-mail:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
};

export default CapturaEmailForm;
