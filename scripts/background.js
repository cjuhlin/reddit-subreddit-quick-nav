chrome.commands.onCommand.addListener((command) => {
  //console.log("Command received:", command);
  if (command === "open-subreddit-bar") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        //console.log("Sending message to tab:", tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSubredditBar" });
      } else {
        console.error("No active tab found!");
      }
    });
  }
});