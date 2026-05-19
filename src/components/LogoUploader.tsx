import React, { useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';

interface LogoUploaderProps {
  logoUrl: string | undefined;
  onLogoChange: (base64: string | undefined) => void;
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({ logoUrl, onLogoChange }) => {
  const [preview, setPreview] = useState<string | undefined>(logoUrl);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Por favor, selecione uma imagem PNG, JPG ou JPEG');
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      onLogoChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setPreview(undefined);
    onLogoChange(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-bold text-blue-900 mb-2">📸 Adicionar Logo</h4>
        <p className="text-sm text-blue-800">Selecione uma imagem para usar como logo da sua Igreja.</p>
      </div>

      {preview ? (
        <div className="space-y-3">
          <div className="border-2 border-gray-300 rounded-lg p-4 text-center bg-gray-50">
            <img
              src={preview}
              alt="Logo preview"
              style={{ maxHeight: '150px', maxWidth: '100%', margin: '0 auto' }}
            />
            <p className="text-sm text-gray-600 mt-2">Logo atual</p>
          </div>
          <button
            type="button"
            onClick={handleRemoveLogo}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            Remover Logo
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <Upload size={32} className="text-indigo-600" />
              <span className="font-medium text-gray-700">Clique para selecionar logo</span>
              <span className="text-sm text-gray-500">ou arraste a imagem aqui</span>
              <span className="text-xs text-gray-400 mt-2">PNG, JPG ou JPEG (máx. 2MB)</span>
            </div>
          </label>
        </div>
      )}
    </div>
  );
};
