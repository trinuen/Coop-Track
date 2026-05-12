document.addEventListener("click", (e: MouseEvent) => {
  const btn = (e.target as Element).closest("button");
  if (!btn) return;

  const btnText = btn.textContent?.trim().toLowerCase();
  if (btnText !== "yes" && btnText !== "submit") return;

  // console.log("Yes/Submit button clicked!");

  const observer = new MutationObserver(() => {
    // console.log("Mutation detected, checking for elements...");

    const companyName: Element | null =
      document.querySelector(".header-info a") ||
      document.querySelector(".header-subtitle a");

    const position: Element | null =
      document.querySelector(".header-title h1 a") ||
      document.querySelector("jobs-detail h1 a");

    const workLocation = document.querySelector<Element>(
      ".header-info span:nth-child(2)"
    );
    const formTextFields = document.querySelectorAll<Element>(
      "jobs-detail p.ng-star-inserted"
    );
    const formNodeFields = document.querySelectorAll<Element>(
      "form-static .field-widget span span"
    );

    if (
      companyName &&
      position &&
      workLocation &&
      formNodeFields.length >= 5 &&
      formTextFields.length >= 5
    ) {
      observer.disconnect();

      const workTerm = formNodeFields[1]?.textContent?.trim() ?? "Not found";
      const duration = formNodeFields[3]?.textContent?.trim() ?? "Not found";

      const workTypes = ["on-site", "remote", "hybrid"];
      let type = "Not found";
      for (const field of Array.from(formTextFields)) {
        if (workTypes.includes(field.textContent?.trim().toLowerCase() ?? "")) {
          type = field.textContent?.trim() ?? "Not found";
          break;
        }
      }

      const jobData: JobData = {
        company: companyName.textContent?.trim() ?? "",
        position: position.textContent?.trim() ?? "",
        type,
        workTerm,
        duration,
        location: workLocation.textContent?.trim() ?? "",
        url: window.location.href,
        status: "Applied",
        applicationDate: new Date().toISOString().split("T")[0],
      };

      // console.log("Final job data:", jobData);

      const message: CreateSheetMessage = { type: "CREATE_SHEET", data: jobData };
      chrome.runtime.sendMessage(message);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  // console.log("Observer started");
});