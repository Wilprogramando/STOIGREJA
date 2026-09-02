import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { alteracoesPendentes, sincronizarPendentes } from '../services/db';

/**
 * Faixa de aviso mostrada quando a internet cai ou quando existem
 * alterações feitas offline esperando para subir para a nuvem.
 */
export const StatusConexao: React.FC = () => {
  const [online, setOnline] = useState(navigator.onLine);
  const [pendentes, setPendentes] = useState(alteracoesPendentes());
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    const atualizarPendentes = () => setPendentes(alteracoesPendentes());

    const ficouOnline = () => {
      setOnline(true);
      atualizarPendentes();
    };
    const ficouOffline = () => setOnline(false);

    window.addEventListener('online', ficouOnline);
    window.addEventListener('offline', ficouOffline);
    window.addEventListener('repertorio-sync-mudou', atualizarPendentes);

    const timer = setInterval(atualizarPendentes, 5000);

    return () => {
      window.removeEventListener('online', ficouOnline);
      window.removeEventListener('offline', ficouOffline);
      window.removeEventListener('repertorio-sync-mudou', atualizarPendentes);
      clearInterval(timer);
    };
  }, []);

  const sincronizarAgora = async () => {
    setSincronizando(true);
    try {
      await sincronizarPendentes();
    } finally {
      setPendentes(alteracoesPendentes());
      setSincronizando(false);
    }
  };

  if (online && pendentes === 0) return null;

  if (!online) {
    return (
      <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-sm flex items-center gap-2">
        <WifiOff size={16} />
        <span>
          Sem internet - trabalhando offline.
          {pendentes > 0 && ` ${pendentes} alteração(ões) serão enviadas quando a conexão voltar.`}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-indigo-100 border-b border-indigo-300 text-indigo-900 px-4 py-2 text-sm flex items-center gap-2">
      <RefreshCw size={16} className={sincronizando ? 'animate-spin' : ''} />
      <span>{pendentes} alteração(ões) feita(s) offline ainda não enviada(s).</span>
      <button
        onClick={sincronizarAgora}
        disabled={sincronizando}
        className="ml-auto underline font-medium disabled:opacity-50"
      >
        {sincronizando ? 'Enviando...' : 'Enviar agora'}
      </button>
    </div>
  );
};
