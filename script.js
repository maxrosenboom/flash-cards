let flashcards = [];
let uniqueFlashcards = [];
let initialFlashcards = []; // Store initial deck
let currentCardIndex = 0;
let selectedFile = "EN-ES_level1.csv"; // Default to Level 1

function loadSelectedLevel() {
  selectedFile = document.getElementById("level-select").value;
  loadCSV(selectedFile);
}

function loadCSV(file) {
  fetch(file)
    .then(response => response.text())
    .then(data => {
      const parsedData = parseCSV(data);

      initialFlashcards = [...parsedData]; // Save the original set of unique cards
      uniqueFlashcards = [...parsedData]; // Initialize uniqueFlashcards
      flashcards = [...parsedData]; // Initialize the main deck

      currentCardIndex = 0;
      showFlashcard();
      updateCardCount();
    })
    .catch(error => console.error("Error loading CSV:", error));
}
  
  // Custom CSV parser function to handle quoted commas
  function parseCSV(data) {
    const rows = data.split('\n').filter(row => row.trim() !== "");
    const flashcards = [];
  
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const columns = [];
      let current = '';
      let inQuotes = false;
  
      for (let char of row) {
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
        flashcards.push({
          id: i, // Add a unique ID based on the index
          word: columns[0],
          translation: columns[1],
          status: "unknown"
        });
      } else {
        console.warn("Skipping malformed row:", row);
      }
    }
  
    return flashcards;
  }

  function shuffleDeck(deck) {
    if (!deck || deck.length === 0) return;
  
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    console.log("Shuffled deck:", deck); // Debugging line to check shuffle
  }
  
  

// Function to display the flashcard
function showFlashcard() {
    if (currentCardIndex >= flashcards.length) {
      document.getElementById('flashcard-container').innerHTML = "<p>Deck completed! Refresh the page or click 'Reset Deck' to try again.</p>";
      document.getElementById('card-count').textContent = ""; // Clear card count when deck is completed
      return;
    }
  
    const card = flashcards[currentCardIndex];
    const flashcardContainer = document.getElementById('flashcard-container');
    flashcardContainer.innerHTML = `
      <div class="flashcard" onclick="flipCard()">
        <div class="card-face card-front">
          <p><strong>${card.word}</strong></p>
        </div>
        <div class="card-face card-back">
          <p>${card.translation}</p>
          <button class="known" onclick="markCard('known'); event.stopPropagation();">✔️ I know this word</button>
          <button class="somewhat_known" onclick="markCard('somewhat_known'); event.stopPropagation();">🔄 I somewhat know this word</button>
          <button class="unknown" onclick="markCard('unknown'); event.stopPropagation();">❌ I don't know this word</button>
        </div>
      </div>
    `;
  
    // Reset the flip state to show the front side by default
    document.querySelector('.flashcard').classList.remove('is-flipped');
  
    // Update card count
    updateCardCount();
  }
  
  // Function to update the remaining card count
  function updateCardCount() {
    const cardCountElement = document.getElementById('card-count');
  
    if (cardCountElement) {
      // Count unique remaining cards by comparing uniqueFlashcards with flashcards
      const uniqueRemaining = uniqueFlashcards.filter(uniqueCard => 
        flashcards.some(flashcard => flashcard.id === uniqueCard.id)
      ).length;
  
      cardCountElement.textContent = `Cards left in this deck: ${uniqueRemaining}`;
    } else {
      console.warn("Card count element not found.");
    }
  }
  
  
  // Function to handle flipping the card when clicked
  function flipCard() {
    const flashcard = document.querySelector('.flashcard');
    flashcard.classList.toggle('is-flipped');
  }
  
  // Function to handle frequency control based on button clicks
  function markCard(status) {
    const card = flashcards[currentCardIndex];
  
    if (status === 'known') {
      // Remove all instances of this card by filtering out its ID from both decks
      flashcards = flashcards.filter(flashcard => flashcard.id !== card.id);
      uniqueFlashcards = uniqueFlashcards.filter(uniqueCard => uniqueCard.id !== card.id);
    } else if (status === 'somewhat_known') {
      // Insert the card once at a random position for occasional repetition
      const randomIndex = Math.floor(Math.random() * flashcards.length);
      flashcards.splice(randomIndex, 0, { ...card, status: 'somewhat_known' });
    } else if (status === 'unknown') {
      // Shuffle and insert three instances of the card to increase its frequency
      const insertions = 3;
      for (let i = 0; i < insertions; i++) {
        const randomIndex = Math.floor(Math.random() * flashcards.length);
        flashcards.splice(randomIndex, 0, { ...card, status: 'unknown' });
      }
    }
  
    shuffleDeck(flashcards); // Shuffle the deck after modifications
  
    if (currentCardIndex >= flashcards.length) {
      currentCardIndex = 0;
    }
  
    showFlashcard(); // Display the next card
    updateCardCount(); // Update count after marking a card
  }
  
  function resetDeck() {
    // Reset both flashcards and uniqueFlashcards to the original 40 unique cards
    flashcards = [...initialFlashcards];
    uniqueFlashcards = [...initialFlashcards];
  
    shuffleDeck(flashcards); // Shuffle the deck to randomize order
  
    currentCardIndex = 0; // Start from the beginning of the deck
    showFlashcard();
    updateCardCount(); // Update the unique count after reset
  }
  
  
  
// Dark Mode Toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
}

// Load the initial default file
loadCSV(selectedFile);
