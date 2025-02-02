//console.log("Content script loaded!");

// Helper function to get a cookie by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Function to update the bar's styling based on the current theme
function updateBarTheme() {
  // Determine the theme from the cookie ("1" for light mode, "2" for dark mode)
  const theme = getCookie("theme");
  const isDarkMode = theme === "2";

  // Define color variables based on the theme
  const backgroundColor = isDarkMode ? "#1a1a1b" : "#ffffff";
  const textColor = isDarkMode ? "#d7dadc" : "#1a1a1b";
  const borderColor = isDarkMode ? "#343536" : "#ccc";
  const suggestionHoverColor = isDarkMode ? "#2a2a2b" : "#f6f7f8";

  // Update the subreddit bar styling
  const bar = document.getElementById("subreddit-bar");
  if (bar) {
    bar.style.backgroundColor = backgroundColor;
    bar.style.color = textColor;
    bar.style.borderBottom = `1px solid ${borderColor}`;

    // Update the input field styling
    const inputField = document.getElementById("subreddit-input");
    if (inputField) {
      inputField.style.backgroundColor = backgroundColor;
      inputField.style.color = textColor;
      inputField.style.border = `1px solid ${borderColor}`;
    }
  }

  // Update the suggestions overlay styling
  const suggestionsDiv = document.getElementById("suggestions");
  if (suggestionsDiv) {
    suggestionsDiv.style.backgroundColor = backgroundColor;
    suggestionsDiv.style.border = `1px solid ${borderColor}`;
  }

  // Update each suggestion item's styling
  document.querySelectorAll(".suggestion-item").forEach((item) => {
    item.style.backgroundColor = backgroundColor;
    item.style.color = textColor;
    item.style.borderBottom = `1px solid ${borderColor}`;
  });

  // Update the hover style for suggestions
  const styleTag = document.getElementById("suggestions-hover-style");
  if (styleTag) {
    styleTag.textContent = `
      .suggestion-item:hover {
        background-color: ${suggestionHoverColor};
      }
    `;
  }
}

// Create the subreddit bar if it doesn't exist
if (!document.getElementById("subreddit-bar")) {
  const bar = document.createElement("div");
  bar.id = "subreddit-bar";
  bar.style.position = "fixed";
  bar.style.top = "0";
  bar.style.left = "0";
  bar.style.width = "100%";
  bar.style.padding = "8px 16px";
  bar.style.zIndex = "1000";
  bar.style.display = "none"; // Initially hidden
  bar.style.fontFamily = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  // Initial theme update before inserting the bar
  updateBarTheme();

  // Use a wrapper for the input field with relative positioning
  bar.innerHTML = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 100%;">
      <input type="text" id="subreddit-input" placeholder="Enter subreddit name..." 
        style="flex: 1; max-width: 400px; padding: 6px 8px; border-radius: 4px; font-size: 14px;" />
      <!-- Suggestions overlay container -->
      <div id="suggestions" 
        style="position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 1001; max-width: 400px; margin: 0 auto; border-radius: 4px; overflow: hidden;">
      </div>
    </div>
  `;
  document.body.appendChild(bar);
}

// Variable to track the currently highlighted suggestion index
let currentSuggestionIndex = -1;

// Function to clear the suggestion highlight styling
function clearSuggestionHighlight() {
  const items = document.querySelectorAll(".suggestion-item");
  items.forEach((item) => {
    item.style.backgroundColor = "";
  });
}

// Function to highlight a suggestion by its index
function highlightSuggestion(items, index) {
  clearSuggestionHighlight();
  if (index >= 0 && index < items.length) {
    items[index].style.backgroundColor = "#d7dadc"; // Temporary highlight; updated by theme later
    updateBarTheme();
  }
}

// Function to navigate to the subreddit
function navigateToSubreddit() {
  const subreddit = document.getElementById("subreddit-input").value.trim();
  if (subreddit) {
    window.location.href = `https://www.reddit.com/r/${subreddit}`;
  }
}

// Input field keydown event to handle arrow navigation and Enter key selection
document.getElementById("subreddit-input").addEventListener("keydown", (e) => {
  const suggestionsDiv = document.getElementById("suggestions");
  const items = suggestionsDiv.querySelectorAll(".suggestion-item");
  
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (items.length > 0) {
      currentSuggestionIndex = (currentSuggestionIndex + 1) % items.length;
      highlightSuggestion(items, currentSuggestionIndex);
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (items.length > 0) {
      currentSuggestionIndex = (currentSuggestionIndex - 1 + items.length) % items.length;
      highlightSuggestion(items, currentSuggestionIndex);
    }
  } else if (e.key === "Enter") {
    // If a suggestion is highlighted, select it
    if (currentSuggestionIndex !== -1 && items.length > 0) {
      e.preventDefault();
      document.getElementById("subreddit-input").value = items[currentSuggestionIndex].textContent;
      suggestionsDiv.innerHTML = "";
      currentSuggestionIndex = -1;
      navigateToSubreddit();
      return;
    }
    // Otherwise, navigate with the current value
    navigateToSubreddit();
  }
});

// Input event to fetch suggestions and perform autocompletion
document.getElementById("subreddit-input").addEventListener("input", async (e) => {
  const inputField = e.target;
  const originalQuery = inputField.value;
  const suggestionsDiv = document.getElementById("suggestions");

  // Reset the current suggestion index on new input
  currentSuggestionIndex = -1;

  if (originalQuery) {
    try {
      const response = await fetch(`https://www.reddit.com/api/subreddit_autocomplete.json?query=${originalQuery}`);
      const data = await response.json();
      const suggestions = data.subreddits.map((sub) => sub.name);

      // Render the suggestion list as an overlay
      suggestionsDiv.innerHTML = suggestions
        .map((sub) => `<div class="suggestion-item" 
            style="padding: 6px 8px; cursor: pointer; border-bottom: 1px solid;">
              ${sub}
            </div>`)
        .join("");

      // Add click event listeners to suggestion items
      document.querySelectorAll(".suggestion-item").forEach((item, index) => {
        item.addEventListener("click", () => {
          inputField.value = item.textContent;
          suggestionsDiv.innerHTML = "";
          currentSuggestionIndex = -1;
          navigateToSubreddit();
        });
      });

      // Auto-complete: if the first suggestion starts with the typed query, auto-fill the text field.
      if (suggestions.length > 0 && inputField.selectionStart === originalQuery.length) {
        const firstSuggestion = suggestions[0];
        if (
          firstSuggestion.toLowerCase().startsWith(originalQuery.toLowerCase()) &&
          firstSuggestion.length > originalQuery.length
        ) {
          inputField.value = firstSuggestion;
          // Select the auto-completed part so that typing replaces it
          inputField.setSelectionRange(originalQuery.length, firstSuggestion.length);
        }
      }
      updateBarTheme();
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      suggestionsDiv.innerHTML = "";
    }
  } else {
    suggestionsDiv.innerHTML = "";
  }
});

// Message listener to toggle the subreddit bar and update its theme
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  //console.log("Message received:", msg);
  if (msg.action === "toggleSubredditBar") {
    updateBarTheme();
    const bar = document.getElementById("subreddit-bar");
    if (bar) {
      bar.style.display = (bar.style.display === "none" || !bar.style.display) ? "block" : "none";
      if (bar.style.display === "block") {
        document.getElementById("subreddit-input").focus();
      }
    } else {
      console.error("Subreddit bar not found!");
    }
  }
});

// Additional CSS for hover effects on suggestions using a dedicated style element
const style = document.createElement("style");
style.id = "suggestions-hover-style";
style.textContent = `
  .suggestion-item:hover {
    background-color: #f6f7f8;
  }
`;
document.head.appendChild(style);
