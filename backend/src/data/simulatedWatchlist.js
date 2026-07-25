const simulatedWatchlistEntries = [
  {
    referenceId:
      "SIM-WL-001",

    fullName:
      "Sanctioned Test Customer",

    aliases: [
      "Test Sanctioned Customer",
      "Sanctioned Demo Customer"
    ],

    category:
      "simulated_watchlist"
  },

  {
    referenceId:
      "SIM-WL-002",

    fullName:
      "Blocked Demo Applicant",

    aliases: [
      "Demo Blocked Applicant"
    ],

    category:
      "simulated_watchlist"
  },

  {
    referenceId:
      "SIM-WL-003",

    fullName:
      "High Risk Test Person",

    aliases: [
      "Test Person High Risk",
      "High-Risk Test Person"
    ],

    category:
      "simulated_watchlist"
  }
];

function freezeEntry(entry) {
  return Object.freeze({
    ...entry,

    aliases:
      Object.freeze([
        ...entry.aliases
      ])
  });
}

export const SIMULATED_WATCHLIST =
  Object.freeze(
    simulatedWatchlistEntries.map(
      freezeEntry
    )
  );