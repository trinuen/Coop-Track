chrome.runtime.onMessage.addListener(
  (msg: CreateSheetMessage, _sender, sendResponse) => {
    if (msg.type !== "CREATE_SHEET") return;

    const jobData: JobData = msg.data;
    console.log("Job data received in background:", jobData);

    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        console.error("Auth error:", chrome.runtime.lastError);
        return;
      }

      try {
        console.log("OAuth token received");

        const stored = await chrome.storage.local.get(["spreadsheetId"]) as StoredData;
        let sheetId: string | undefined = stored.spreadsheetId;

        if (sheetId) {
          try {
            const checkRes = await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!checkRes.ok) {
              console.log("Stored sheet not found, creating new one");
              sheetId = undefined;
            } else {
              console.log("Using existing sheet:", sheetId);
            }
          } catch {
            console.log("Error checking sheet, will create new one");
            sheetId = undefined;
          }
        }

        if (!sheetId) {
          const createRes = await fetch(
            "https://sheets.googleapis.com/v4/spreadsheets",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ properties: { title: "Coop-Track Data" } }),
            }
          );

          const sheetData = await createRes.json();
          sheetId = sheetData.spreadsheetId as string;

          await chrome.storage.local.set({ spreadsheetId: sheetId });
          console.log("New sheet created:", sheetId);

          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                requests: [
                  {
                    updateCells: {
                      range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 9 },
                      rows: [{
                        values: [
                          "Company", "Position", "Type", "Work Term",
                          "Duration", "Location", "URL", "Status", "Application Date"
                        ].map((stringValue) => ({ userEnteredValue: { stringValue } })),
                      }],
                      fields: "userEnteredValue",
                    },
                  },
                  {
                    repeatCell: {
                      range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 9 },
                      cell: {
                        userEnteredFormat: {
                          backgroundColor: { red: 0.7, green: 0.7, blue: 0.7 },
                          textFormat: {
                            foregroundColor: { red: 0, green: 0, blue: 0 },
                            fontSize: 11,
                            bold: true,
                          },
                          horizontalAlignment: "CENTER",
                        },
                      },
                      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
                    },
                  },
                ],
              }),
            }
          );
          console.log("Styled header row added");
        }

        const appendRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=RAW`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              values: [[
                jobData.company, jobData.position, jobData.type,
                jobData.workTerm, jobData.duration, jobData.location,
                jobData.url, jobData.status, jobData.applicationDate,
              ]],
            }),
          }
        );

        if (!appendRes.ok) {
          const errorData = await appendRes.json();
          console.error("Failed to append data:", errorData);
          sendResponse({ success: false, error: "Failed to append data" });
          return;
        }

        const appendResult = await appendRes.json();
        const updatedRange: string = appendResult.updates.updatedRange;
        const rowMatch = updatedRange.match(/!A(\d+)/);
        const newRowNumber = rowMatch ? parseInt(rowMatch[1]) : null;

        if (newRowNumber) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                requests: [{
                  setDataValidation: {
                    range: {
                      sheetId: 0,
                      startRowIndex: newRowNumber - 1,
                      endRowIndex: newRowNumber,
                      startColumnIndex: 7,
                      endColumnIndex: 8,
                    },
                    rule: {
                      condition: {
                        type: "ONE_OF_LIST",
                        values: ["Applied", "Interview", "Offer", "Rejected", "Accepted"]
                          .map((userEnteredValue) => ({ userEnteredValue })),
                      },
                      showCustomUi: true,
                      strict: true,
                    },
                  },
                }],
              }),
            }
          );
          console.log(`Dropdown added to row ${newRowNumber}`);
        }

        console.log("Data appended to sheet!");
        sendResponse({ success: true, sheetId });
      } catch (err) {
        console.error("Sheets error:", err);
        sendResponse({ success: false, error: (err as Error).message });
      }
    });

    return true;
  }
);