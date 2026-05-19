import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface DeletePasswordModalProps {
  hinoNome: string;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export const DeletePasswordModal: React.FC<DeletePasswordModalProps> = ({
  hinoNome,
  onConfirm,
  onCancel
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!password) {
      setError('Digite a senha');
      return;
    }

    if (password === '523297') {
      onConfirm(password);
      setPassword('');
      setError('');
    } else {
      setError('Senha incorreta!');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle size={24} className="text-red-600" />
          <h2 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h2>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-900 mb-2">
            <strong>Você está prestes a deletar:</strong>
          </p>
          <p className="text-sm text-red-700 font-medium">
            {hinoNome}
          </p>
          <p className="text-xs text-red-600 mt-3">
            Esta ação é irreversível. Digite a senha para confirmar.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium text-gray-700">
            Senha de Segurança
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSubmit();
              }
            }}
            placeholder="Digite a senha"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            Deletar
          </button>
        </div>
      </div>
    </div>
  );
};
