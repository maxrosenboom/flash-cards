// app/page.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Flashcard {
  id: number;
  word: string;
  translation: string;
  status: 'known' | 'somewhat_known' | 'unknown';
}

interface Level {
  name: string;
  filename: string;
  isDefault: boolean;
  displayName?: string;
  url?: string;  // Add this for Supabase file URLs
}

export default function Home() {
  // Default levels should clearly indicate they are default
  const defaultLevels: Level[] = [
    { name: "Level 1", filename: "EN-ES_level1.csv", isDefault: true },
    { name: "Level 2", filename: "EN-ES_level2.csv", isDefault: true },
    { name: "Simple Phrases", filename: "EN-ES_simple_phrases.csv", isDefault: true }
  ];

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [uniqueFlashcards, setUniqueFlashcards] = useState<Flashcard[]>([]);
  const [initialFlashcards, setInitialFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<string>("EN-ES_level1.csv");
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [contentVisible, setContentVisible] = useState<boolean>(true);
  const [showLevelManager, setShowLevelManager] = useState<boolean>(false);
  const [levels, setLevels] = useState<Level[]>(defaultLevels);

  useEffect(() => {
    // Load custom levels from localStorage
    const savedLevels = localStorage.getItem('customLevels');
    if (savedLevels) {
      const customLevels = JSON.parse(savedLevels);
      setLevels(prev => [...prev, ...customLevels]);
    }
  }, []);

  useEffect(() => {
    loadCSV(selectedFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  const getRandomIndex = (length: number): number => {
    return Math.floor(Math.random() * length);
  };

  const loadSelectedLevel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFile(e.target.value);
  };

  // Updated loadCSV function
  const loadCSV = async (file: string) => {
    setIsLoading(true); // Set loading state when starting to load
    try {
      let text;
      if (file.startsWith('EN-ES_')) {
        const response = await fetch(`/data/${file}`);
        text = await response.text();
      } else {
        const level = levels.find(l => l.filename === file);
        if (!level?.url) throw new Error('File URL not found');
        
        const response = await fetch(level.url);
        text = await response.text();
      }

      const parsedData = parseCSV(text);
      if (parsedData.length === 0) {
        throw new Error('No valid data found in CSV');
      }

      const shuffledData = shuffleDeck(parsedData);
      setInitialFlashcards([...parsedData]);
      setUniqueFlashcards([...parsedData]);
      setFlashcards(shuffledData);
      setCurrentCardIndex(getRandomIndex(shuffledData.length));
      setIsFlipped(false);
    } catch (error) {
      console.error("Error loading CSV:", error);
      alert("Error loading level. Switching to Level 1.");
      setSelectedFile("EN-ES_level1.csv");
    } finally {
      setIsLoading(false); // Always turn off loading state
    }
  };

  const modalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowLevelManager(false);
      }
    }

    if (showLevelManager) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLevelManager]);

  const parseCSV = (data: string): Flashcard[] => {
    const rows = data.split('\n').filter(row => row.trim() !== "");
    const cards: Flashcard[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const columns: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of row) {
        if (char === '"' && inQuotes) {
          inQuotes = false;
        } else if (char === '"' && !inQuotes) {
          inQuotes = true;
        } else if (char === ',' && !inQuotes) {
          columns.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      columns.push(current.trim());

      if (columns.length >= 2) {
        cards.push({
          id: i,
          word: columns[0],
          translation: columns[1],
          status: "unknown"
        });
      }
    }

    return cards;
  };

  const shuffleDeck = (deck: Flashcard[]): Flashcard[] => {
    if (!deck || deck.length === 0) return [];
    
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const markCard = (status: Flashcard['status'], e: React.MouseEvent) => {
    e.stopPropagation();
    const card = flashcards[currentCardIndex];
    let newFlashcards = [...flashcards];
    let newUniqueFlashcards = [...uniqueFlashcards];

    // Handle card frequency based on status
    if (status === 'known') {
      newFlashcards = newFlashcards.filter(flashcard => flashcard.id !== card.id);
      newUniqueFlashcards = newUniqueFlashcards.filter(uniqueCard => uniqueCard.id !== card.id);
    } else if (status === 'somewhat_known') {
      newFlashcards = newFlashcards.filter(flashcard => flashcard.id !== card.id);
      const randomIndex = Math.floor(Math.random() * newFlashcards.length);
      newFlashcards.splice(randomIndex, 0, { ...card, status: 'somewhat_known' });
    } else if (status === 'unknown') {
      newFlashcards = newFlashcards.filter(flashcard => flashcard.id !== card.id);
      for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * newFlashcards.length);
        newFlashcards.splice(randomIndex, 0, { ...card, status: 'unknown' });
      }
    }

    const shuffledDeck = shuffleDeck(newFlashcards);
    
    // Hide content first
    setContentVisible(false);
    
    // Start flip animation
    setIsFlipped(false);

    // Wait for content to fade out, then update deck
    setTimeout(() => {
      setFlashcards(shuffledDeck);
      setUniqueFlashcards(newUniqueFlashcards);
      
      if (currentCardIndex >= shuffledDeck.length - 1) {
        setCurrentCardIndex(0);
      } else {
        setCurrentCardIndex(currentCardIndex + 1);
      }
      
      // Show content again after updating
      setTimeout(() => {
        setContentVisible(true);
      }, 50);
    }, 150);
  };

  const resetDeck = () => {
    const shuffledDeck = shuffleDeck([...initialFlashcards]);
    setFlashcards(shuffledDeck);
    setUniqueFlashcards([...initialFlashcards]);
    setCurrentCardIndex(getRandomIndex(shuffledDeck.length));
    setIsFlipped(false);
    setContentVisible(true);
  };

  // Add state for editing name
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deletingLevel, setDeletingLevel] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Rest of your upload logic...
      const text = await file.text();
      const parsedData = parseCSV(text);
      if (parsedData.length === 0) {
        throw new Error('Invalid CSV format or empty file');
      }

      const { error } = await supabase.storage
        .from('spanish-flashcards')
        .upload(`csv-files/${file.name}`, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('spanish-flashcards')
        .getPublicUrl(`csv-files/${file.name}`);

      // Add new level logic...
      const newLevel: Level = {
        name: file.name.replace('.csv', ''),
        filename: file.name,
        isDefault: false,
        displayName: file.name.replace('.csv', ''),
        url: publicUrl
      };

      setLevels(prev => {
        const exists = prev.some(level => level.filename === newLevel.filename);
        if (exists) {
          alert('A level with this name already exists');
          return prev;
        }
        
        const updated = [...prev, newLevel];
        const customLevels = updated.filter(l => !l.isDefault);
        localStorage.setItem('customLevels', JSON.stringify(customLevels));
        return updated;
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const updateLevelName = (filename: string, newName: string) => {
    setLevels(prev => {
      const updated = prev.map(level => 
        level.filename === filename 
          ? { ...level, displayName: newName || level.name }
          : level
      );
      const customLevels = updated.filter(l => !l.isDefault);
      localStorage.setItem('customLevels', JSON.stringify(customLevels));
      return updated;
    });
    setEditingLevelId(null);
  };

  const removeLevel = async (filename: string) => {
    setDeletingLevel(filename);
    try {
      // Rest of your delete logic...
      const { error } = await supabase.storage
        .from('spanish-flashcards')
        .remove([`csv-files/${filename}`]);

      if (error) throw error;

      setLevels(prev => {
        if (prev.length <= 1) {
          alert('Cannot delete the last remaining level');
          return prev;
        }

        const updated = prev.filter(level => level.filename !== filename);
        const customLevels = updated.filter(l => !l.isDefault);
        localStorage.setItem('customLevels', JSON.stringify(customLevels));

        if (selectedFile === filename) {
          const firstAvailableLevel = updated[0].filename;
          setSelectedFile(firstAvailableLevel);
        }

        return updated;
      });
    } catch (error) {
      console.error('Error removing file:', error);
      alert('Error removing file. Please try again.');
    } finally {
      setDeletingLevel(null);
    }
  };

  return (
    <main className="min-h-screen p-4 relative">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Spanish Flashcards</h1>
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className="flex items-center">
            <label htmlFor="level-select" className="mr-2 text-gray-700">Choose a Level:</label>
            <select 
              id="level-select" 
              value={selectedFile}
              onChange={loadSelectedLevel}
              className="border rounded-md py-1.5 px-3 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            >
              {levels.map(level => (
                <option key={level.filename} value={level.filename}>
                  {level.displayName || level.name}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={resetDeck}
            className="px-4 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            Reset Deck
          </button>
        </div>
      </div>

      <div className="flashcard-container">
        {isLoading ? (
          <div className="text-center w-full p-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-xl text-gray-600">Loading cards...</p>
          </div>
        ) : flashcards.length > 0 && currentCardIndex < flashcards.length ? (
          <div 
            className={`flashcard ${isFlipped ? 'is-flipped' : ''}`}
            onClick={flipCard}
          >
            <div className="card-face card-front">
              <p className={`text-xl font-bold card-content w-full text-center ${contentVisible ? '' : 'hidden'}`}>
                {flashcards[currentCardIndex].word}
              </p>
            </div>
            <div className="card-face card-back">
              <div className={`card-content w-full ${contentVisible ? '' : 'hidden'}`}>
                <p className="text-xl mb-4 text-center">{flashcards[currentCardIndex].translation}</p>
                <div className="button-container space-y-2">
                  <button 
                    className="block w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
                    onClick={(e) => markCard('known', e)}
                  >
                    ✔️ I know this word
                  </button>
                  <button 
                    className="block w-full p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    onClick={(e) => markCard('somewhat_known', e)}
                  >
                    🔄 I somewhat know this word
                  </button>
                  <button 
                    className="block w-full p-2 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={(e) => markCard('unknown', e)}
                  >
                    ❌ I don&apos;t know this word
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center w-full">
            <p className="text-xl">Deck completed! Click &apos;Reset Deck&apos; to try again.</p>
          </div>
        )}
      </div>

      <p className="text-center mt-8">
        Cards left in this deck: {uniqueFlashcards.length}
      </p>

      {/* Manage Levels Button */}
      <button
        onClick={() => setShowLevelManager(!showLevelManager)}
        className="fixed bottom-6 left-6 px-5 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <span className="flex items-center gap-2">
          <i className="fa-solid fa-gear text-sm"></i>
          Manage Levels
        </span>
      </button>

    {/* Level Manager Modal */}
    {showLevelManager && (
        <div 
          ref={modalRef}
          className="fixed bottom-20 left-4 bg-white rounded-lg shadow-xl p-4 w-96 border z-50"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Manage Levels</h3>
            <button
              onClick={() => setShowLevelManager(false)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors duration-200 text-gray-400 hover:text-gray-600"
              title="Close"
            >
              <span className="text-xl leading-none">&times;</span>
            </button>
          </div>
          <div className="space-y-2 mb-4">
            {levels.map(level => (
              <div key={level.filename} 
                className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded transition-colors duration-200"
              >
                {editingLevelId === level.filename ? (
                  <input
                    type="text"
                    className="flex-grow text-sm p-1.5 border rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    defaultValue={level.displayName || level.name}
                    onBlur={(e) => updateLevelName(level.filename, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateLevelName(level.filename, e.currentTarget.value);
                      }
                      if (e.key === 'Escape') {
                        setEditingLevelId(null);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="flex-grow text-sm text-gray-700">
                      {level.displayName || level.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {!level.isDefault && (
                        <button
                          onClick={() => setEditingLevelId(level.filename)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors duration-200"
                          title="Edit name"
                        >
                          <i className="fa-solid fa-pencil text-xs"></i>
                        </button>
                      )}
                      {level.isDefault ? (
                        <span className="text-xs text-gray-400 px-2 py-1">Default</span>
                      ) : deletingLevel === level.filename ? (
                        <div className="p-1.5">
                          <i className="fa-solid fa-spinner fa-spin text-xs text-gray-400"></i>
                        </div>
                      ) : (
                        <button
                          onClick={() => removeLevel(level.filename)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors duration-200"
                          title="Delete level"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700">
              Add New Level
              <div className="mt-2 relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer
                  border rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-200
                  disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {isUploading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}
    </main>
  );
}