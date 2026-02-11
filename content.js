document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.textContent.trim().toLowerCase() === "yes" || btn.textContent.trim().toLowerCase() === "submit") {
    console.log("Yes/Submit button clicked!");
    const observer = new MutationObserver(() => {
      console.log("Mutation detected, checking for elements...");

      // Try more flexible selectors
      const companyName = document.querySelector('.header-info a') ||
        document.querySelector('.header-subtitle a');

      const position = document.querySelector('.header-title h1 a') ||
        document.querySelector('jobs-detail h1 a');

      const workLocation = document.querySelector('.header-info span:nth-child(2)');
      const formTextFields = document.querySelectorAll('jobs-detail p.ng-star-inserted');

      // Get all form field values
      const formNodeFields = document.querySelectorAll('form-static .field-widget span span');

      if (companyName && position && workLocation && formNodeFields.length >= 5 && formTextFields.length >= 5) {
        observer.disconnect();

        // Find work term and duration from the form fields
        // You'll need to adjust these indices based on the console output above
        const workTerm = formNodeFields[1]?.textContent.trim() || "Not found";
        const duration = formNodeFields[3]?.textContent.trim() || "Not found";
        let type = "Not found";
        const workType = ["on-site", "remote", "hybrid"];
        for (let i = 0; i < formTextFields.length; i++) {
          if (workType.includes(formTextFields[i].textContent.trim().toLowerCase())) {
            type = formTextFields[i].textContent.trim();

            break;
          }
        }
        //For implementation
        const jobData = {
          company: companyName.textContent.trim(),
          position: position.textContent.trim(),
          type: type,
          workTerm: workTerm,
          duration: duration,
          location: workLocation.textContent.trim(),
          url: window.location.href,
          status: "Applied",
          applicationDate: new Date().toISOString().split('T')[0],
        };

        console.log("Final job data:", jobData);
        chrome.runtime.sendMessage({ type: "CREATE_SHEET", data: jobData });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log("Observer started");
  }
});