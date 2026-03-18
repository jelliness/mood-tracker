const QUOTES = {
  ecstatic: [
    "Currently vibrating at a frequency only dogs can hear.",
    "If joy had a volume knob, mine just broke off at max.",
    "The sun called — it wants its energy back.",
    "Happiness level: legally required to warn others.",
    "Running so hot the weather app listed me as a local hazard.",
  ],
  happy: [
    "Running on good vibes and questionable life choices.",
    "Today's forecast: 100% chance of smiling at strangers.",
    "Caffeinated? No. Just genuinely pleased with existence.",
    "Currently the protagonist of my own feel-good movie.",
    "Turns out today had the audacity to be pretty great.",
  ],
  calm: [
    "Inner peace loading… ████████ 98%.",
    "Somewhere between a deep breath and a well-deserved nap.",
    "Chaos? Unsubscribed. Serenity? Currently enrolled.",
    "The vibes are giving: warm socks on a cold morning.",
    "Still waters. Definitely not plotting anything.",
  ],
  meh: [
    "Emotionally in airplane mode.",
    "Neither a masterpiece nor a disaster. A Tuesday.",
    "Feelings status: read but not replied to.",
    "Powered by mild indifference and lukewarm coffee.",
    "Existing at standard intensity. Nothing to report.",
  ],
  anxious: [
    "My brain opened 47 tabs and now it's buffering.",
    "Currently stress-testing my own nervous system.",
    "Overthinking is just cardio for the mind, right?",
    "Living on the edge… of my seat. Mostly.",
    "High-key vibrating at a frequency called 'what if'.",
  ],
  sad: [
    "Today I'm the background character in someone else's good day.",
    "Emotionally, I'm a cloud that forgot how to rain.",
    "Soft mode activated. Handle with care.",
    "Collecting feelings like they're going out of style.",
    "A little grey today. Still a valid colour.",
  ],
  frustrated: [
    "Currently accepting applications for a do-over.",
    "This is fine. 🔥 (It is not fine.)",
    "My patience left the chat. Didn't even say goodbye.",
    "Somewhere between a deep sigh and a feral scream.",
    "The audacity of today. The sheer, unfiltered audacity.",
  ],
  angry: [
    "Running on spite and spite alone.",
    "Zero chill detected. Chill has left the building.",
    "I have opinions and they are LOUD.",
    "Currently: a strongly worded letter in human form.",
    "Not looking for solutions. Just need everyone to know.",
  ],
}

/** Returns a random witty quote for the given mood ID. */
export function getRandomQuote(moodId) {
  const pool = QUOTES[moodId] ?? QUOTES.meh
  return pool[Math.floor(Math.random() * pool.length)]
}
