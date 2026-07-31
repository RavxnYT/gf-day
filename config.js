// ── Customize everything here ──────────────────────────────────
window.GF_DAY = {
  herName: "Lynn",
  yourName: "Joe",

  // Site only opens on this local date (phone/computer clock)
  releaseDate: { year: 2026, month: 8, day: 1 }, // 1 August 2026
  // Set true ONLY while testing — set false before she opens it
  forceOpen: false,

  // Unlock answers (after she opens the seal)
  unlock: {
    nickname: "bibi",
    // Date Joe asked her to be his girlfriend (YYYY-MM-DD)
    askDate: "2026-03-17",
    fillBlank: "everything",
  },

  // Secret naughty ticket (tap ♥ in footer) — password is case-insensitive
  secretTicket: {
    password: "iloveyou",
    dateLabel: "August 3",
    title: "VIP Night Pass",
    subtitle: "Redeemable on Joe. No refunds.",
    perks: [
      "Unlimited access to Joe — hands, mouth, and zero self-control",
      "Dress code: Not required.",
      "Valid one night only. Bring this smile… and nothing else if you want.",
    ],
    finePrint:
      "By finding this ticket, Lynn agrees Joe is hers to ruin on August 3. No rain checks.",
  },

  letter: `I hope this finds you smiling. I made this little corner of the internet just for you, because “I love you” in a text never feels like enough.

You make the quiet parts of my day feel warm. Your laugh, the way you look at me, the way you care — it all stays with me. On Girlfriend’s Day, I don’t just want to celebrate a date on the calendar. I want to celebrate you. The whole you.

Thank you for being patient with me, for choosing me, and for letting me love you. I’m so proud to call you mine.

Happy Girlfriend’s Day, Lynn. You are, and always will be, my favorite story.`,

  reasons: [
    "The way your smile softens everything around me.",
    "How safe I feel just knowing you’re near.",
    "Your kindness — even in the smallest moments.",
    "The chaos and the calm you bring in perfect balance.",
    "That I can be fully myself with you.",
    "Every late-night talk that somehow feels too short.",
    "How you turn ordinary days into ones I never want to forget.",
    "Simply… you. Always you.",
  ],

  moments: [
    {
      title: "The first time",
      text: "I knew you were going to matter more than I was ready for.",
    },
    {
      title: "Every ordinary Tuesday",
      text: "Still somehow feels special when you’re in it.",
    },
    {
      title: "Your laugh",
      text: "Still my favorite sound in the whole world.",
    },
    {
      title: "Right now",
      text: "I’m grateful I get to love you out loud.",
    },
  ],
};
