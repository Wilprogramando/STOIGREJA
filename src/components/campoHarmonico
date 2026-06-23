import React from 'react';

export const CampoHarmonico = () => {
  const campos = [
    { tom: 'C', acordes: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°'] },
    { tom: 'D', acordes: ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#°'] },
    { tom: 'E', acordes: ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#°'] },
    { tom: 'F', acordes: ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'E°'] },
    { tom: 'G', acordes: ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#°'] },
    { tom: 'A', acordes: ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#°'] },
    { tom: 'B', acordes: ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#°'] }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        🎹 Campo Harmônico
      </h2>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
            {campos.map((campo) => (
              <tr
                key={campo.tom}
                className="border-b hover:bg-gray-50"
              >
                <td className="p-3 font-bold text-indigo-600">
                  {campo.tom}
                </td>

                {campo.acordes.map((acorde, index) => (
                  <td key={index} className="p-3 text-center">
                    {acorde}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-indigo-50 rounded-lg p-5">
        <h3 className="font-bold text-lg mb-3">
          Progressões mais usadas
        </h3>

        <ul className="space-y-2">
          <li>🎵 I - V - vi - IV</li>
          <li>🎵 I - IV - V</li>
          <li>🎵 vi - IV - I - V</li>
          <li>🎵 I - vi - IV - V</li>
        </ul>
      </div>
    </div>
  );
};
