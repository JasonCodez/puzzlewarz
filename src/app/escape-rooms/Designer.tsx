"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

// Types for the escape room builder
interface EscapeRoomScene {
  id: string;
  name: string;
  backgroundUrl: string;
  description: string;
  items: EscapeRoomItem[];
  interactiveZones: InteractiveZone[];
  linkedPuzzleId?: string;
}

interface EscapeRoomItem {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  x: number;
  y: number;
  properties: Record<string, any>;
  linkedPuzzleId?: string;
}

interface InteractiveZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  actionType: "modal" | "collect" | "trigger";
  modalContent?: string;
  eventId?: string;
  linkedPuzzleId?: string;
  collectItemId?: string;
}

interface UserSpecialty {
  id: string;
  name: string;
  description: string;
}

// Dummy puzzle list for linking (replace with real data from backend)
const dummyPuzzles = [
  { id: 'pz1', title: 'Sudoku Challenge' },
  { id: 'pz2', title: 'Riddle of the Sphinx' },
  { id: 'pz3', title: 'Logic Grid' },
];

interface EscapeRoomDesignerProps {
  initialData?: any;
  editId?: string;
  onChange?: (data: any) => void;
}

export default function EscapeRoomDesigner({ initialData, editId, onChange }: EscapeRoomDesignerProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [timeLimit, setTimeLimit] = useState(initialData?.timeLimit || 1200);
  const [startMode, setStartMode] = useState(initialData?.startMode || 'leader-start');
  const [scenes, setScenes] = useState<EscapeRoomScene[]>(initialData?.scenes || []);
  const [userSpecialties, setUserSpecialties] = useState<UserSpecialty[]>(initialData?.userSpecialties || []);
  const [validationError, setValidationError] = useState("");
  const [previewSceneIdx, setPreviewSceneIdx] = useState(0);
  const [previewImageError, setPreviewImageError] = useState<string | null>(null);
  const [previewProxying, setPreviewProxying] = useState(false);
  // Track upload status and errors for each item by scene/item index
  const [itemUploadState, setItemUploadState] = useState<Record<string, { uploading: boolean; error: string }>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const createFileInputRef = useCallback((idx: number, itemIdx: number) => (el: HTMLInputElement | null) => {
    const key = `${idx}-${itemIdx}`;
    fileInputRefs.current[key] = el;
  }, []);

  // Remove non-serializable fields from scenes before passing data to parent
  const getSerializableScenes = () =>
    scenes.map(scene => ({
      ...scene,
      items: scene.items,
      interactiveZones: scene.interactiveZones,
    }));

  // Notify parent of changes
  const notifyParent = () => {
    const serializableScenes = getSerializableScenes();
    if (typeof window !== 'undefined' && typeof (window as any).onEscapeRoomDesignerChange === 'function') {
      (window as any).onEscapeRoomDesignerChange({ title, description, timeLimit, startMode, scenes: serializableScenes, userSpecialties });
    }
    if (typeof onChange === 'function') {
      onChange({ title, description, timeLimit, startMode, scenes: serializableScenes, userSpecialties });
    }
  };

  useEffect(() => {
    if (initialData) {
      if (initialData.title !== undefined && initialData.title !== title) setTitle(initialData.title || "");
      if (initialData.description !== undefined && initialData.description !== description) setDescription(initialData.description || "");
      if (initialData.timeLimit !== undefined && initialData.timeLimit !== timeLimit) setTimeLimit(initialData.timeLimit || 1200);
      if (initialData.startMode !== undefined && initialData.startMode !== startMode) setStartMode(initialData.startMode || 'leader-start');
      if (initialData.scenes && JSON.stringify(initialData.scenes) !== JSON.stringify(scenes)) setScenes(initialData.scenes || []);
      if (initialData.userSpecialties && JSON.stringify(initialData.userSpecialties) !== JSON.stringify(userSpecialties)) setUserSpecialties(initialData.userSpecialties || []);
    }
  }, [initialData]);

  // Debug: log preview scene backgroundUrl whenever scenes or preview index change
  useEffect(() => {
    try {
      const url = scenes?.[previewSceneIdx]?.backgroundUrl;
      // eslint-disable-next-line no-console
      console.log('[Designer] Preview scene backgroundUrl:', url);
    } catch (e) {
      // ignore
    }
  }, [scenes, previewSceneIdx]);

  // Call notifyParent whenever title changes
  useEffect(() => {
    notifyParent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, timeLimit, startMode, scenes, userSpecialties]);

  return (
    <div className="max-w-4xl mx-auto py-8 text-white">
      <h1 className="text-3xl font-bold mb-6 text-white">Escape Room Designer</h1>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2 text-white">General Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="border rounded px-2 py-1 w-full bg-slate-800 text-white" />
          </div>
          <div>
            <label className="block text-sm text-white">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="border rounded px-2 py-1 w-full bg-slate-800 text-white" />
          </div>
          <div>
          </div>
          <div>
          </div>
          <div>
            <label className="block text-sm text-white">Time Limit (seconds)</label>
            <input type="number" min={60} value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="border rounded px-2 py-1 w-full bg-slate-800 text-white" />
          </div>
          <div>
            <label className="block text-sm text-white">Start Mode</label>
            <select value={startMode} onChange={e => setStartMode(e.target.value)} className="border rounded px-2 py-1 w-full bg-slate-800 text-white">
              <option value="leader-start">Leader starts the session</option>
              <option value="auto-on-4">Auto start when 4 players joined</option>
            </select>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Scenes/Rooms</h2>
        {/* List and add/remove scenes (rooms) */}
        <div className="mb-2">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setScenes([...scenes, { id: Date.now().toString(), name: '', backgroundUrl: '', description: '', items: [], interactiveZones: [] }]);
            }}
          >
            + Add Scene
          </button>
        </div>
        {/* Scene selector for preview */}
        {scenes.length > 0 && (
          <div className="mb-4 flex gap-2 items-center">
            <span className="text-sm font-semibold">Preview Scene:</span>
            <select value={previewSceneIdx} onChange={e => setPreviewSceneIdx(Number(e.target.value))} className="border rounded px-2 py-1">
              {scenes.map((scene, idx) => (
                <option key={scene.id} value={idx}>{scene.name || `Scene ${idx + 1}`}</option>
              ))}
            </select>
          </div>
        )}
        {/* Live preview */}
        {scenes.length > 0 && (
          <div
            className="mb-6 border rounded-lg overflow-hidden"
            style={{ background: '#222', minHeight: 320, position: 'relative', width: 600, maxWidth: '100%' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
          >
            {/* Background image */}
            {scenes[previewSceneIdx].backgroundUrl ? (
              <>
                <img
                  src={previewProxying ? `/api/image-proxy?url=${encodeURIComponent(scenes[previewSceneIdx].backgroundUrl)}` : scenes[previewSceneIdx].backgroundUrl}
                  alt="Background"
                  style={{ width: '100%', height: 320, objectFit: 'cover', display: 'block' }}
                  onLoad={() => {
                    setPreviewImageError(null);
                  }}
                  onError={() => {
                    if (!previewProxying) {
                      // first failure: attempt server-side proxy (requires ALLOWED_IMAGE_HOSTS configured)
                      setPreviewImageError('Failed to load preview image; retrying via server proxy...');
                      setPreviewProxying(true);
                    } else {
                      setPreviewImageError('Failed to load preview image (proxy failed or URL invalid)');
                    }
                  }}
                />
                {previewImageError && (
                  <div style={{ padding: 8, color: '#ff7b7b', fontSize: 12 }}>{previewImageError}</div>
                )}
              </>
            ) : null}
            {/* Items */}
            {scenes[previewSceneIdx].items.map((item, i) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', `${previewSceneIdx}-${i}`);
                }}
                onDragEnd={(e) => {
                  const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                  if (rect) {
                    const newX = e.clientX - rect.left;
                    const newY = e.clientY - rect.top;
                    const updated = [...scenes];
                    updated[previewSceneIdx].items[i].x = Math.max(0, Math.min(newX, rect.width - 40));
                    updated[previewSceneIdx].items[i].y = Math.max(0, Math.min(newY, rect.height - 40));
                    setScenes(updated);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: item.x || 20 + i * 60,
                  top: item.y || 20,
                  zIndex: 2,
                  borderRadius: 4,
                  padding: 2,
                  minWidth: 40,
                  textAlign: 'center',
                  cursor: 'move',
                  userSelect: 'none'
                }}
              >
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span>🧩</span>}
                <div style={{ fontSize: 10 }}>{item.name}</div>
              </div>
            ))}
            {/* Interactive zones */}
            {scenes[previewSceneIdx].interactiveZones.map((zone, i) => (
              <div key={zone.id} style={{ position: 'absolute', left: zone.x, top: zone.y, width: zone.width, height: zone.height, border: '2px dashed #38bdf8', background: 'rgba(56,189,248,0.1)', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ color: '#38bdf8', fontSize: 12, fontWeight: 600 }}>{zone.label}</span>
              </div>
            ))}
          </div>
        )}
        {scenes.length === 0 ? <div className="text-gray-500">No scenes added yet.</div> : (
          <ul className="space-y-4">
            {scenes.map((scene, idx) => (
              <li key={scene.id} className="border p-4 rounded">
                <div className="flex justify-between items-center mb-2">
                  <input value={scene.name} onChange={e => {
                    const updated = [...scenes];
                    updated[idx].name = e.target.value;
                    setScenes(updated);
                  }} placeholder="Scene Name" className="border rounded px-2 py-1 mr-2" />
                  <button className="text-red-600" type="button" onClick={() => setScenes(scenes.filter((_, i) => i !== idx))}>Remove</button>
                </div>
                <div className="mb-2">
                  {/* Puzzle linking for scene */}
                  <label className="block text-xs font-semibold">Linked Puzzle (optional)</label>
                  <select value={scene.linkedPuzzleId || ''} onChange={e => {
                    const updated = [...scenes];
                    updated[idx].linkedPuzzleId = e.target.value || undefined;
                    setScenes(updated);
                  }} className="border rounded px-2 py-1 text-xs mb-2">
                    <option value="">None</option>
                    {dummyPuzzles.map(pz => <option key={pz.id} value={pz.id}>{pz.title}</option>)}
                  </select>
                  <label className="block text-sm">Background Image</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={scene.backgroundUrl || ''}
                      onChange={e => {
                        const updated = [...scenes];
                        updated[idx].backgroundUrl = e.target.value;
                        setScenes(updated);
                      }}
                      placeholder="Paste an external image URL"
                      className="border rounded px-2 py-1 text-xs w-64"
                    />
                    <button
                      type="button"
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                      disabled={!scene.backgroundUrl || !editId}
                      onClick={async () => {
                        if (!scene.backgroundUrl || !editId) return;
                        try {
                          const resp = await fetch('/api/admin/media', {
                            method: 'POST',
                            body: (() => {
                              const fd = new FormData();
                              fd.append('url', scene.backgroundUrl);
                              fd.append('puzzleId', editId);
                              return fd;
                            })(),
                          });
                          const data = await resp.json();
                          if (resp.ok && data.mediaUrl) {
                            const updated = [...scenes];
                            updated[idx].backgroundUrl = data.mediaUrl;
                            setScenes(updated);
                            // Debug: log the response and updated backgroundUrl
                            // eslint-disable-next-line no-console
                            console.log('[Designer] Imported media:', { status: resp.status, body: data, updatedBackgroundUrl: updated[idx].backgroundUrl });
                            alert('Image imported and saved to media!');
                          } else {
                            alert('Import failed: ' + (data.error || 'Unknown error'));
                          }
                        } catch (err) {
                          alert('Import error: ' + (err instanceof Error ? err.message : String(err)));
                        }
                      }}
                    >Import to Media</button>
                    {scene.backgroundUrl && (
                      <img src={scene.backgroundUrl} alt="bg" className="h-10 w-10 object-cover rounded ml-2" />
                    )}
                  </div>
                </div>
                <div className="mb-2">
                  <label className="block text-sm">Description</label>
                  <input value={scene.description} onChange={e => {
                    const updated = [...scenes];
                    updated[idx].description = e.target.value;
                    setScenes(updated);
                  }} className="border rounded px-2 py-1 w-full" />
                </div>
                {/* Items management */}
                <div className="mb-2">
                  <label className="block text-sm font-semibold">Items</label>
                  <button className="bg-blue-500 text-white px-2 py-1 rounded text-xs mb-2" type="button" onClick={() => {
                    const updated = [...scenes];
                    updated[idx].items.push({ id: Date.now().toString(), name: '', imageUrl: '', description: '', x: 50, y: 50, properties: {} });
                    setScenes(updated);
                  }}>+ Add Item</button>
                  {scene.items.length === 0 ? (
                    <div className="text-xs text-gray-400">No items</div>
                  ) : (
                    <ul className="space-y-2">
                      {scene.items.map((item, itemIdx) => (
                        <li key={item.id} className="border p-2 rounded">
                          <div className="flex gap-2 items-center mb-1">
                            <input value={item.name} onChange={e => {
                              const updated = [...scenes];
                              updated[idx].items[itemIdx].name = e.target.value;
                              setScenes(updated);
                            }} placeholder="Item Name" className="border rounded px-2 py-1 text-xs" />
                            <div className="flex gap-2 items-center">

                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                form=""
                                id={`item-image-${idx}-${itemIdx}`}
                                ref={createFileInputRef(idx, itemIdx)}
                                onChange={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const key = `${idx}-${itemIdx}`;
                                  setItemUploadState(prev => ({ ...prev, [key]: { uploading: true, error: '' } }));
                                  let uploadError = '';
                                  let imageUrl = '';
                                  try {
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    if (editId) formData.append('puzzleId', editId);
                                    const res = await fetch('/api/admin/media', { method: 'POST', body: formData });
                                    const data = await res.json();
                                    if (res.ok && (data.mediaUrl || data.url)) {
                                      imageUrl = data.mediaUrl || data.url;
                                    } else {
                                      uploadError = data.error || 'Unknown error';
                                    }
                                  } catch (err) {
                                    uploadError = err instanceof Error ? err.message : String(err);
                                  }
                                  // Update the item with the imageUrl if successful
                                  if (imageUrl) {
                                    const updated = [...scenes];
                                    updated[idx].items[itemIdx].imageUrl = imageUrl;
                                    setScenes(updated);
                                  }
                                  setItemUploadState(prev => ({ ...prev, [key]: { uploading: false, error: uploadError } }));
                                }}
                              />
                              <label
                                htmlFor={`item-image-${idx}-${itemIdx}`}
                                className="bg-blue-500 text-white px-2 py-1 rounded text-xs cursor-pointer inline-block"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const input = fileInputRefs.current[`${idx}-${itemIdx}`];
                                  if (input) input.click();
                                }}
                              >
                                Upload Image
                              </label>
                              {itemUploadState[`${idx}-${itemIdx}`]?.uploading && (
                                <span className="ml-2 text-xs text-blue-400">Uploading...</span>
                              )}
                              {itemUploadState[`${idx}-${itemIdx}`]?.error && (
                                <span className="ml-2 text-xs text-red-400">{itemUploadState[`${idx}-${itemIdx}`].error}</span>
                              )}
                              {item.imageUrl && !itemUploadState[`${idx}-${itemIdx}`]?.uploading && (
                                <img src={item.imageUrl} alt="item" className="h-8 w-8 object-cover rounded ml-2" />
                              )}
                            </div>
                            <button className="text-red-500 text-xs" type="button" onClick={() => {
                              const updated = [...scenes];
                              updated[idx].items = updated[idx].items.filter((_, i) => i !== itemIdx);
                              setScenes(updated);
                            }}>Remove</button>
                          </div>
                          <input value={item.description} onChange={e => {
                            const updated = [...scenes];
                            updated[idx].items[itemIdx].description = e.target.value;
                            setScenes(updated);
                          }} placeholder="Description" className="border rounded px-2 py-1 w-full text-xs" />
                          <div className="mt-1">
                            <label className="block text-xs">Linked Puzzle (optional)</label>
                            <select value={item.linkedPuzzleId || ''} onChange={e => {
                              const updated = [...scenes];
                              updated[idx].items[itemIdx].linkedPuzzleId = e.target.value || undefined;
                              setScenes(updated);
                            }} className="border rounded px-2 py-1 text-xs">
                              <option value="">None</option>
                              {dummyPuzzles.map(pz => <option key={pz.id} value={pz.id}>{pz.title}</option>)}
                            </select>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Interactive zones management */}
                <div className="mb-2">
                  <label className="block text-sm font-semibold">Interactive Zones</label>
                  <button className="bg-blue-500 text-white px-2 py-1 rounded text-xs mb-2" type="button" onClick={() => {
                    const updated = [...scenes];
                    updated[idx].interactiveZones.push({ id: Date.now().toString(), label: '', x: 0, y: 0, width: 100, height: 100, actionType: 'modal', modalContent: '' });
                    setScenes(updated);
                  }}>+ Add Zone</button>
                  {scene.interactiveZones.length === 0 ? <div className="text-xs text-gray-400">No interactive zones</div> : (
                    <ul className="space-y-2">
                      {scene.interactiveZones.map((zone, zoneIdx) => (
                        <li key={zone.id} className="border p-2 rounded">
                          <div className="flex gap-2 items-center mb-1">
                            <input value={zone.label} onChange={e => {
                              const updated = [...scenes];
                              updated[idx].interactiveZones[zoneIdx].label = e.target.value;
                              setScenes(updated);
                            }} placeholder="Zone Label" className="border rounded px-2 py-1 text-xs" />
                            <select value={zone.actionType} onChange={e => {
                              const updated = [...scenes];
                              updated[idx].interactiveZones[zoneIdx].actionType = e.target.value as any;
                              setScenes(updated);
                            }} className="border rounded px-2 py-1 text-xs">
                              <option value="modal">Modal</option>
                              <option value="collect">Collect Item</option>
                              <option value="trigger">Trigger Event</option>
                            </select>
                            <button className="text-red-500 text-xs" type="button" onClick={() => {
                              const updated = [...scenes];
                              updated[idx].interactiveZones = updated[idx].interactiveZones.filter((_, i) => i !== zoneIdx);
                              setScenes(updated);
                            }}>Remove</button>
                          </div>
                          <div className="flex gap-2 mb-1">
                            <input type="number" value={zone.x} onChange={e => {
                              const updated = [...scenes];
                              updated[idx].interactiveZones[zoneIdx].x = Number(e.target.value);
                              setScenes(updated);
                            }} placeholder="X" className="border rounded px-2 py-1 w-16 text-xs" />
                            <input type="number" value={zone.y} onChange={e => {
                              const updated = [...scenes];
                              updated[idx].interactiveZones[zoneIdx].y = Number(e.target.value);
                              setScenes(updated);
                            }} placeholder="Y" className="border rounded px-2 py-1 w-16 text-xs" />
                            <input type="number" value={zone.width} onChange={e => {
                              const updated = [...scenes];
                              updated[idx].interactiveZones[zoneIdx].width = Number(e.target.value);
                              setScenes(updated);
                            }} placeholder="Width" className="border rounded px-2 py-1 w-16 text-xs" />
                            <input type="number" value={zone.height} onChange={e => {
                              const updated = [...scenes];
                              updated[idx].interactiveZones[zoneIdx].height = Number(e.target.value);
                              setScenes(updated);
                            }} placeholder="Height" className="border rounded px-2 py-1 w-16 text-xs" />
                          </div>
                          {/* Puzzle linking for zone */}
                          <div className="mt-1">
                            <label className="block text-xs">Linked Puzzle (optional)</label>
                            <select value={zone.linkedPuzzleId || ''} onChange={e => {
                              const updated = [...scenes];
                              updated[idx].interactiveZones[zoneIdx].linkedPuzzleId = e.target.value || undefined;
                              setScenes(updated);
                            }} className="border rounded px-2 py-1 text-xs">
                              <option value="">None</option>
                              {dummyPuzzles.map(pz => <option key={pz.id} value={pz.id}>{pz.title}</option>)}
                            </select>
                          </div>
                          {zone.actionType === 'modal' && (
                            <textarea value={zone.modalContent} onChange={e => {
                              const updated = [...scenes];
                              updated[idx].interactiveZones[zoneIdx].modalContent = e.target.value;
                              setScenes(updated);
                            }} placeholder="Modal Content (Markdown or HTML)" className="border rounded px-2 py-1 w-full text-xs" />
                          )}
                          {zone.actionType === 'collect' && (
                            <div className="mb-1">
                              <label className="block text-xs">Collects Item</label>
                              <select value={zone.collectItemId || ''} onChange={e => {
                                const updated = [...scenes];
                                updated[idx].interactiveZones[zoneIdx].collectItemId = e.target.value || undefined;
                                setScenes(updated);
                              }} className="border rounded px-2 py-1 text-xs">
                                <option value="">None</option>
                                {scene.items.map(it => <option key={it.id} value={it.id}>{it.name || 'Unnamed Item'}</option>)}
                              </select>
                            </div>
                          )}
                          {zone.actionType === 'trigger' && (
                            <div className="mb-1">
                              <label className="block text-xs">Event/Action Name</label>
                              <input value={zone.eventId || ''} onChange={e => {
                                const updated = [...scenes];
                                updated[idx].interactiveZones[zoneIdx].eventId = e.target.value;
                                setScenes(updated);
                              }} placeholder="Event Name" className="border rounded px-2 py-1 text-xs" />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Live preview placeholder */}
                <div className="mb-2 text-xs text-blue-700">Live preview coming soon...</div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">User Specialties</h2>
        <div className="mb-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded" type="button" onClick={() => setUserSpecialties([...userSpecialties, { id: Date.now().toString(), name: '', description: '' }])}>+ Add Specialty</button>
        </div>
        {userSpecialties.length === 0 ? <div className="text-gray-500">No specialties added yet.</div> : (
          <ul className="space-y-4">
            {userSpecialties.map((spec, idx) => (
              <li key={spec.id} className="border p-4 rounded">
                <div className="flex justify-between items-center mb-2">
                  <input value={spec.name} onChange={e => {
                    const updated = [...userSpecialties];
                    updated[idx].name = e.target.value;
                    setUserSpecialties(updated);
                  }} placeholder="Specialty Name" className="border rounded px-2 py-1 mr-2" />
                  <button className="text-red-600" type="button" onClick={() => setUserSpecialties(userSpecialties.filter((_, i) => i !== idx))}>Remove</button>
                </div>
                <div>
                  <label className="block text-sm">Description</label>
                  <input value={spec.description} onChange={e => {
                    const updated = [...userSpecialties];
                    updated[idx].description = e.target.value;
                    setUserSpecialties(updated);
                  }} className="border rounded px-2 py-1 w-full" />
                </div>
              </li>
            ))}
          </ul>
        )}
        {/* Save button for in-progress escape room design, now after specialties */}
        <div className="mb-8 flex justify-end">
          <button
            className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 transition"
            type="button"
            onClick={async () => {
              setValidationError("");
              // Basic validation (optional, can be expanded)
              if (!title.trim()) {
                setValidationError("Title is required.");
                return;
              }
              if (scenes.length === 0) {
                setValidationError("At least one scene/room is required.");
                return;
              }
              // Notify parent (PuzzleTypeFields) of the latest data
              if (typeof onChange === 'function') {
                onChange({ title, description, timeLimit, scenes, userSpecialties });
              }
              // Optionally show a message
              setValidationError("Escape room draft saved (in form, not submitted yet).");
            }}
          >
            Save Escape Room
          </button>
        </div>
      </section>
      {/* Save/Preview section removed to prevent duplicate submit UI in main form */}
    </div>
  );
}
