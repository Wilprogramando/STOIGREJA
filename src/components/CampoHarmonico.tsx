import React, { useState } from 'react';

export const CampoHarmonico = () => {
  const campos = {
    C: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°'],
    D: ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#°'],
    E: ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#°'],
    F: ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'E°'],
    G: ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#°'],
    A: ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#°'],
    B: ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#°'],
  };

  const [tomSelecionado, setTomSelecionado] = useState('C');

  const graus = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        🎹 Campo Harmônico
      </h2>

      {/* MOBILE */}
      <div className="block lg:hidden">
        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Selecione o Tom
          </label>

          <select
            value={tomSelecionado}
            onChange={(e) => setTomSelecionado(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {Object.keys(campos).map((tom) => (
              <option key={tom} value={tom}>
                Tom de {tom}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-indigo-600 text-white p-4">
            <h3 className="text-xl font-bold">
              Tom de {tomSelecionado}
            </h3>
          </div>

          <div className="p-4">
            {graus.map((grau, index) => (
              <div
                key={grau}
                className="flex justify-between items-center py-3 border-b last:border-b-0"
              >
                <span className="font-semibold text-gray-700">
                  {grau}
                </span>

                <span className="text-lg font-bold text-indigo-600">
                  {campos[tomSelecionado as keyof typeof campos][index]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-indigo-600 text-white">
            <tr>
              <th className="p-3">Tom</th>
              <th className="p-3">I</th>
              <th className="p-3">II</th>
              <th className="p-3">III</th>
              <th className="p-3">IV</th>
              <th className="p-3">V</th>
              <th className="p-3">VI</th>
              <th className="p-3">VII</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(campos).map(([tom, acordes]) => (
              <tr
                key={tom}
                className="border-b hover:bg-gray-50"
              >
                <td className="p-3 font-bold text-indigo-600">
                  {tom}
                </td>

                {acordes.map((acorde, index) => (
                  <td key={index} className="p-3 text-center">
                    {acorde}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Progressões */}
      <div className="mt-6 bg-indigo-50 rounded-xl p-5">
        <h3 className="font-bold text-lg mb-4">
          🎵 Progressões mais usadas
        </h3>

        <div className="grid gap-3">
          <div className="bg-white rounded-lg p-3 shadow-sm font-medium">
            I - V - vi - IV
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm font-medium">
            I - IV - V
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm font-medium">
            vi - IV - I - V
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm font-medium">
            I - vi - IV - V
          </div>
        </div>
      </div>
    </div>
  );
};
