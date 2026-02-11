chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type !== "CREATE_SHEET") return;

  const jobData = msg.data;
  console.log("Job data received in background:", jobData);

  chrome.identity.getAuthToken({ interactive: true }, async (token) => {
    if (chrome.runtime.lastError || !token) {
      console.error("Auth error:", chrome.runtime.lastError);
      return;
    }

    try {
      console.log("OAuth token received");

      // Check if we have a stored spreadsheet ID
      const stored = await chrome.storage.local.get(['spreadsheetId']);
      let sheetId = stored.spreadsheetId;

      // If we have a stored ID, verify it still exists
      if (sheetId) {
        try {
          const checkRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          if (!checkRes.ok) {
            console.log("Stored sheet not found, creating new one");
            sheetId = null;
          } else {
            console.log("Using existing sheet:", sheetId);
          }
        } catch (err) {
          console.log("Error checking sheet, will create new one");
          sheetId = null;
        }
      }

      // Create new spreadsheet if needed
      if (!sheetId) {
        const createRes = await fetch(
          "https://sheets.googleapis.com/v4/spreadsheets",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              properties: { title: "Coop-Track Data" }
            })
          }
        );

        const sheetData = await createRes.json();
        sheetId = sheetData.spreadsheetId;

        // Store the ID for future use
        await chrome.storage.local.set({ spreadsheetId: sheetId });
        console.log("New sheet created:", sheetId);

        // Instead of the simple PUT request, use batchUpdate for formatting
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              requests: [
                // First, add the header text
                {
                  updateCells: {
                    range: {
                      sheetId: 0, // First sheet
                      startRowIndex: 0,
                      endRowIndex: 1,
                      startColumnIndex: 0,
                      endColumnIndex: 9
                    },
                    rows: [
                      {
                        values: [
                          { userEnteredValue: { stringValue: "Company" } },
                          { userEnteredValue: { stringValue: "Position" } },
                          { userEnteredValue: { stringValue: "Type" } },
                          { userEnteredValue: { stringValue: "Work Term" } },
                          { userEnteredValue: { stringValue: "Duration" } },
                          { userEnteredValue: { stringValue: "Location" } },
                          { userEnteredValue: { stringValue: "URL" } },
                          { userEnteredValue: { stringValue: "Status" } },
                          { userEnteredValue: { stringValue: "Application Date" } }
                        ]
                      }
                    ],
                    fields: "userEnteredValue"
                  }
                },
                // Then, apply formatting
                {
                  repeatCell: {
                    range: {
                      sheetId: 0,
                      startRowIndex: 0,
                      endRowIndex: 1,
                      startColumnIndex: 0,
                      endColumnIndex: 9
                    },
                    cell: {
                      userEnteredFormat: {
                        backgroundColor: {
                          red: 0.5,    // Gray background
                          green: 0.5,
                          blue: 0.5
                        },
                        textFormat: {
                          foregroundColor: {
                            red: 0.0,   // Black text
                            green: 0.0,
                            blue: 0.0
                          },
                          fontSize: 11,
                          bold: true
                        },
                        horizontalAlignment: "CENTER"
                      }
                    },
                    fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                  }
                }
              ]
            })
          }
        );
        console.log("Styled header row added");
      }

      // Append data to the sheet
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=RAW`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            values: [[jobData.company, jobData.position, jobData.type, jobData.workTerm, jobData.duration, jobData.location, jobData.url, jobData.status, jobData.applicationDate]]
          })
        }
      );

      console.log("Data appended to sheet!");

      // Optional: send response back
      sendResponse({ success: true, sheetId });

    } catch (err) {
      console.error("Sheets error:", err);
      sendResponse({ success: false, error: err.message });
    }
  });

  return true; // Keep message channel open for async response
});
