export const IMAGES = {
  ribbon: "https://static.prod-images.emergentagent.com/jobs/cd4abdc4-5b56-4af0-8417-30c144e3e518/images/dd0985f5b853e03e6656d748289276b197bed26750b7fd8ef3b1ea968a77d9d8.jpeg",
  focusedSystem: "https://static.prod-images.emergentagent.com/jobs/cd4abdc4-5b56-4af0-8417-30c144e3e518/images/3fcf3021cff2eaaf07e04ea1fc325eef5ecaef5d2002b9d05a049663a87f061b.jpeg",
  emergingPath: "https://static.prod-images.emergentagent.com/jobs/cd4abdc4-5b56-4af0-8417-30c144e3e518/images/e555995304cb1d00ec8a53d6f7d49d7f6e50007e2fa87618273b371093145a8a.jpeg",
};

export const METHOD = [
  { code: "L", name: "Locate the Challenge", stage: "Focus", text: "Name what you are trying to understand, and where the edges of the question sit." },
  { code: "E", name: "Examine Patterns", stage: "See", text: "Look at what keeps happening over time, not only at the latest event." },
  { code: "V", name: "View the System", stage: "See", text: "Notice the people, parts and boundaries that hold the situation in place." },
  { code: "E", name: "Expose Assumptions", stage: "See", text: "Surface the beliefs quietly shaping your view, so they can be checked." },
  { code: "R", name: "Reveal Relationships", stage: "See", text: "Trace what may influence what, including loops that feed themselves." },
  { code: "A", name: "Assess Leverage", stage: "Decide", text: "Find places where a change may have influence, without pretending to rank them precisely." },
  { code: "G", name: "Generate Experiments", stage: "Decide", text: "Design small, testable moves instead of committing to one grand solution." },
  { code: "E", name: "Evaluate Learning", stage: "Learn", text: "Record what happened, what surprised you, and revise the picture." },
];

export const STAGES = [
  { key: "focus", label: "Focus", letters: "L", text: "Define what you're trying to understand and where the edges are." },
  { key: "see", label: "See", letters: "E · V · E · R", text: "Explore patterns, relationships, assumptions and the system around it." },
  { key: "decide", label: "Decide", letters: "A · G", text: "Find places where change may have influence and design small experiments." },
  { key: "learn", label: "Learn", letters: "E", text: "Record what happened and update your understanding." },
];

export const SECTION_META = {
  in_scope: { title: "Inside the current scope", hint: "What you are deliberately looking at right now.", placeholder: "e.g. How our team hands work between design and engineering" },
  out_of_scope: { title: "Outside the scope, still influencing", hint: "Forces beyond your focus that still shape the situation.", placeholder: "e.g. Company-wide hiring freeze" },
  patterns: { title: "Patterns over time", hint: "What keeps happening? What is rising, falling, or repeating?", placeholder: "e.g. Deadlines slip in the last week of every quarter" },
  relationships: { title: "Relationships", hint: "What seems to affect what? Try “A may influence B”.", placeholder: "e.g. Late specs may be increasing rework" },
  assumptions: { title: "Assumptions", hint: "Beliefs shaping your view that have not been tested.", placeholder: "e.g. Customers leave mainly because of price" },
  stakeholders: { title: "Stakeholders", hint: "Who is affected, who has influence, who is missing?", placeholder: "e.g. Night-shift nurses" },
  loops: { title: "Possible feedback loops", hint: "Where might effects circle back to reinforce or balance themselves?", placeholder: "e.g. Burnout → sick days → more pressure → burnout" },
  boundaries: { title: "System boundaries", hint: "Where does this system begin and end, for now?", placeholder: "e.g. We stop at the point the order leaves our warehouse" },
  leverage: { title: "Possible leverage", hint: "Places where a change may have influence. Unranked on purpose.", placeholder: "e.g. The weekly planning meeting format" },
};

export const EPISTEMIC = {
  known: { label: "Known", long: "You told me", dot: "bg-emerald-400", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" },
  inferred: { label: "Inferred", long: "I'm wondering", dot: "bg-violet-400", cls: "bg-violet-500/10 text-violet-200 border-violet-500/30" },
  unknown: { label: "Unknown", long: "We don't know yet", dot: "bg-amber-400", cls: "bg-amber-500/10 text-amber-200 border-amber-500/25" },
};

export const DIFFERENCES = [
  { title: "Not an answer engine", text: "The Guide asks one question at a time. It helps you think; it does not hand you a verdict." },
  { title: "Uncertainty made visible", text: "Every item is marked Known, Inferred, or Unknown, so a hypothesis never quietly becomes a fact." },
  { title: "Maps as working hypotheses", text: "The system picture is a draft you revise as you learn, not a diagram of absolute truth." },
  { title: "Small experiments, not grand plans", text: "Leverage is explored, not ranked with fake precision. You test small moves and watch what happens." },
  { title: "You stay in charge", text: "Nothing changes in your analysis unless you confirm it. AI proposes; you decide." },
];
