/**
 * Seed a demo crime_rpg puzzle that exercises every new RPG feature:
 *   - Gated tabs (starterEvidenceIds, starterQuestionIds, starterTimelineIds, starterTabs)
 *   - Objectives panel (objectives)
 *   - Contradiction challenge system (contradictions)
 *   - Scene hotspots + red herrings (hotspots)
 *   - Corkboard deduction slots (corkboardSlots)
 *   - Locked accusation (accusationMinObjectives)
 *
 * Run:  npx tsx scripts/seed-crime-rpg-demo.ts
 *
 * The script upserts by title so it is safe to run multiple times.
 */

import prisma from '../src/lib/prisma';

const PUZZLE_TITLE = '[DEV] The Aldgate Apartment';

async function main() {
  // ── Find or pick a user to own the puzzle ──────────────────────────────────
  let admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true, email: true },
  });
  if (!admin) {
    admin = await prisma.user.findFirst({ select: { id: true, email: true } });
    if (!admin) { console.error('No users found in database.'); process.exit(1); }
    console.warn(`No admin user found — using first user: ${admin.email}`);
  }

  // ── Find or create a category ──────────────────────────────────────────────
  let category = await prisma.puzzleCategory.findFirst({
    where: { name: 'Detective' },
  });
  if (!category) {
    category = await prisma.puzzleCategory.create({
      data: { name: 'Detective', description: 'Detective and crime puzzles', color: '#7c3aed' },
    });
  }

  // ── The full crimeCase data object ─────────────────────────────────────────
  const crimeCase = {
    caseTitle: 'The Aldgate Apartment',
    premise:
      'Leo Marsh, a mid-level financial auditor, is found dead in his locked apartment. The door was bolted from the inside. Three people had a spare key. His laptop — containing files from an active internal audit — is missing.',
    caseClockHours: 36,
    sceneImageUrl: '', // leave empty — hotspots still render as test markers over a blank area

    // ── Progression gates ──────────────────────────────────────────────────
    starterEvidenceIds: ['e1', 'e2'],        // only these two visible at start
    starterQuestionIds: ['q_nadia_1', 'q_brett_1'], // first question per suspect
    starterTimelineIds: ['t1', 't2'],        // first two timeline events visible
    starterTabs: ['evidence', 'suspects', 'objectives'], // scene/corkboard/timeline locked

    accusationMinObjectives: 4,              // must complete 4 objectives to unlock accusation

    // ── Evidence ───────────────────────────────────────────────────────────
    evidence: [
      {
        id: 'e1',
        label: 'Apartment Entry Log',
        type: 'record',
        summary: `Digital entry log for the building's smart-lock system.`,
        content:
          '18 Apr  09:41  UNLOCK  card #3  (Nadia V.)\n' +
          '18 Apr  10:02  LOCK    auto-close\n' +
          '18 Apr  17:55  UNLOCK  card #1  (Leo M. — master)\n' +
          '18 Apr  18:01  LOCK    manual\n' +
          '18 Apr  22:19  UNLOCK  card #3  (Nadia V.)\n' +
          '18 Apr  22:22  LOCK    manual\n' +
          '19 Apr  06:44  UNLOCK  card #2  (Brett S.)\n' +
          '19 Apr  06:44  ALARM   body found',
        imageUrl: '',
      },
      {
        id: 'e2',
        label: 'Toxicology Report',
        type: 'record',
        summary: 'Preliminary cause of death from the pathologist.',
        content:
          'Victim: Leo Marsh, 34\n' +
          'Cause of death: Acute respiratory failure\n' +
          'Substance detected: Potassium chloride — concentration consistent with lethal IV injection\n' +
          'Note: Potassium chloride is undetectable in a standard post-mortem unless specifically screened for.\n' +
          'Note: Victim showed no natural cardiac abnormalities.',
        imageUrl: '',
      },
      {
        id: 'e3',
        label: 'Audit Draft (recovered fragment)',
        type: 'document',
        summary: 'Partial file recovered from a cloud backup — main file deleted.',
        content:
          'DRAFT — INTERNAL AUDIT — HARWICK GROUP\n' +
          'Flagged account: HW-ACC-004\n' +
          'Unexplained transfers: £318,000 across 14 months\n' +
          'Linked signatory: B. Sloane\n' +
          '[FILE TRUNCATED — original deleted 18 Apr 21:03]',
        imageUrl: '',
        hiddenLayers: [
          {
            id: 'e3_hidden',
            trigger: 'contrast',
            filterThreshold: 2.5,
            revealText:
              'Faint text in the margin: "He knew. He was going to submit this Monday." Handwriting matches Nadia V.',
          },
        ],
      },
      {
        id: 'e4',
        label: 'Text Thread: Leo & Nadia',
        type: 'chat_log',
        summary: `Messages recovered from Leo's phone backup.`,
        content:
          'Nadia:  Did you speak to Brett today?\n' +
          'Leo:    Not yet. I need to finish the report first.\n' +
          'Nadia:  Be careful. He has friends at board level.\n' +
          'Leo:    Noted. Are you coming over tonight?\n' +
          `Nadia:  I'll drop the keys back. That's all.\n` +
          '[gap 3h 14m]\n' +
          `Nadia:  I'm outside. Let me in.`,
        imageUrl: '',
        hiddenLayers: [
          {
            id: 'e4_hidden',
            trigger: 'combine',
            combineWithId: 'e1',
            revealText:
              `Cross-referencing the texts with the entry log: Nadia texted "I'm outside" at 22:17 and the log shows her card used at 22:19 — a two-minute gap. The system shows the door was locked manually at 22:22 — from the inside.`,
          },
        ],
      },
      {
        id: 'e5',
        label: 'Nurse Registry Check',
        type: 'record',
        summary: 'Response from the NMC professional register.',
        content:
          'Subject: Nadia Verona\n' +
          'Registration status: ACTIVE\n' +
          'Specialty: ICU / Critical Care\n' +
          'Current employer: Harwick Private Clinic\n' +
          'Note: Registration permits administration of IV medications including potassium chloride under clinical supervision.',
        imageUrl: '',
      },
    ],

    // ── Suspects ───────────────────────────────────────────────────────────
    suspects: [
      {
        id: 'nadia',
        name: 'Nadia Verona',
        age: 31,
        role: 'ICU Nurse / Ex-partner',
        photoUrl: '',
        bio: 'Has a spare key. Access log shows two visits on the night of death. Works at the clinic affiliated with Harwick Group. Broke up with Leo three weeks before.',
        interrogation: [
          {
            id: 'q_nadia_1',
            question: `What time did you arrive at Leo's apartment on the evening of the 18th?`,
            answer: `I was there briefly in the morning to collect some belongings. I wasn't there in the evening.`,
            isFlaggedAnswer: true,
          },
          {
            id: 'q_nadia_2',
            question: 'Your access card shows an entry at 22:19. How do you explain that?',
            answer: 'I… I went back. I forgot something. I was only there a few minutes. He was alive when I left.',
            isFlaggedAnswer: true,
          },
          {
            id: 'q_nadia_3',
            question: 'Are you trained to administer potassium chloride?',
            answer: `All ICU nurses are. It's part of the critical care protocol. That doesn't mean anything.`,
            isFlaggedAnswer: true,
          },
        ],
      },
      {
        id: 'brett',
        name: 'Brett Sloane',
        age: 47,
        role: 'Head of Finance, Harwick Group',
        photoUrl: '',
        bio: `Has a spare key given to him as Leo's line manager. Named in the audit fragment as the signatory on flagged accounts. Claims he was at a client dinner all evening.`,
        interrogation: [
          {
            id: 'q_brett_1',
            question: 'Were you aware Leo was auditing your accounts?',
            answer: 'I was aware of a routine audit, yes. I had nothing to hide.',
            isFlaggedAnswer: false,
          },
          {
            id: 'q_brett_2',
            question: 'Can anyone confirm you were at the client dinner until midnight?',
            answer: 'The reservation is in my name. The restaurant can confirm.',
            isFlaggedAnswer: false,
          },
        ],
      },
      {
        id: 'clara',
        name: 'Clara Marsh',
        age: 59,
        role: `Leo's mother`,
        photoUrl: '',
        bio: `Has a spare key. Lives 40 miles away. Reported she hadn't spoken to Leo in two weeks. No known financial motive.`,
        interrogation: [
          {
            id: 'q_clara_1',
            question: 'When did you last see Leo?',
            answer: 'About six weeks ago, for Sunday lunch. We spoke on the phone on the 10th.',
            isFlaggedAnswer: false,
          },
        ],
      },
    ],

    mechanisms: [
      'Potassium chloride lethal injection administered while victim was asleep',
      'Suffocation with a pillow — no bruising due to victim\'s intoxicated state',
      'Poisoning via the victim\'s food or drink',
      'Blunt force trauma, staged as an accident',
    ],

    // ── Timeline ───────────────────────────────────────────────────────────
    timeline: [
      { id: 't1', time: '09:41', description: 'Nadia enters apartment — collects belongings.', correctPosition: 1 },
      { id: 't2', time: '17:55', description: 'Leo returns home from the office.', correctPosition: 2 },
      { id: 't3', time: '21:03', description: `Audit draft deleted from Leo's laptop.`, correctPosition: 3 },
      { id: 't4', time: '22:17', description: `Nadia texts "I'm outside."`, correctPosition: 4 },
      { id: 't5', time: '22:19', description: 'Nadia\'s card unlocks the door.', correctPosition: 5 },
      { id: 't6', time: '22:22', description: 'Door locked manually — from inside.', correctPosition: 6 },
      { id: 't7', time: '~23:00', description: 'Leo Marsh dies (estimated).', correctPosition: 7 },
      { id: 't8', time: '06:44', description: 'Brett Sloane finds the body.', correctPosition: 8 },
    ],

    // ── Hotspots (crime scene markers) ────────────────────────────────────
    // x/y are percentages of the scene image width/height
    hotspots: [
      {
        id: 'hs_desk',
        x: 35,
        y: 42,
        label: 'Desk area',
        isRedHerring: false,
        revealText:
          `The laptop dock is empty. A faint rectangular outline in the dust shows the laptop was removed recently — the surrounding dust is undisturbed, meaning it wasn't grabbed in a struggle. It was taken deliberately.`,
        unlocks: [
          { type: 'evidence', id: 'e3' },
          { type: 'question', id: 'q_brett_2' },
        ],
      },
      {
        id: 'hs_window',
        x: 72,
        y: 20,
        label: 'Window latch',
        isRedHerring: true,
        revealText:
          'The window is latched from the inside. There are no scratches on the latch mechanism and no marks on the exterior ledge. This is a dead end — the killer did not enter or leave via the window.',
      },
      {
        id: 'hs_nightstand',
        x: 58,
        y: 65,
        label: 'Nightstand',
        isRedHerring: false,
        revealText:
          `A small puncture mark on the victim's left inner arm — consistent with an IV needle, not a blood draw. The pathologist noted it but did not flag it pending the toxicology screen.`,
        unlocks: [
          { type: 'evidence', id: 'e5' },
          { type: 'question', id: 'q_nadia_3' },
          { type: 'timeline', id: 't7' },
        ],
      },
    ],

    // ── Contradictions (challenge suspect statements with evidence) ────────
    contradictions: [
      {
        id: 'c_nadia_evening',
        suspectId: 'nadia',
        questionId: 'q_nadia_1',
        challengeEvidenceId: 'e1',
        wrongChallengeMessage:
          `That evidence doesn't directly contradict this statement. Look for something that places Nadia at the apartment that evening.`,
        correctChallengeMessage:
          `🔍 The entry log shows Nadia's card used at 22:19 — she was there that evening despite denying it. She changes her story.`,
        unlocks: [
          { type: 'question', id: 'q_nadia_2' },
          { type: 'evidence', id: 'e4' },
          { type: 'timeline', id: 't4' },
          { type: 'timeline', id: 't5' },
          { type: 'timeline', id: 't6' },
        ],
      },
      {
        id: 'c_nadia_training',
        suspectId: 'nadia',
        questionId: 'q_nadia_2',
        challengeEvidenceId: 'e2',
        wrongChallengeMessage:
          `That evidence doesn't specifically implicate Nadia's training. Look for her professional background.`,
        correctChallengeMessage:
          '⚡ The toxicology report identifies potassium chloride — an ICU drug. Nadia is a trained ICU nurse. This is the method.',
        unlocks: [
          { type: 'question', id: 'q_nadia_3' },
          { type: 'phase', id: 'theory' },
        ],
      },
    ],

    // ── Corkboard deduction slots ──────────────────────────────────────────
    corkboardSlots: [
      {
        id: 'slot_motive',
        label: 'motive',
        correctEvidenceId: 'e3',
        unlocks: [{ type: 'tab', id: 'timeline' }],
      },
      {
        id: 'slot_method',
        label: 'method',
        correctEvidenceId: 'e2',
        unlocks: [{ type: 'tab', id: 'corkboard' }],
      },
      {
        id: 'slot_opportunity',
        label: 'opportunity',
        correctEvidenceId: 'e1',
      },
      {
        id: 'slot_alibi',
        label: 'alibi',
        correctEvidenceId: 'e4',
        unlocks: [{ type: 'accusation' }],
      },
    ],

    // ── Objectives ────────────────────────────────────────────────────────
    objectives: [
      // Phase: intake
      {
        id: 'obj_read_log',
        text: 'Review the apartment entry log',
        hint: 'Evidence tab → open the Apartment Entry Log card',
        phase: 'intake',
        completedBy: ['e1'],
      },
      {
        id: 'obj_read_tox',
        text: 'Read the toxicology report',
        hint: 'Evidence tab → open the Toxicology Report card',
        phase: 'intake',
        completedBy: ['e2'],
      },
      // Phase: investigation
      {
        id: 'obj_scene',
        text: 'Examine the crime scene',
        hint: 'Scene tab (unlocks after interrogating Nadia) → click the hotspot markers',
        phase: 'investigation',
        completedBy: ['hs_desk', 'hs_nightstand'],
      },
      {
        id: 'obj_interrogate_nadia',
        text: 'Interrogate Nadia Verona',
        hint: 'Suspects tab → click Interrogate next to Nadia',
        phase: 'investigation',
        completedBy: ['q_nadia_1'],
      },
      {
        id: 'obj_contradict_nadia',
        text: `Challenge Nadia's alibi with evidence`,
        hint: 'Suspects tab → Interrogate Nadia → click ⚡ next to her evening statement → select the Entry Log',
        phase: 'investigation',
        completedBy: ['c_nadia_evening'],
      },
      // Phase: theory
      {
        id: 'obj_method',
        text: 'Identify the murder method',
        hint: 'Suspects tab → Interrogate Nadia → click ⚡ next to her ICU training claim → select Toxicology Report',
        phase: 'theory',
        completedBy: ['c_nadia_training'],
      },
      {
        id: 'obj_motive',
        text: 'Establish a clear motive',
        hint: 'Evidence tab → open the Audit Draft (unlocks after examining the desk hotspot)',
        phase: 'theory',
        completedBy: ['e3'],
      },
      // Phase: breakthrough
      {
        id: 'obj_corkboard',
        text: 'Fill in motive, method and opportunity on the board',
        hint: 'Corkboard tab → drag evidence cards into the Motive, Method, and Opportunity slots',
        phase: 'breakthrough',
        completedBy: ['slot_motive', 'slot_method', 'slot_opportunity'],
      },
      // Phase: accusation
      {
        id: 'obj_ready',
        text: 'Build the case and file accusation',
        hint: 'Corkboard tab → fill the Alibi slot, then use the Accuse button',
        phase: 'accusation',
        completedBy: ['slot_alibi'],
      },
    ],

    // ── Solution ──────────────────────────────────────────────────────────
    solution: {
      principalSuspectId: 'nadia',
      mechanism: 'Potassium chloride lethal injection administered while victim was asleep',
      requiredEvidenceIds: ['e1', 'e2', 'e4', 'e5'],
    },

    retentionUnlock:
      'CASE CLOSED — FILE #ALD-0419\n\n' +
      'Nadia Verona was charged with first-degree murder. The deleted audit file was partially recovered from a cloud backup.\n\n' +
      'Brett Sloane was arrested separately on 14 counts of financial fraud.\n\n' +
      'The laptop was found in a storage unit registered under a shell company linked to Nadia.',
  };

  // ── Upsert the puzzle ──────────────────────────────────────────────────────
  const existing = await prisma.puzzle.findFirst({
    where: { title: PUZZLE_TITLE },
    select: { id: true },
  });

  const puzzleData = {
    title: PUZZLE_TITLE,
    description: 'Full demo of the Crime Case RPG system — all features active.',
    puzzleType: 'crime_rpg',
    difficulty: 'hard',
    categoryId: category.id,
    data: { crimeCase } as any,
  };

  let puzzle;
  if (existing) {
    puzzle = await prisma.puzzle.update({
      where: { id: existing.id },
      data: puzzleData,
    });
    console.log(`✅ Updated existing puzzle: ${puzzle.id}`);
  } else {
    puzzle = await prisma.puzzle.create({ data: puzzleData });
    console.log(`✅ Created new puzzle: ${puzzle.id}`);
  }

  console.log(`\n🔗 Open it at: http://localhost:3000/puzzles/${puzzle.id}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
