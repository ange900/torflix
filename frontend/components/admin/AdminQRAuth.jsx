'use client';
import { useState, useEffect } from 'react';

export default function AdminQRAuth() {
  const [deviceCode, setDeviceCode] = useState('');
  const [pendingDevices, setPendingDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL || 'https://torfix.xyz/api';

  const fetchPending = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/tv/admin/pending-devices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPendingDevices(data.devices || []);
    } catch {}
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {}
  };

  useEffect(() => {
    fetchPending();
    fetchUsers();
    const interval = setInterval(fetchPending, 5000);
    return () => clearInterval(interval);
  }, []);

  const authorizeDevice = async (code, userId = null) => {
    setLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/tv/admin/authorize-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceCode: code || deviceCode,
          userId: userId || selectedUserId || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `✅ Appareil autorisé ! User ID: ${data.userId}` });
        setDeviceCode('');
        setSelectedUserId('');
        fetchPending();
      } else {
        setMessage({ type: 'error', text: `❌ ${data.error}` });
      }
    } catch {
      setMessage({ type: 'error', text: '❌ Erreur réseau' });
    }
    setLoading(false);
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        📱 Autorisation QR Code / TV
      </h2>

      {/* Saisie manuelle du code */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        <h3 className="text-white font-semibold">Entrer un code manuellement</h3>
        <p className="text-gray-400 text-sm">
          L'utilisateur voit un code à 6 caractères sur son écran après avoir scanné le QR.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={deviceCode}
            onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
            placeholder="Ex: AB12CD"
            maxLength={8}
            className="flex-1 bg-gray-700 text-white text-2xl font-mono text-center tracking-widest rounded-lg px-4 py-3 border border-gray-600 focus:border-red-500 outline-none uppercase"
          />
        </div>

        {/* Associer à un user existant (optionnel) */}
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600"
        >
          <option value="">— Créer un compte invité automatiquement —</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.username} ({u.email})
            </option>
          ))}
        </select>

        <button
          onClick={() => authorizeDevice()}
          disabled={!deviceCode || loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
        >
          {loading ? 'Autorisation...' : '🔓 Autoriser l\'appareil'}
        </button>
      </div>

      {/* Message de retour */}
      {message && (
        <div className={`rounded-lg p-3 text-sm font-medium ${
          message.type === 'success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Appareils en attente */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold">
            Appareils en attente ({pendingDevices.length})
          </h3>
          <button onClick={fetchPending} className="text-gray-400 hover:text-white text-sm">
            🔄 Rafraîchir
          </button>
        </div>

        {pendingDevices.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Aucun appareil en attente d'autorisation
          </p>
        ) : (
          <div className="space-y-2">
            {pendingDevices.map(device => (
              <div key={device.code} className="flex items-center justify-between bg-gray-700 rounded-lg px-4 py-3">
                <div>
                  <span className="text-white font-mono font-bold text-lg tracking-widest">
                    {device.code}
                  </span>
                  <span className="text-gray-400 text-xs ml-3">
                    Expire dans {Math.floor(device.ttl / 60)}min {device.ttl % 60}s
                  </span>
                </div>
                <button
                  onClick={() => authorizeDevice(device.code)}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition"
                >
                  ✅ Autoriser
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
