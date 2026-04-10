"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import EditEscapeRoomForm from '../EditEscapeRoomForm';
import { useRouter } from 'next/navigation';

export default function AdminEscapeRoomDetailPanel({ id }: { id: string }) {
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchRoom = () => {
    setLoading(true);
    fetch(`/api/escape-rooms/${id}`)
      .then(res => res.json())
      .then(data => {
        setRoom(data.escapeRoom);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRoom();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this escape room?')) return;
    setError('');
    try {
      const res = await fetch(`/api/escape-rooms/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete escape room');
      } else {
        router.push('/escape-rooms');
      }
    } catch {
      setError('Network error');
    }
  };

  if (loading) return <div className="max-w-xl mx-auto py-8">Loading...</div>;
  if (!room) return <div className="max-w-xl mx-auto py-8">Escape room not found.</div>;

  return (
    <div className="max-w-xl mx-auto py-8">
      {editing ? (
        <EditEscapeRoomForm room={room} onUpdated={() => { setEditing(false); fetchRoom(); }} />
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2">{room.roomTitle} (Admin)</h1>
          <div className="mb-4 text-gray-700">{room.roomDescription}</div>
          <div className="mb-2 text-sm">Multiplayer team puzzle</div>
          <div className="mb-2 text-sm">Time limit: {room.timeLimitSeconds} seconds</div>
          <div className="mt-4 text-xs text-gray-500">Room ID: {room.id}</div>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <div className="flex gap-2 mt-6">
            <Link
              href={`/escape-rooms/designer/edit?id=${room.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Edit in Designer
            </Link>
            <button className="bg-yellow-500 text-white px-4 py-2 rounded" onClick={() => setEditing(true)}>Edit Details</button>
            <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={handleDelete}>Delete</button>
          </div>
        </>
      )}
    </div>
  );
}
