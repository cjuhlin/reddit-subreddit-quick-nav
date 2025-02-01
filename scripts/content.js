
// Helper function to get a cookie by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Determine the theme from the cookie ("1" for light mode, "2" for dark mode)
const theme = getCookie("theme");
const isDarkMode = theme === "2";

// Define color variables based on the theme
const backgroundColor = isDarkMode ? "#1a1a1b" : "#ffffff";
const textColor = isDarkMode ? "#d7dadc" : "#1a1a1b";
const borderColor = isDarkMode ? "#343536" : "#ccc";
const buttonBackground = isDarkMode ? "#272729" : "#f6f7f8";
const suggestionHoverColor = isDarkMode ? "#2a2a2b" : "#f6f7f8";

// Variable to track the currently highlighted suggestion index
let currentSuggestionIndex = -1;

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
  bar.style.backgroundColor = backgroundColor;
  bar.style.color = textColor;
  bar.style.borderBottom = `1px solid ${borderColor}`;
  bar.style.boxShadow = "none";
  bar.style.fontFamily = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  // Use a flex layout for centering the input and button
  bar.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; width: 100%;">
      <input type="text" id="subreddit-input" placeholder="Enter subreddit name..." 
        style="flex: 1; max-width: 400px; padding: 6px 8px; border: 1px solid ${borderColor}; border-radius: 4px; margin-right: 8px; font-size: 14px; background-color: ${backgroundColor}; color: ${textColor};" />
      <button id="subreddit-go" 
        style="padding: 6px 12px; border: 1px solid ${borderColor}; border-radius: 4px; background-color: ${buttonBackground}; color: ${textColor}; font-size: 14px; cursor: pointer;">
        Go
      </button>
    </div>
    <div id="suggestions" 
      style="max-width: 400px; margin: 8px auto 0; background-color: ${backgroundColor}; border: 1px solid ${borderColor}; border-radius: 4px; overflow: hidden;">
    </div>
  `;
  document.body.appendChild(bar);
}

// Function to clear the suggestion highlight styling
function clearSuggestionHighlight() {
  const items = document.querySelectorAll(".suggestion-item");
  items.forEach((item) => {
    item.style.backgroundColor = backgroundColor;
  });
}

// Function to highlight a suggestion by its index
function highlightSuggestion(items, index) {
  clearSuggestionHighlight();
  if (index >= 0 && index < items.length) {
    items[index].style.backgroundColor = suggestionHoverColor;
  }
}

// Function to navigate to the subreddit
function navigateToSubreddit() {
  const subreddit = document.getElementById("subreddit-input").value.trim();
  if (subreddit) {
    window.location.href = `https://www.reddit.com/r/${subreddit}`;
  }
}

// Event listener for the "Go" button
document.getElementById("subreddit-go").addEventListener("click", () => {
  navigateToSubreddit();
});

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

      // Render the suggestion list
      suggestionsDiv.innerHTML = suggestions
        .map((sub) => `<div class="suggestion-item" 
            style="padding: 6px 8px; cursor: pointer; border-bottom: 1px solid ${borderColor}; background-color: ${backgroundColor}; color: ${textColor};">
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

      // Auto-complete: if the first suggestion starts with the typed query, and
      // if the caret is at the end of the input, auto-fill the text field.
      if (suggestions.length > 0 &&
          inputField.selectionStart === originalQuery.length) {
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
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      suggestionsDiv.innerHTML = "";
    }
  } else {
    suggestionsDiv.innerHTML = "";
  }
});

// Message listener to toggle the subreddit bar
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Message received:", msg);
  if (msg.action === "toggleSubredditBar") {
    const bar = document.getElementById("subreddit-bar");
    if (bar) {
      // Toggle the display of the bar
      bar.style.display = (bar.style.display === "none" || !bar.style.display) ? "block" : "none";
      if (bar.style.display === "block") {
        document.getElementById("subreddit-input").focus();
      }
    } else {
      console.error("Subreddit bar not found!");
    }
  }
});

// Additional CSS for hover effects on suggestions
const style = document.createElement("style");
style.textContent = `
  .suggestion-item:hover {
    background-color: ${suggestionHoverColor};
  }
`;
document.head.appendChild(style);
