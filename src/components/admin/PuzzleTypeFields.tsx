'use client';

import React, { JSX } from 'react';

interface PuzzleTypeFieldsProps {
  puzzleType: string;
  puzzleData: Record<string, unknown>;
  onDataChange: (key: string, value: unknown) => void;
}

export default function PuzzleTypeFields({ puzzleType, puzzleData, onDataChange }: PuzzleTypeFieldsProps) {
  const asString = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return fallback;
  };

  const asNumber = (value: unknown, fallback: number): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  };

  const asNumberOrEmpty = (value: unknown): number | '' => {
    if (value == null || value === '') return '';
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return '';
  };

  const renderJigsawFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Grid Rows</label>
          <input
            type="number"
            min={2}
            max={50}
            value={asNumber(puzzleData.gridRows, 3)}
            onChange={(e) => onDataChange('gridRows', parseInt(e.target.value, 10))}
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Grid Cols</label>
          <input
            type="number"
            min={2}
            max={50}
            value={asNumber(puzzleData.gridCols, 4)}
            onChange={(e) => onDataChange('gridCols', parseInt(e.target.value, 10))}
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Snap Tolerance (px)</label>
        <input
          type="number"
          min={1}
          max={100}
          value={asNumber(puzzleData.snapTolerance, 12)}
          onChange={(e) => onDataChange('snapTolerance', parseInt(e.target.value, 10))}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        />
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={Boolean(puzzleData.rotationEnabled)}
          onChange={(e) => onDataChange('rotationEnabled', e.target.checked)}
          className="h-4 w-4"
        />
        Rotation Enabled
      </label>
    </div>
  );

  const renderCipherFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Cipher Type</label>
        <select
          value={asString(puzzleData.cipherType, 'caesar')}
          onChange={(e) => onDataChange('cipherType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="caesar">Caesar Cipher</option>
          <option value="atbash">Atbash Cipher</option>
          <option value="vigenere">Vigenère Cipher</option>
          <option value="substitution">Substitution Cipher</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Shift/Key (for applicable ciphers)</label>
        <input
          type="text"
          value={asString(puzzleData.key, '')}
          onChange={(e) => onDataChange('key', e.target.value)}
          placeholder="e.g., 3 for Caesar or 'SECRET' for Vigenère"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Encrypted Message</label>
        <textarea
          value={asString(puzzleData.encryptedMessage, '')}
          onChange={(e) => onDataChange('encryptedMessage', e.target.value)}
          placeholder="The encrypted message for players to solve"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
    </div>
  );

  const renderTextExtractionFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Extraction Type</label>
        <select
            value={asString(puzzleData.extractionType, 'firstLetters')}
          onChange={(e) => onDataChange('extractionType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="firstLetters">First Letters</option>
          <option value="lastLetters">Last Letters</option>
          <option value="keywords">Keywords</option>
          <option value="positions">Specific Positions</option>
          <option value="highlighted">Highlighted Words</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Source Text</label>
        <textarea
            value={asString(puzzleData.sourceText, '')}
          onChange={(e) => onDataChange('sourceText', e.target.value)}
          placeholder="The text from which players extract the answer"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Hint for Extraction (optional)</label>
        <input
          type="text"
            value={asString(puzzleData.extractionHint, '')}
          onChange={(e) => onDataChange('extractionHint', e.target.value)}
          placeholder="e.g., 'Take the first letter of each line'"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
    </div>
  );

  if (puzzleType === 'jigsaw') {
    return renderJigsawFields();
  }

  const renderCoordinatesFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Latitude</label>
          <input
            type="number"
            step="0.0001"
            value={asNumberOrEmpty(puzzleData.latitude)}
            onChange={(e) => onDataChange('latitude', e.target.value === '' ? undefined : parseFloat(e.target.value))}
            placeholder="e.g., 40.7128"
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Longitude</label>
          <input
            type="number"
            step="0.0001"
            value={asNumberOrEmpty(puzzleData.longitude)}
            onChange={(e) => onDataChange('longitude', e.target.value === '' ? undefined : parseFloat(e.target.value))}
            placeholder="e.g., -74.0060"
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Accuracy Radius (meters)</label>
        <input
          type="number"
          value={asNumber(puzzleData.radius, 100)}
          onChange={(e) => onDataChange('radius', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Location Description</label>
        <textarea
          value={asString(puzzleData.locationDescription, '')}
          onChange={(e) => onDataChange('locationDescription', e.target.value)}
          placeholder="Describe the location clues for players"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
    </div>
  );

  const renderImageAnalysisFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Analysis Type</label>
        <select
          value={asString(puzzleData.analysisType, 'hotZones')}
          onChange={(e) => onDataChange('analysisType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="hotZones">Click Hot Zones</option>
          <option value="colorDetection">Color Detection</option>
          <option value="patternMatching">Pattern Matching</option>
          <option value="hiddenElements">Hidden Elements</option>
          <option value="qrCode">QR Code/Barcode</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Analysis Instructions</label>
        <textarea
          value={asString(puzzleData.instructions, '')}
          onChange={(e) => onDataChange('instructions', e.target.value)}
          placeholder="Describe what players need to find or analyze"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Image URL</label>
        <input
          type="url"
          value={asString(puzzleData.imageUrl, '')}
          onChange={(e) => onDataChange('imageUrl', e.target.value)}
          placeholder="Upload image via media manager first"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
    </div>
  );

  const renderAudioSpectrumFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Spectrum Type</label>
        <select
          value={asString(puzzleData.spectrumType, 'frequencies')}
          onChange={(e) => onDataChange('spectrumType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="frequencies">Frequency Analysis</option>
          <option value="spectralPattern">Spectral Pattern</option>
          <option value="waveform">Waveform Analysis</option>
          <option value="hidden">Hidden Message in Audio</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Audio URL</label>
        <input
          type="url"
          value={asString(puzzleData.audioUrl, '')}
          onChange={(e) => onDataChange('audioUrl', e.target.value)}
          placeholder="Upload audio via media manager first"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Instructions</label>
        <textarea
          value={asString(puzzleData.audioInstructions, '')}
          onChange={(e) => onDataChange('audioInstructions', e.target.value)}
          placeholder="What should players listen for or analyze?"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
    </div>
  );

  const renderMorseCodeFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Morse Code Sequence</label>
        <textarea
          value={asString(puzzleData.morseSequence, '')}
          onChange={(e) => onDataChange('morseSequence', e.target.value)}
          placeholder="e.g., '.... . .-.. .-.. ---'"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Provide Reference Chart</label>
        <select
          value={asString(puzzleData.provideChart, 'yes')}
          onChange={(e) => onDataChange('provideChart', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="yes">Yes - Show Morse Code Chart</option>
          <option value="no">No - Players must know Morse Code</option>
          <option value="partial">Partial - Limited reference</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Audio Representation</label>
        <input
          type="url"
          value={asString(puzzleData.audioUrl, '')}
          onChange={(e) => onDataChange('audioUrl', e.target.value)}
          placeholder="Optional: Audio file of morse code (upload via media manager)"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
    </div>
  );

  const renderSteganographyFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Steganography Type</label>
        <select
          value={asString(puzzleData.stegoType, 'lsb')}
          onChange={(e) => onDataChange('stegoType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="lsb">Least Significant Bit (LSB)</option>
          <option value="whitespace">Whitespace Encoding</option>
          <option value="headerData">Image Header Data</option>
          <option value="frequencyDomain">Frequency Domain</option>
          <option value="colorChannels">Color Channels</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Stego Image URL</label>
        <input
          type="url"
          value={asString(puzzleData.stegoImageUrl, '')}
          onChange={(e) => onDataChange('stegoImageUrl', e.target.value)}
          placeholder="Upload image via media manager first"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Extraction Method Description</label>
        <textarea
          value={asString(puzzleData.extractionMethod, '')}
          onChange={(e) => onDataChange('extractionMethod', e.target.value)}
          placeholder="Describe how to extract the hidden data"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Tools Hint (optional)</label>
        <input
          type="text"
          value={asString(puzzleData.toolsHint, '')}
          onChange={(e) => onDataChange('toolsHint', e.target.value)}
          placeholder="e.g., 'Try using tools like Steghide or ExifTool'"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
    </div>
  );

  const renderMultiStepFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Number of Steps</label>
        <input
          type="number"
          min="2"
          max="10"
          value={asNumber(puzzleData.numSteps, 2)}
          onChange={(e) => onDataChange('numSteps', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Chain Type</label>
        <select
          value={asString(puzzleData.chainType, 'linear')}
          onChange={(e) => onDataChange('chainType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="linear">Linear - Each step leads to next</option>
          <option value="convergent">Convergent - Multiple paths to answer</option>
          <option value="branching">Branching - Different endings</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Step Descriptions</label>
        <textarea
          value={asString(puzzleData.stepDescriptions, '')}
          onChange={(e) => onDataChange('stepDescriptions', e.target.value)}
          placeholder="Describe each step separated by newlines"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Step Answers</label>
        <textarea
          value={asString(puzzleData.stepAnswers, '')}
          onChange={(e) => onDataChange('stepAnswers', e.target.value)}
          placeholder="Comma-separated answers for each step"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
    </div>
  );

  const renderRiddleFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Riddle Category</label>
        <select
          value={asString(puzzleData.riddleCategory, 'general')}
          onChange={(e) => onDataChange('riddleCategory', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="general">General Riddle</option>
          <option value="wordplay">Wordplay</option>
          <option value="logic">Logic Riddle</option>
          <option value="lateral">Lateral Thinking</option>
          <option value="cryptic">Cryptic Riddle</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Alternative Answers (comma-separated)</label>
        <input
          type="text"
          value={asString(puzzleData.alternativeAnswers, '')}
          onChange={(e) => onDataChange('alternativeAnswers', e.target.value)}
          placeholder="e.g., 'egg, eggs, EGG'"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
    </div>
  );

  const renderMathFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Math Type</label>
        <select
          value={asString(puzzleData.mathType, 'arithmetic')}
          onChange={(e) => onDataChange('mathType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="arithmetic">Arithmetic</option>
          <option value="algebra">Algebra</option>
          <option value="geometry">Geometry</option>
          <option value="sequence">Number Sequence</option>
          <option value="probability">Probability</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Problem Statement</label>
        <textarea
          value={asString(puzzleData.problemStatement, '')}
          onChange={(e) => onDataChange('problemStatement', e.target.value)}
          placeholder="State the math problem or equation"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Show Working (optional)</label>
        <textarea
          value={asString(puzzleData.workingExample, '')}
          onChange={(e) => onDataChange('workingExample', e.target.value)}
          placeholder="Example working/solution (for hints)"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
    </div>
  );

  const renderPatternFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Pattern Type</label>
        <select
          value={asString(puzzleData.patternType, 'visual')}
          onChange={(e) => onDataChange('patternType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="visual">Visual Pattern</option>
          <option value="sequence">Sequence</option>
          <option value="grid">Grid Pattern</option>
          <option value="symbolic">Symbolic Pattern</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Pattern Description</label>
        <textarea
          value={asString(puzzleData.patternDescription, '')}
          onChange={(e) => onDataChange('patternDescription', e.target.value)}
          placeholder="Describe the pattern for players"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Pattern Image URL</label>
        <input
          type="url"
          value={asString(puzzleData.patternImageUrl, '')}
          onChange={(e) => onDataChange('patternImageUrl', e.target.value)}
          placeholder="Upload pattern image via media manager"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
    </div>
  );

  const renderEscapeRoomFields = () => (
    <div className="space-y-4">
      {(() => {
        const rooms = Array.isArray(puzzleData.rooms) ? (puzzleData.rooms as Array<any>) : [];

        const addRoom = () => {
          const newRoom = {
            title: `Room ${rooms.length + 1}`,
            description: '',
            timeLimitSeconds: null,
            layoutId: '',
            stages: [],
            customHtml: '',
            customCss: '',
            customJs: '',
          };
          onDataChange('rooms', [...rooms, newRoom]);
        };

        const updateRoom = (index: number, key: string, value: any) => {
          const newRooms = rooms.map((r, i) => (i === index ? { ...r, [key]: value } : r));
          onDataChange('rooms', newRooms);
        };

        const removeRoom = (index: number) => {
          if (!confirm('Remove this room?')) return;
          const newRooms = rooms.filter((_, i) => i !== index);
          onDataChange('rooms', newRooms);
        };

        const moveRoom = (index: number, dir: number) => {
          const newIndex = index + dir;
          if (newIndex < 0 || newIndex >= rooms.length) return;
          const newRooms = [...rooms];
          const [item] = newRooms.splice(index, 1);
          newRooms.splice(newIndex, 0, item);
          onDataChange('rooms', newRooms);
        };

        return (
          <div className="space-y-4">
            {rooms.length === 0 && (
              <div className="p-3 rounded bg-slate-700/40 border border-slate-600 text-sm text-gray-300">No rooms yet. Click <strong>Add Room</strong> to create the first room.</div>
            )}

            {rooms.map((room: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-4 bg-slate-800/30" style={{ borderColor: '#475569' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Room Title</label>
                    <input type="text" value={asString(room.title, `Room ${idx + 1}`)} onChange={(e) => updateRoom(idx, 'title', e.target.value)} className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-white" />

                    <label className="block text-sm font-semibold text-gray-300 mb-2 mt-3">Room Description</label>
                    <textarea value={asString(room.description, '')} onChange={(e) => updateRoom(idx, 'description', e.target.value)} className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-white h-20" />

                    <label className="block text-sm font-semibold text-gray-300 mb-2 mt-3">Time Limit (seconds, optional)</label>
                    <input type="number" value={room.timeLimitSeconds == null ? '' : String(room.timeLimitSeconds)} onChange={(e) => updateRoom(idx, 'timeLimitSeconds', e.target.value === '' ? null : parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-white" placeholder="e.g., 3600" />

                    <label className="block text-sm font-semibold text-gray-300 mb-2 mt-3">Layout / Background (optional)</label>
                    <input type="text" value={asString(room.layoutId, '')} onChange={(e) => updateRoom(idx, 'layoutId', e.target.value)} placeholder="Enter layout id or media reference" className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-white" />

                    <div className="mt-4 border border-slate-600 rounded-lg p-3 bg-slate-800/30">
                      <h5 className="text-sm font-semibold text-white mb-2">Custom Room HTML / CSS / JS (optional)</h5>
                      <p className="text-sm text-gray-400 mb-2">Enter room-specific markup, styles, or scripts. Scripts are stored as entered — do not paste untrusted code into production.</p>

                      <label className="block text-xs font-semibold text-gray-300 mt-2">Custom HTML</label>
                      <textarea value={asString(room.customHtml, '')} onChange={(e) => updateRoom(idx, 'customHtml', e.target.value)} className="w-full px-2 py-1 rounded bg-slate-700/50 border border-slate-600 text-white h-28" placeholder="Optional: HTML markup for this room" />

                      <label className="block text-xs font-semibold text-gray-300 mt-2">Custom CSS</label>
                      <textarea value={asString(room.customCss, '')} onChange={(e) => updateRoom(idx, 'customCss', e.target.value)} className="w-full px-2 py-1 rounded bg-slate-700/50 border border-slate-600 text-white h-24" placeholder="Optional: CSS scoped to this room" />

                      <label className="block text-xs font-semibold text-gray-300 mt-2">Custom JS</label>
                      <textarea value={asString(room.customJs, '')} onChange={(e) => updateRoom(idx, 'customJs', e.target.value)} className="w-full px-2 py-1 rounded bg-slate-700/50 border border-slate-600 text-white h-28" placeholder="Optional: JavaScript for this room (be careful)" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4 w-40">
                    <button type="button" onClick={() => moveRoom(idx, -1)} className="px-3 py-2 rounded bg-slate-700 text-white">↑</button>
                    <button type="button" onClick={() => moveRoom(idx, 1)} className="px-3 py-2 rounded bg-slate-700 text-white">↓</button>
                    <button type="button" onClick={() => removeRoom(idx)} className="px-3 py-2 rounded bg-red-600 text-white">Remove</button>
                  </div>
                </div>

                {/* Stages editor for this room */}
                <div className="mt-3">
                  {(() => {
                    const stages = Array.isArray(room.stages) ? room.stages as Array<any> : [];

                    const addStage = () => {
                      const newStage = { title: `Stage ${stages.length + 1}`, description: '', puzzleType: 'text', hints: [] };
                      updateRoom(idx, 'stages', [...stages, newStage]);
                    };

                    const updateStage = (sIndex: number, key: string, value: any) => {
                      const newStages = stages.map((s, i) => i === sIndex ? { ...s, [key]: value } : s);
                      updateRoom(idx, 'stages', newStages);
                    };

                    const removeStage = (sIndex: number) => {
                      if (!confirm('Remove this stage?')) return;
                      const newStages = stages.filter((_, i) => i !== sIndex);
                      updateRoom(idx, 'stages', newStages);
                    };

                    const moveStage = (sIndex: number, dir: number) => {
                      const newIndex = sIndex + dir;
                      if (newIndex < 0 || newIndex >= stages.length) return;
                      const newStages = [...stages];
                      const [item] = newStages.splice(sIndex, 1);
                      newStages.splice(newIndex, 0, item);
                      updateRoom(idx, 'stages', newStages);
                    };

                    return (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-white mb-2">Stages</h4>
                        {stages.length === 0 && <div className="text-sm text-gray-400">No stages yet. Add stages for this room.</div>}
                        {stages.map((stage: any, sIdx: number) => (
                          <div key={sIdx} className="border rounded p-3 bg-slate-800/40" style={{ borderColor: '#475569' }}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-300">Stage Title</label>
                                <input type="text" value={asString(stage.title, `Stage ${sIdx+1}`)} onChange={(e) => updateStage(sIdx, 'title', e.target.value)} className="w-full px-2 py-1 rounded bg-slate-700/50 border border-slate-600 text-white" />

                                <label className="block text-xs font-semibold text-gray-300 mt-2">Description</label>
                                <textarea value={asString(stage.description, '')} onChange={(e) => updateStage(sIdx, 'description', e.target.value)} className="w-full px-2 py-1 rounded bg-slate-700/50 border border-slate-600 text-white h-20" />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                  <div>
                                    <label className="block text-xs text-gray-300">Type</label>
                                    <select value={asString(stage.puzzleType, 'text')} onChange={(e) => updateStage(sIdx, 'puzzleType', e.target.value)} className="w-full px-2 py-1 rounded bg-slate-700/50 border border-slate-600 text-white">
                                      <option value="text">Text</option>
                                      <option value="cipher">Cipher</option>
                                      <option value="image">Image</option>
                                      <option value="jigsaw">Jigsaw</option>
                                      <option value="coordinates">Coordinates</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-300">Hints (one per line)</label>
                                    <textarea value={Array.isArray(stage.hints) ? (stage.hints as string[]).join('\n') : ''} onChange={(e) => updateStage(sIdx, 'hints', e.target.value.split('\n').map(s=>s.trim()).filter(Boolean))} className="w-full px-2 py-1 rounded bg-slate-700/50 border border-slate-600 text-white h-20" />
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 w-28">
                                <button type="button" onClick={() => moveStage(sIdx, -1)} className="px-2 py-1 rounded bg-slate-700 text-white">↑</button>
                                <button type="button" onClick={() => moveStage(sIdx, 1)} className="px-2 py-1 rounded bg-slate-700 text-white">↓</button>
                                <button type="button" onClick={() => removeStage(sIdx)} className="px-2 py-1 rounded bg-red-600 text-white">Remove</button>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div>
                          <button type="button" onClick={addStage} className="px-3 py-1 rounded bg-[#3891A6] text-white">+ Add Stage</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}

            <div>
              <button type="button" onClick={addRoom} className="px-4 py-2 rounded bg-[#3891A6] text-white">+ Add Room</button>
            </div>
          </div>
        );
      })()}
    </div>
  );

  const typeSpecificRenders: Record<string, () => JSX.Element> = {
    cipher: renderCipherFields,
    text_extraction: renderTextExtractionFields,
    coordinates: renderCoordinatesFields,
    image_analysis: renderImageAnalysisFields,
    audio_spectrum: renderAudioSpectrumFields,
    morse_code: renderMorseCodeFields,
    steganography: renderSteganographyFields,
    multi_step: renderMultiStepFields,
    riddle: renderRiddleFields,
    math: renderMathFields,
    pattern: renderPatternFields,
    escape_room: renderEscapeRoomFields,
  };

  const renderer = typeSpecificRenders[puzzleType];

  return (
    <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6 space-y-4">
      <h4 className="text-lg font-bold text-white mb-4">⚙️ {puzzleType.replace(/_/g, ' ').toUpperCase()} Configuration</h4>
      {renderer ? renderer() : <p className="text-gray-400">No additional configuration for this type</p>}
    </div>
  );
}
