type JobData = {
  company: string;
  position: string;
  type: string;
  workTerm: string;
  duration: string;
  location: string;
  url: string;
  status: "Applied" | "Interview" | "Offer" | "Rejected" | "Accepted";
  applicationDate: string;
}

type CreateSheetMessage = {
  type: "CREATE_SHEET";
  data: JobData;
}

type StoredData = {
  spreadsheetId?: string;
}