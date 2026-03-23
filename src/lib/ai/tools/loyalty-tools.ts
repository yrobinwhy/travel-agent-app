// Loyalty program tools — save FF numbers, hotel programs from chat

export const SAVE_LOYALTY_TOOL = {
  name: "save_loyalty_program",
  description:
    "Save a frequent flyer number, hotel loyalty program, or status level when the user mentions it in conversation. Use this whenever the user shares their membership number, FF number, loyalty status, or hotel program details. This saves it to their profile for future bookings.",
  input_schema: {
    type: "object" as const,
    properties: {
      type: {
        type: "string",
        enum: ["airline", "hotel"],
        description: "Whether this is an airline frequent flyer program or hotel loyalty program.",
      },
      programName: {
        type: "string",
        description: "Full program name (e.g., 'United MileagePlus', 'Marriott Bonvoy', 'Hyatt World of Hyatt', 'BA Executive Club').",
      },
      code: {
        type: "string",
        description: "For airlines: IATA code (e.g., 'UA', 'BA', 'NH'). For hotels: chain name (e.g., 'Marriott', 'Hyatt', 'Hilton').",
      },
      memberNumber: {
        type: "string",
        description: "The membership/loyalty number. This will be encrypted at rest.",
      },
      statusLevel: {
        type: "string",
        description: "Status tier if mentioned (e.g., 'Gold', 'Platinum', 'Diamond', '1K', 'Executive Club Silver').",
      },
    },
    required: ["type", "programName", "code"],
  },
};

export const ALL_LOYALTY_TOOLS = [SAVE_LOYALTY_TOOL];
