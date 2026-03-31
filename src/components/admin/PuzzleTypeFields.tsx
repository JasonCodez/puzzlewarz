'use client';

import React, { JSX, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
// Dynamically import the advanced Escape Room Designer (client-side only)
const EscapeRoomDesigner = dynamic(() => import("@/app/escape-rooms/Designer"), { ssr: false });

// ── Code Master puzzle starter templates ────────────────────────────────────
const CODE_MASTER_TEMPLATES: {
  id: string;
  name: string;
  track: string;
  trackIcon: string;
  description: string;
  data: Record<string, unknown>;
}[] = [
  // ── HTML 0: Your First HTML Page ──────────────────────────────────────────
  {
    id: 'html-structure',
    name: 'Your First HTML Page',
    track: 'HTML Basics',
    trackIcon: '🌐',
    description: 'Fix a broken HTML document — learn the essential skeleton every webpage needs.',
    data: {
      language: 'html',
      track: 'HTML Basics',
      trackOrder: 1,
      concepts: ['HTML', 'document structure', 'tags', 'head', 'body', 'doctype'],
      scenario: 'Someone handed you a webpage but it\'s broken — the head section isn\'t closed properly and the body is left hanging open. The browser is guessing wildly at your structure. Fix the skeleton so it becomes a valid HTML5 document.',
      theory: `── What is HTML? ────────────────────────────────────────────
HTML stands for HyperText Markup Language. It is the language of the web.

Every single webpage you have ever visited — Google, YouTube, Instagram — is built on HTML. Your browser reads HTML and turns it into the visual page you see.

── What is a "tag"? ─────────────────────────────────────────
HTML is written with TAGS. A tag is a keyword wrapped in angle brackets < >

  Opening tag:  <p>
  Closing tag:  </p>   ← note the forward slash — it closes the element
  Content:      <p>This is a paragraph of text.</p>

Tags come in pairs. Everything between them is the content:
  <h1>Big Heading</h1>
  <p>A paragraph.</p>
  <strong>Bold text</strong>

Some tags are self-closing (no content, no separate closing tag):
  <img src="photo.jpg" alt="A dog" />
  <br />    ← line break
  <hr />    ← horizontal line

── The essential HTML skeleton ──────────────────────────────
Every valid HTML page MUST have this exact structure:

  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Page Title</title>
    </head>
    <body>
      ... everything visible goes here ...
    </body>
  </html>

Here is what each part means:
  <!doctype html>        — Tells the browser: "This is an HTML5 page." Must be the very first line.
  <html lang="en">       — The root element that wraps everything. lang="en" tells screen readers the language.
  <head> ... </head>     — INVISIBLE metadata. The browser reads this but the user never sees it directly.
  <meta charset="utf-8"> — Ensures the page can display accented letters, emojis, and every language.
  <title>...</title>     — Shown in the browser tab and in Google search results.
  <body> ... </body>     — EVERYTHING THE USER SEES goes in here: text, images, buttons, forms.

── What is nesting? ─────────────────────────────────────────
Elements that live inside other elements are called NESTED.
The most important rule: always close the inner element before the outer one.

  ✅ Correct:
  <body>
    <h1>Welcome</h1>
    <p>Some text.</p>
  </body>

  ❌ Wrong (never do this):
  <body>
    <h1>Welcome</body>
  </h1>

── The bug in this puzzle ───────────────────────────────────
1. <head> was used as a closing tag instead of </head>
2. The </body> and </html> closing tags are missing entirely

Fix: change <head> to </head> and add </body></html> at the end.`,
      lessonSummary: `You fixed the broken HTML structure — the page is now valid HTML5. 🎉

What you repaired:
  1. <head> → </head>    A closing tag must have a forward slash. Without it, the browser
                         had no idea where the head section ended.
  2. Added </body>        Every opened tag must be properly closed.
  3. Added </html>        The root element needs to be closed too.

The skeleton you now know by heart:
  <!doctype html>
  <html lang="en">
    <head> ... metadata ... </head>
    <body> ... visible content ... </body>
  </html>

Browsers actually try to "repair" broken HTML on the fly — but they don't always guess right, which leads to weird visual glitches on real sites.

This structure is the foundation of every webpage on the internet. From a student portfolio to a Fortune 500 company website — they all start with these exact same lines.

You've learned:
  ✓ What HTML is and what it is for
  ✓ What tags are and how opening/closing pairs work
  ✓ The required skeleton that every HTML document needs
  ✓ The difference between <head> (invisible) and <body> (visible)

Day 1, Lesson 1. You've got it. 💪`,
      brokenCode: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My First Page</title>
  <head>
  <body>
    <h1>Hello, World!</h1>
    <p>My very first webpage. The structure is broken — fix it!</p>`,
      validationMode: 'contains',
      validationRules: {
        mustContain: ['</head>', '</body>', '</html>'],
        mustNotContain: ['  <head>\n  <body>'],
        ignoreCase: true,
        ignoreWhitespace: false,
      },
    },
  },
  // ── HTML 1: Fix the Navigation ────────────────────────────────────────────
  {
    id: 'html-nav',
    name: 'Fix the Navigation',
    track: 'HTML Basics',
    trackIcon: '🌐',
    description: 'Replace a <div> with the correct semantic <nav> element.',
    data: {
      language: 'html',
      track: 'HTML Basics',
      trackOrder: 2,
      concepts: ['HTML', 'semantic elements', 'nav', 'accessibility', 'SEO'],
      scenario: 'The site navigation is wrapped in a generic <div> — but HTML has a dedicated element for navigation. Screen readers can\'t recognise the nav landmark and keep users in the dark. Your mission: replace the <div class="nav"> with the correct semantic element.',
      theory: `── Quick recap: what is HTML doing? ─────────────────────────
HTML describes the STRUCTURE and MEANING of content. Not the look (that is CSS) — the meaning.

When you write <h1>Welcome</h1>, you are not just making text big. You are saying: "this is the most important heading on the page."

That distinction — communicating meaning — is what this puzzle is about.

── The problem with <div> ───────────────────────────────────
A <div> is a generic container. It means absolutely nothing on its own.

  <div class="nav">           ← just a box. Could be anything.
    <a href="/">Home</a>
  </div>

The class="nav" gives it a visual name, but it is just a label for your CSS — it communicates nothing to the browser, screen reader, or search engine.

── Semantic HTML ────────────────────────────────────────────
HTML5 (2014) introduced SEMANTIC elements — tags that describe WHAT the content is, not just how to group it.

Here are the most important ones you will use on every project:

  <header>     — the top section of a page or article (logo, nav, hero)
  <nav>        — a group of navigation links
  <main>       — the primary content area of the page (only ONE per page)
  <section>    — a themed grouping of related content with a heading
  <article>    — a self-contained, independently distributable piece (blog post, news item)
  <aside>      — secondary content, sidebars, callouts, related links
  <footer>     — the bottom section of a page or article

── Why does this matter? ────────────────────────────────────
There are three groups who benefit from semantic HTML:

1. SCREEN READER USERS
   Blind and low-vision users navigate with a screen reader. These tools
   understand semantic landmarks. When they encounter <nav>, they announce:
   "Navigation landmark" — and the user can jump straight to it with a single keystroke.
   With a <div>, there is no landmark. The user must listen to the entire page from the top.
   Over 1 billion people live with a disability. Semantic HTML costs you nothing and helps them enormously.

2. SEARCH ENGINES
   Google, Bing, and other search engines read HTML to understand your page.
   They know that links inside <nav> are navigation — and weight them differently
   to links inside <article> body text. Semantic HTML directly improves SEO.

3. DEVELOPERS
   When another developer (or future-you) reads the HTML, semantic elements are
   self-documenting. <nav> needs no explanation. <div class="nav"> requires context.

── The fix ──────────────────────────────────────────────────
Replace <div class="nav"> with <nav>
Replace the closing </div> with </nav>
The class="nav" attribute can be removed — <nav> already communicates the role.`,
      lessonSummary: `You replaced <div class="nav"> with <nav>. One element name changed — and the entire meaning of that block transformed. 🎉

What just happened:
  Before: a generic box with a CSS class label
  After:  a proper HTML landmark that browsers, screen readers, and search engines all understand

The real-world impact of your one-line fix:
  • Accessibility: a blind user can now press a keyboard shortcut to jump straight
    to the navigation landmark — instead of having to listen to the entire page from top.
  • SEO: Google now knows these are navigation links, not body content.
  • Developer experience: every person who reads this HTML instantly understands the purpose.

This is called "accessible by default" — making the right choice costs you nothing extra,
but it makes your site usable by millions more people.

Semantic elements to use from now on (instead of plain <div>):
  Site header?       → <header>
  Navigation links?  → <nav>
  Main content?      → <main>
  Related grouping?  → <section>
  Blog post / card?  → <article>
  Sidebar?           → <aside>
  Site footer?       → <footer>

You are already thinking like a professional front-end developer. 🚀`,
      brokenCode: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Mission: NavFix</title>
  </head>
  <body>
    <div class="nav">
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </div>
    <main>
      <h1>Welcome to the site!</h1>
      <p>The navigation above uses a plain div. Replace it with the correct semantic element.</p>
    </main>
  </body>
</html>`,
      validationMode: 'contains',
      validationRules: {
        mustContain: ['<nav>', '</nav>'],
        mustNotContain: ['<div class="nav">'],
        ignoreCase: true,
        ignoreWhitespace: false,
      },
    },
  },
  // ── HTML 2: Missing Alt Text ───────────────────────────────────────────────
  {
    id: 'html-alt',
    name: 'Missing Alt Text',
    track: 'HTML Basics',
    trackIcon: '🌐',
    description: 'Add a meaningful alt attribute to an img element.',
    data: {
      language: 'html',
      track: 'HTML Basics',
      trackOrder: 3,
      concepts: ['HTML', 'accessibility', 'alt text', 'img', 'WCAG'],
      scenario: 'A team photo is on the page with no alt attribute. When a screen reader hits it, the user hears nothing — or worse, the raw filename. Add a meaningful alt description so everyone gets the same information.',
      theory: `── The <img> element ────────────────────────────────────────
The <img> element displays an image. It has two essential attributes:

  <img src="team-photo.jpg" alt="Five engineers gathered around a whiteboard" />
       ↑                         ↑
       src = the image file      alt = a text description

  src (source)  — the path or URL to the image file. Required.
  alt (alternate text) — a text replacement for the image. Required for accessibility.

── What does alt actually do? ───────────────────────────────
alt serves THREE critical purposes:

  1. SCREEN READERS
     When a person who is blind browses your page with a screen reader,
     the software reads alt text aloud instead of showing the image.
     Without alt: the reader might say nothing, or read "team-photo-v3-final-FINAL.jpg"
     With alt:    the reader says "Five engineers gathered around a whiteboard"
     Which one gives the user the same information a sighted person gets?

  2. BROKEN IMAGES
     If the image file is missing, moved, or the network is slow,
     the alt text is displayed in the image's place.
     Without alt: the user sees a broken image icon and has no idea what was there.
     With alt:    the user reads the description and understands the context.

  3. SEARCH ENGINES
     Google Image Search relies on alt text to understand what images show.
     Images with good alt text appear in image search results.
     Images without it are essentially invisible to Google Images.

── How to write good alt text ───────────────────────────────

✅ Describe what is VISIBLE in the image:
  alt="A golden retriever playing fetch on a sunny beach"
  alt="Bar chart showing monthly sales rising 40% in Q3"
  alt="Five engineers gathered around a whiteboard with diagrams"

✅ For FUNCTIONAL images (icons used as buttons), describe the action:
  alt="Search"            ← for a magnifying glass icon on a search button
  alt="Close dialog"      ← for an × button
  alt="Share on Twitter"  ← for a Twitter icon button

✅ For DECORATIVE images (visual only, no meaning), use empty alt:
  alt=""     ← explicitly tells screen readers "skip this — it adds no information"
  Note: alt="" (empty string) is very different from omitting alt entirely.
  Missing alt = bad. Empty alt="" = intentional and correct for decorative images.

❌ Never do any of these:
  alt="image"                   — meaningless
  alt="photo.jpg"               — just repeating the filename
  alt="picture of a man"        — too vague; describe what matters
  (no alt attribute at all)     — screen readers will guess, often badly

── The accessibility standard ───────────────────────────────
The Web Content Accessibility Guidelines (WCAG) require descriptive alt text on all
meaningful images. This is a Level A requirement — the most basic accessibility standard.
Companies including Target, Domino's, and Netflix have faced lawsuits over missing alt text.

Writing alt text takes 5 extra seconds. It makes your site usable by everyone.`,
      lessonSummary: `You added a meaningful alt attribute to the image. That one attribute just opened this page up to blind and low-vision users. 🎉

Put yourself in their position:
Imagine browsing the web with your eyes closed, listening to a screen reader.
Every image without alt text is a complete mystery. The reader might say "image" or read a gobbledygook filename. With your alt text, the user hears exactly what you intended them to know.

The rule is simple — use it every single time you write an <img>:
  Does the image add meaning to the page?
    → Write a genuine description of what it shows.
  Is it purely decorative? (a divider line, a background texture)
    → Use alt="" (empty string) to tell screen readers to skip it.

This habit applies to everything you will ever build:
  Blog post?        → describe every photo
  Product page?     → describe every product image in detail
  Team page?        → introduce every person in the photo
  Icon buttons?     → describe what the icon does
  Charts/graphs?    → describe the data the chart shows

One attribute. Five seconds to write. Accessible to millions.
That mindset — building for everyone by default — is what defines great developers. 🌍`,
      brokenCode: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Our Team</title>
  </head>
  <body>
    <main>
      <h1>Our Team</h1>
      <img src="/images/team-photo.jpg" />
      <p>The best team around. Add an alt attribute to the image above!</p>
    </main>
  </body>
</html>`,
      validationMode: 'contains',
      validationRules: {
        mustContain: ['alt="'],
        mustNotContain: ['<img src="/images/team-photo.jpg" />'],
        ignoreCase: true,
        ignoreWhitespace: false,
      },
    },
  },
  // ── CSS 1: Fix Broken Flexbox ─────────────────────────────────────────────
  {
    id: 'css-flexbox',
    name: 'Fix Broken Flexbox',
    track: 'CSS Fundamentals',
    trackIcon: '🎨',
    description: 'Change display: block to display: flex to fix a stacking nav bar.',
    data: {
      language: 'css',
      track: 'CSS Fundamentals',
      trackOrder: 1,
      concepts: ['CSS', 'flexbox', 'display', 'layout', 'block vs flex'],
      scenario: 'The nav bar links should sit side by side in a row — but they\'re all stacking vertically. The developer left display set to the wrong value. One word is all that stands between a broken stack and a proper nav bar. Find it.',
      theory: `── What is CSS? ─────────────────────────────────────────────
If HTML is the skeleton of a webpage, CSS (Cascading Style Sheets) is everything you see — colours, fonts, spacing, and most importantly, LAYOUT.

CSS works through RULES. Each rule has three parts:

  selector {          ← WHICH element(s) to style
    property: value;  ← WHAT to change and HOW
  }

Example:
  nav {
    background: #1a1a2e;  ← property: background | value: #1a1a2e (a dark blue)
    padding: 16px;        ← property: padding     | value: 16px (space inside)
  }

── What is the "display" property? ─────────────────────────
Every HTML element has a default display type. The two most common defaults are:

  display: block

    The element takes up the FULL WIDTH of its container.
    Each block element starts on a NEW LINE below the previous one.
    Think of it like stacking bricks — one on top of the other.
    Examples: <p>, <div>, <h1>, <section>

  display: inline

    The element only takes up as much width as its content.
    Inline elements sit SIDE BY SIDE in a line of text.
    They cannot have a width or height set.
    Examples: <span>, <a>, <strong>, <em>

The problem: display: block stacks elements vertically.
For a navigation bar, we want items sitting horizontally side by side.
This is what Flexbox solves.

── What is Flexbox? ─────────────────────────────────────────
Flexbox (Flexible Box Layout) is a CSS layout model that makes arranging items in rows or columns simple and predictable.

You add display: flex to a CONTAINER. All direct children of that container
automatically become "flex items" and line up side by side.

  Before display: flex      After display: flex
  ┌────────┐                ┌──────┬──────┬──────┐
  │ Home   │                │ Home │About │ Blog │
  ├────────┤                └──────┴──────┴──────┘
  │ About  │
  ├────────┤
  │ Blog   │
  └────────┘

── Key Flexbox properties on the container ─────────────────
  display: flex                — activates Flexbox (all children line up in a row)
  flex-direction: row          — left to right (this is the DEFAULT)
  flex-direction: column       — top to bottom
  gap: 16px                    — space between each child element
  align-items: center          — vertically centres all children
  align-items: flex-start      — aligns children to the top
  justify-content: center      — horizontally centres all children
  justify-content: space-between — pushes children to opposite ends
  justify-content: flex-end    — pushes children to the right

── On flex children (individual items) ─────────────────────
  flex: 1    — this child grows to fill all available space
  flex: 0    — this child stays exactly its content size

── The fix ──────────────────────────────────────────────────
Change: display: block;
To:     display: flex;

That single word switches the container from vertical stacking to horizontal layout.`,
      lessonSummary: `You changed display: block to display: flex — and the vertical stack became a horizontal row. 🎉

That single word is the most important CSS discovery you will make as a beginner.

Here is exactly what happened:
  display: block  →  each item occupies the full container width and stacks
  display: flex   →  children automatically line up side by side in a row

Flexbox is used on virtually every modern website for layout:
  Navigation bars      → items side by side
  Card grids           → cards in a row that wrap on small screens
  Hero sections        → text on the left, image on the right
  Button rows          → icon + label aligned vertically
  Centring things      → justify-content: center + align-items: center

Before Flexbox existed (before 2012), developers used floats, position: absolute, and
inline-block hacks to build horizontal layouts. It was miserable and error-prone.
Flexbox replaced decades of CSS headaches with something that actually makes sense.

Experiment now: add justify-content: space-between to the nav rule and watch
the links spread to opposite ends. That is the power of one more property. 🧪

You now have the key to every horizontal layout in CSS. Use it constantly.`,
      brokenCode: `nav {
  display: block;
  gap: 16px;
  padding: 16px 24px;
  background: #1a1a2e;
}

nav a {
  color: #e2e8f0;
  text-decoration: none;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(255,255,255,0.07);
}

/* Change the display value on nav to make links sit side by side */`,
      validationMode: 'contains',
      validationRules: {
        mustContain: ['display: flex'],
        mustNotContain: ['display: block'],
        ignoreCase: true,
        ignoreWhitespace: false,
      },
    },
  },
  // ── CSS 2: Centre a Button ────────────────────────────────────────────────
  {
    id: 'css-center',
    name: 'Centre a Button',
    track: 'CSS Layout',
    trackIcon: '🎨',
    description: 'Horizontally centre a button using display: block and margin: 0 auto.',
    data: {
      language: 'css',
      track: 'CSS Layout',
      trackOrder: 1,
      concepts: ['CSS', 'box model', 'margin auto', 'centering', 'display block'],
      scenario: 'The hero section\'s call-to-action button is stuck to the left edge of its container. It needs to be perfectly centred. The designer is watching. Two CSS declarations are all you need.',
      theory: `── The CSS Box Model ─────────────────────────────────────────
Before you can understand centering, you need to understand how CSS treats every element.

Every element is a RECTANGULAR BOX made of four layers, from inside to outside:

  ┌──────────────────────────────────────────┐
  │              MARGIN                      │  ← invisible space outside the border
  │  ┌────────────────────────────────────┐  │
  │  │            BORDER                  │  │  ← the visible edge (if you set one)
  │  │  ┌──────────────────────────────┐  │  │
  │  │  │          PADDING             │  │  │  ← space INSIDE the border
  │  │  │  ┌────────────────────────┐  │  │  │
  │  │  │  │       CONTENT          │  │  │  │  ← your text, image, etc.
  │  │  │  └────────────────────────┘  │  │  │
  │  │  └──────────────────────────────┘  │  │
  │  └────────────────────────────────────┘  │
  └──────────────────────────────────────────┘

  padding  — pushes content AWAY FROM the border (space inside)
  border   — the visible line around the element
  margin   — pushes OTHER ELEMENTS away (space outside)

Understanding the box model is essential — nearly every CSS layout problem
is a question of which layer you need to adjust.

── display: block vs display: inline ───────────────────────
A <button> element is display: inline by default.
Inline elements:
  • Only take up as much width as their content
  • Ignore top/bottom margin
  • Cannot be centred with margin: auto

To centre using margin: auto, you must first make the element display: block.
A block element:
  • Takes up the full width of its container (unless you constrain it)
  • Honours all margins, including auto margins

── How margin: auto works ───────────────────────────────────
When you set margin: 0 auto on a block element, here is what happens:

  margin: 0 auto
          ↑   ↑
          │   └── LEFT and RIGHT margin = auto
          └─────── TOP and BOTTOM margin = 0

"auto" tells the browser: "calculate how much space is left over in the container
after this element, and assign it all to this margin side."

When BOTH left and right are auto, the browser splits the leftover space equally:
left auto = [  ½ of remaining space  ]  [element]  [  ½ of remaining space  ] = right auto

The element ends up perfectly centred. ✓

── Step by step ─────────────────────────────────────────────
.cta {
  display: block;       /* step 1: make it a block element */
  width: fit-content;   /* step 2: shrink to its content width (not full-width)  */
  margin: 0 auto;       /* step 3: split remaining space equally left and right  */
}

── Important: the element must be narrower than its container ──
margin: auto only works if there IS leftover space to split.
If the element is 100% wide (full width), there is nothing left to distribute.
That is why width: fit-content or a fixed pixel width is required.

── Modern alternative ───────────────────────────────────────
You can also centre by putting Flexbox on the PARENT container:
  .hero {
    display: flex;
    justify-content: center;
  }
Both approaches are correct. margin: auto is classic; Flexbox is modern.`,
      lessonSummary: `You added display: block and margin: 0 auto to centre the button. It is now perfectly positioned. 🎉

Let's cement exactly why this works:

1. display: block
   The button is inline by default — it sits in the text flow and ignores auto margins.
   Changing it to block makes it participate in block layout, where margin: auto is meaningful.

2. margin: 0 auto
   "0" = no top or bottom margin
   "auto" on both left and right = browser divides remaining horizontal space equally
   Equal space on both sides = centred

This pattern applies to FAR more than just buttons. It is how every website with a content
column centres its entire layout:

  .page-wrapper {
    max-width: 1200px;
    margin: 0 auto;      ← this centres the entire page content
  }

That is the exact CSS pattern used by virtually every website you have ever visited.
Now you know precisely how it works — not just that it works.

You now understand:
  ✓ The CSS box model (margin, border, padding, content)
  ✓ The difference between display: block and display: inline
  ✓ How margin: auto distributes space
  ✓ How to centre any block element on the page

These fundamentals sit underneath every CSS layout you will ever build. 💡`,
      brokenCode: `body {
  font-family: sans-serif;
  padding: 60px 20px;
  background: #0f172a;
  color: #e2e8f0;
}

.hero {
  background: #1e293b;
  padding: 60px 40px;
  border-radius: 12px;
  text-align: center;
}

.cta {
  background: #6366f1;
  color: white;
  padding: 14px 36px;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  /* Add two properties here to centre this button */
}`,
      validationMode: 'contains',
      validationRules: {
        mustContain: ['margin: 0 auto', 'display: block'],
        ignoreCase: true,
        ignoreWhitespace: false,
      },
    },
  },
  // ── JS 0: Let vs Const ────────────────────────────────────────────────────
  {
    id: 'js-variables',
    name: 'Let vs Const',
    track: 'JS Fundamentals',
    trackIcon: '⚡',
    description: 'Fix a TypeError — a const variable is being reassigned where let should be used.',
    data: {
      language: 'javascript',
      track: 'JS Fundamentals',
      trackOrder: 1,
      concepts: ['JavaScript', 'variables', 'let', 'const', 'TypeError', 'declarations'],
      scenario: 'The score counter looks perfect but throws an error the moment you click the button. The console says "Assignment to constant variable." You\'ve found your culprit — now hunt down the wrong declaration and fix it.',
      theory: `── What is JavaScript? ──────────────────────────────────────
If HTML is the skeleton of a page and CSS is the visual style, JavaScript is the BEHAVIOUR.

JavaScript makes webpages interactive:
  Buttons that do things when clicked
  Forms that validate before submission
  Content that updates without reloading the page
  Saving data, loading data, running games — all JavaScript

── What is a variable? ─────────────────────────────────────
A VARIABLE is a named container for storing a value in memory.

Think of it as a labelled box:
  → You write a name on the box (the variable name)
  → You put something inside (the value)
  → Later, you can look inside and read the value
  → And depending on the type of box, you may or may not be able to swap the contents

── The three ways to declare a variable ────────────────────
Modern JavaScript (ES2015, also called ES6) introduced two keywords:

  const
    Short for "constant". Once you put something in the box, the box is SEALED.
    You can READ the value, but you CANNOT reassign it.
    If you try to reassign a const variable, JavaScript throws a TypeError immediately.

    const pi = 3.14159;
    const siteName = 'PuzzleWarz';
    pi = 3;    ← TypeError: Assignment to constant variable. 🚫

  let
    The box STAYS OPEN. You can replace the contents at any time.
    Use let for values that are expected to change over time.

    let score = 0;
    score = score + 1;    ← works perfectly ✓
    let currentUser = null;
    currentUser = 'alice@example.com';    ← works perfectly ✓

  var (the old keyword — avoid it)
    Works similarly to let, but with confusing "hoisting" and scoping behaviours.
    All modern JavaScript code uses const and let. Never use var in new code.

── The golden rule ──────────────────────────────────────────
  DEFAULT to const for everything.
  Switch to let ONLY when you know the value will be reassigned.

This makes your code easier to understand at a glance:
  If you see const → this value never changes. You can trust it.
  If you see let   → this value might change somewhere below. Stay alert.

── When const does NOT mean "immutable" ─────────────────────
An important nuance: const prevents REASSIGNMENT of the variable itself,
but it does NOT prevent changes to the CONTENTS of objects or arrays:

  const user = { name: 'Alice', score: 0 };
  user.score = 100;     ← ✓ allowed: you changed a property, not the variable
  user = { name: 'Bob' }; ← 🚫 TypeError: you tried to reassign the variable

For now, remember: const = don't reassign. let = can reassign.

── The bug in this puzzle ───────────────────────────────────
The score starts at 0 with const count = 0.
The click handler then tries to do count = count + 1.
But count was declared with const — you cannot reassign it.

JavaScript throws:  TypeError: Assignment to constant variable.

The fix: change const count to let count.`,
      lessonSummary: `You changed const count to let count — and the counter works without errors. 🎉

Here is exactly what you fixed:
  const count = 0;       ← the box is sealed. count can never be reassigned.
  ↓ change to ↓
  let count = 0;         ← the box is open. count can be updated anytime.

The mental model to carry with you forever:
  const = sealed box.    Perfect for values that should NEVER change.
  let   = open box.      Required for values that WILL change.

Real-world examples of each:
  const TAX_RATE = 0.2;          ← tax rate doesn't change mid-function
  const API_URL = 'https://...'; ← the URL is fixed
  let   cartTotal = 0;           ← the total grows as items are added
  let   currentPage = 1;         ← the page changes as the user navigates

Best practice:
  1. Write const by default
  2. If you get "Assignment to constant variable" — it means JavaScript is telling
     you that value needs to change. Switch that specific variable to let.
  3. Never use var in modern code.

You now understand one of the absolute cornerstones of JavaScript.
Every single piece of JavaScript ever written uses variables.
You've got this one right. 🏆`,
      brokenCode: `const app = document.getElementById('app');
app.innerHTML =
  '<h2 style="font-family:sans-serif;color:#e2e8f0;margin-bottom:12px">Score Counter</h2>' +
  '<button id="score-btn" style="padding:10px 24px;font-size:16px;cursor:pointer;border-radius:6px;background:#6366f1;color:white;border:none">+ Add Point</button>' +
  '<p style="font-family:sans-serif;font-size:22px;color:#e2e8f0;margin-top:16px">Score: <strong id="score-display">0</strong></p>';

// BUG: const cannot be reassigned — change it to the correct keyword
const count = 0;

const btn = document.getElementById('score-btn');
const display = document.getElementById('score-display');

btn.addEventListener('click', function () {
  count = count + 1;
  display.textContent = count;
});`,
      validationMode: 'contains',
      validationRules: {
        mustContain: ['let count'],
        mustNotContain: ['const count = 0'],
        ignoreCase: false,
        ignoreWhitespace: false,
      },
    },
  },
  // ── JS 1: Fix the Typo ────────────────────────────────────────────────────
  {
    id: 'js-typo',
    name: 'Fix the Typo',
    track: 'JS DOM',
    trackIcon: '⚡',
    description: 'A click handler is dead — the event name is misspelled. Find it and fix it.',
    data: {
      language: 'javascript',
      track: 'JS DOM',
      trackOrder: 1,
      concepts: ['JavaScript', 'DOM', 'events', 'addEventListener', 'debugging'],
      scenario: 'The click counter looks perfect — styled button, number display, clean code. But clicking the button does absolutely nothing. No error in the console, nothing. The bug is invisible unless you know where to look.',
      theory: `── What is JavaScript for? ──────────────────────────────────
If HTML is the skeleton and CSS is the appearance, JavaScript is the BEHAVIOUR.

JavaScript makes webpages interactive:
  Buttons that do things when you click them
  Forms that validate before you submit
  Content that updates without reloading the page
  Shopping carts, games, chat apps, live score boards — all JavaScript

── What is the DOM? ─────────────────────────────────────────
When your browser loads an HTML file, it does not just display it.
It builds a live, interactive tree structure in memory called the
Document Object Model (DOM).

JavaScript can read and modify this tree:
  // Find an element by its id attribute
  const btn = document.getElementById('my-button');

  // Find an element by CSS selector
  const heading = document.querySelector('h1');

Once you have a reference to an element, you can change it:
  heading.textContent = 'New Title';       ← change text
  heading.style.color = 'red';             ← change a CSS property
  heading.innerHTML = '<em>Italic</em>';   ← change inner HTML

── What are Events? ─────────────────────────────────────────
An EVENT is something that happens — most commonly a user action.

The browser fires events constantly:
  User clicks a button      → 'click' event fires on the button
  User types a character    → 'keydown' event fires on the window
  User submits a form       → 'submit' event fires on the form
  Page finishes loading     → 'load' event fires on the window

── addEventListener ─────────────────────────────────────────
You use addEventListener to tell JavaScript: "when THIS event happens
on THIS element, run THIS function."

  element.addEventListener(eventType, callbackFunction);

  ↑ element          — the DOM element to watch
  ↑ eventType        — WHAT to listen for, as a string
  ↑ callbackFunction — a function that runs when the event fires

Example:
  const btn = document.getElementById('my-btn');

  btn.addEventListener('click', function () {
    console.log('Button was clicked!');
  });

── The most important event types to memorise ───────────────
These are all exact strings — every character matters:

  'click'       — mouse click or screen tap
  'dblclick'    — double click
  'keydown'     — any key pressed (fires while held)
  'keyup'       — any key released
  'input'       — text input changed (instant, every keystroke)
  'change'      — input value changed and focus has left
  'submit'      — form submitted (Enter key or submit button)
  'mouseover'   — cursor enters the element
  'mouseout'    — cursor leaves the element
  'focus'       — element receives keyboard/tab focus
  'blur'        — element loses focus
  'load'        — page or image has finished loading
  'scroll'      — user has scrolled the element or window

── The silent bug ───────────────────────────────────────────
If you misspell the event name, JavaScript does NOT throw an error.
It silently attaches a listener to an event that will NEVER fire.

  btn.addEventListener('klick', handler);   ← attaches, but 'klick' never fires
  btn.addEventListener('click', handler);   ← fires on every click ✓

This is one of the most confusing beginner bugs because there is no
error message, no warning, nothing in the console. The code just... does nothing.

The fix: check the event name spelling first.`,
      lessonSummary: `You found the misspelled event name — 'klick' → 'click' — and the counter now works. 🎉

This bug teaches one of the most important debugging instincts in all of programming:

  "My code runs without errors — it just doesn't DO anything."

When a click handler is dead, check these four things in order:
  1. Is the event name spelled correctly? ('click' not 'klick')
  2. Did getElementById/querySelector find the right element? (log it: console.log(btn))
  3. Is the code running at the right time? (is the element in the DOM yet when the listener is set up?)
  4. Is the function doing what you think? (add console.log('handler fired') inside it)

The habit of checking event name spelling first will save you hours over your career.

Here is the bigger picture of what you now understand:
The fundamental pattern that makes every interactive website work:
  1. Get an element from the DOM      document.getElementById(...)
  2. Listen for an event              .addEventListener('click', ...)
  3. Run a function that changes the page   function() { ... }

Every button on every website, every to-do list toggle, every live search box,
every game control — all of them are this exact same pattern.

You have it. Go build something. 🚀`,
      brokenCode: `// Build the counter UI
const app = document.getElementById('app');
app.innerHTML =
  '<button id="counter-btn" style="padding:12px 28px;font-size:18px;cursor:pointer;border-radius:6px;background:#6366f1;color:white;border:none">Click me!</button>' +
  '<p style="font-family:sans-serif;font-size:24px;margin-top:16px;color:#e2e8f0">Count: <strong id="count-display">0</strong></p>';

let count = 0;
const btn = document.getElementById('counter-btn');
const display = document.getElementById('count-display');

// BUG: the event name is misspelled — fix it so the handler fires
btn.addEventListener('klick', function () {
  count = count + 1;
  display.textContent = count;
});`,
      validationMode: 'contains',
      validationRules: {
        mustContain: ["'click'"],
        mustNotContain: ["'klick'"],
        ignoreCase: true,
        ignoreWhitespace: false,
      },
    },
  },
  // ── JS 2: Wrong Operator Bug ───────────────────────────────────────────────
  {
    id: 'js-operator',
    name: 'Wrong Operator Bug',
    track: 'JS Fundamentals',
    trackIcon: '⚡',
    description: 'A function uses + instead of * — fix the maths operator to get the right area.',
    data: {
      language: 'javascript',
      track: 'JS Fundamentals',
      trackOrder: 2,
      concepts: ['JavaScript', 'functions', 'arithmetic operators', 'logic bugs', 'debugging'],
      scenario: 'The circle area calculator is running and showing numbers — but every answer is completely wrong. The code has no errors. There is no crash. The bug is purely in the maths. Spot what the formula is doing vs what it should do.',
      theory: `── What is a function? ──────────────────────────────────────
A FUNCTION is a reusable block of code that performs a specific task.

You DEFINE a function once:
  function greet(name) {
    return 'Hello, ' + name + '!';
  }

Then you CALL it as many times as you need:
  greet('Alice')   → 'Hello, Alice!'
  greet('Bob')     → 'Hello, Bob!'
  greet('World')   → 'Hello, World!'

Parts of a function:

  function  ← keyword: "I am defining a function"
  greet     ← the name you give this function
  (name)    ← PARAMETER: an input the function accepts (like a variable)
  { ... }   ← BODY: the code that runs when the function is called
  return    ← sends a value BACK to whoever called the function

Functions prevent repetition. Instead of writing the same logic ten times,
you write it once and call it ten times.

── JavaScript arithmetic operators ──────────────────────────
JavaScript does maths. The symbols are mostly familiar from school:

  Symbol  Operation               Example         Result
  ──────────────────────────────────────────────────────────
    +     Addition                5 + 3           8
    -     Subtraction             10 - 4          6
    *     Multiplication          4 * 7           28
    /     Division                20 / 5          4
    **    Exponentiation          2 ** 8          256  (2 to the power of 8)
    %     Remainder (modulo)      17 % 5          2    (leftover after dividing 17 ÷ 5)

Important trap: + also concatenates strings:
  1 + 2         → 3        (number + number = number)
  '1' + 2       → '12'     (string + number = string — JavaScript converts the number!)
  1 + '2'       → '12'     (same — string wins)

That last point trips up intermediate developers regularly. Keep it in mind.

── The area of a circle ─────────────────────────────────────
Mathematics formula:  A = π × r²
In English:           Area = Pi MULTIPLIED BY radius SQUARED

In JavaScript:
  return Math.PI * radius * radius;
  // or equivalently:
  return Math.PI * radius ** 2;

Math.PI is a built-in JavaScript constant: approximately 3.14159265358979...

── The bug in this puzzle ───────────────────────────────────
The function is written like this:
  return Math.PI + radius + radius;
              ↑           ↑
           addition!    addition!

For radius = 5, this gives:
  3.14159 + 5 + 5 = 13.14   ← completely wrong

The correct answer is:
  3.14159 × 5 × 5 = 78.54   ← multiply, not add

The operators + and * look very similar at a glance — easy to type wrong.

── Logic bugs vs syntax errors ──────────────────────────────
A SYNTAX ERROR means you broke JavaScript's grammar rules.
The browser refuses to run the code at all. You see a red error in the console.

A LOGIC BUG means the code runs perfectly — but produces the WRONG answer.
JavaScript has no idea the maths is wrong. Only you can catch it by testing.

This is why developers ALWAYS test functions with inputs where they KNOW the expected output:
  calculateArea(5)  should return approximately 78.54
  calculateArea(1)  should return approximately 3.14  (a circle with radius 1 has area π)
  calculateArea(0)  should return 0

If the output doesn't match → the logic is wrong somewhere.`,
      lessonSummary: `You swapped + for * and the formula now returns the correct area. 🎉

What made this bug sneaky:
  • The code ran without any errors — JavaScript had no idea + was wrong
  • The function returned a NUMBER — just completely the wrong number
  • Without testing against known values (78.54 for radius 5), this bug stays invisible forever

This is a LOGIC BUG — valid JavaScript that does the wrong thing.

The debugging skill you just practised:
  → Test your functions with inputs where you KNOW the expected output
  → If the output doesn't match, the bug is in your logic or maths
  → Work backwards: what operation would produce the WRONG number you're seeing?
     3.14159 + 5 + 5 = 13.14  →  the + symbols gave it away

Understanding the difference between + and * might seem trivial — but the
extra confusion is that + also does string concatenation. Many bugs in real
production code come down to "I thought JavaScript would treat this as a number
but it treated it as a string." Testing saves you every time.

You have now experienced the core of the debugging mindset:
  Don't just ask "does it run?"
  Ask "does it produce the RIGHT answer?"

That distinction is what separates a developer who ships quality code from one who ships bugs. 🧠`,
      brokenCode: `// Build the demo UI
const app = document.getElementById('app');

function calculateArea(radius) {
  // BUG: wrong operator — this adds instead of multiplying
  return Math.PI + radius + radius;
}

app.innerHTML =
  '<h2 style="font-family:sans-serif;color:#e2e8f0">Circle Area Calculator</h2>' +
  '<p style="font-family:sans-serif;color:#e2e8f0">area(5) = ' + calculateArea(5).toFixed(2) + ' (correct answer: 78.54)</p>' +
  '<p style="font-family:sans-serif;color:#e2e8f0">area(3) = ' + calculateArea(3).toFixed(2) + ' (correct answer: 28.27)</p>' +
  '<p style="font-family:sans-serif;color:#e2e8f0">area(1) = ' + calculateArea(1).toFixed(2) + ' (correct answer: 3.14)</p>';`,
      validationMode: 'regex',
      validationRules: {
        regex: 'math\\.pi\\s*\\*\\s*radius\\s*\\*\\s*radius|math\\.pi\\s*\\*\\s*radius\\s*\\*\\*\\s*2',
        ignoreCase: true,
        ignoreWhitespace: false,
      },
    },
  },
];

interface PuzzleTypeFieldsProps {
  puzzleType: string;
  puzzleData: Record<string, unknown>;
  onDataChange: (key: string, value: unknown) => void;
}

export default function PuzzleTypeFields({ puzzleType, puzzleData, onDataChange }: PuzzleTypeFieldsProps) {
  const [detectiveJson, setDetectiveJson] = useState<string>('');
  const [detectiveJsonError, setDetectiveJsonError] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [templateConfirm, setTemplateConfirm] = useState(false);

  useEffect(() => {
    if (puzzleType !== 'detective_case') return;

    const existing = (puzzleData as any)?.detectiveCase;
    const template = {
      noirTitle: 'The Blackout Ledger',
      intro: 'It rained like the city wanted to wash itself clean. It never does.',
      lockMode: 'fail_once',
      stages: [
        {
          id: 'scene',
          title: 'The Scene',
          prompt: 'A matchbook sits in the ashtray. One word is scratched into the cover. Submit it.',
          kind: 'text',
          expectedAnswer: 'EMBER-11',
          ignoreCase: true,
          ignoreWhitespace: true,
        },
        {
          id: 'matchbook',
          title: 'The Matchbook',
          prompt: 'On the inside flap: “11:07 Special”. The bartender knows the code. Submit it.',
          kind: 'text',
          expectedAnswer: 'ECLIPSE-3',
          ignoreCase: true,
          ignoreWhitespace: true,
        },
        {
          id: 'ledger',
          title: 'The Ledger',
          prompt: 'The carbon copy bleeds through. A number keeps showing up. Submit it.',
          kind: 'text',
          expectedAnswer: 'CARBON-9',
          ignoreCase: true,
          ignoreWhitespace: true,
        },
      ],
    };

    try {
      const next = existing && typeof existing === 'object' ? existing : template;
      setDetectiveJson(JSON.stringify(next, null, 2));
      setDetectiveJsonError('');
      // Ensure the parent form actually has detectiveCase data even if the admin never edits the JSON textarea.
      onDataChange('detectiveCase', next);
    } catch {
      setDetectiveJson(JSON.stringify(template, null, 2));
      setDetectiveJsonError('');
      onDataChange('detectiveCase', template);
    }
    // Only reset when switching types or when a new puzzleData object is passed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleType]);
  const asString = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return fallback;
  };

  const asNumber = (value: unknown, fallback: number): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  };

  const asNumberOrEmpty = (value: unknown): number | '' => {
    if (value == null || value === '') return '';
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return '';
  };

  const asStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[];
    if (typeof value === 'string') {
      return value
        .split(/\r?\n|,/g)
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return [];
  };

  const updateValidationRule = (key: string, value: unknown) => {
    const existing = (puzzleData.validationRules && typeof puzzleData.validationRules === 'object')
      ? (puzzleData.validationRules as Record<string, unknown>)
      : {};
    onDataChange('validationRules', { ...existing, [key]: value });
  };

  const renderJigsawFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Grid Rows</label>
          <input
            type="number"
            min={2}
            max={50}
            value={asNumber(puzzleData.gridRows, 3)}
            onChange={(e) => onDataChange('gridRows', parseInt(e.target.value, 10))}
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Grid Cols</label>
          <input
            type="number"
            min={2}
            max={50}
            value={asNumber(puzzleData.gridCols, 4)}
            onChange={(e) => onDataChange('gridCols', parseInt(e.target.value, 10))}
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Snap Tolerance (px)</label>
        <input
          type="number"
          min={1}
          max={100}
          value={asNumber(puzzleData.snapTolerance, 12)}
          onChange={(e) => onDataChange('snapTolerance', parseInt(e.target.value, 10))}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        />
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={Boolean(puzzleData.rotationEnabled)}
          onChange={(e) => onDataChange('rotationEnabled', e.target.checked)}
          className="h-4 w-4"
        />
        Rotation Enabled
      </label>
    </div>
  );

  const renderCodeMasterFields = () => (
    <div className="space-y-4">

      {/* ── 🚀 Starter Templates ─────────────────────────────── */}
      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base font-semibold text-indigo-300">🚀 Starter Templates</span>
          <span className="text-xs text-gray-400">— load a ready-made puzzle and customise it</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
          {CODE_MASTER_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => { setTemplateId(tpl.id); setTemplateConfirm(false); }}
              className={`text-left rounded-lg border p-3 transition-all ${
                templateId === tpl.id
                  ? 'border-indigo-400 bg-indigo-500/20'
                  : 'border-slate-600 bg-slate-700/40 hover:border-indigo-500/60 hover:bg-slate-700/70'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{tpl.trackIcon}</span>
                <span className="text-xs font-semibold text-indigo-300">{tpl.track}</span>
              </div>
              <div className="text-sm font-semibold text-white mb-0.5">{tpl.name}</div>
              <div className="text-xs text-gray-400 leading-relaxed">{tpl.description}</div>
            </button>
          ))}
        </div>
        {templateId && !templateConfirm && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <span className="text-sm text-amber-200 flex-1">
              ⚠️ Loading <strong>{CODE_MASTER_TEMPLATES.find(t => t.id === templateId)?.name}</strong> will overwrite the fields below. Continue?
            </span>
            <button
              type="button"
              onClick={() => {
                const tpl = CODE_MASTER_TEMPLATES.find(t => t.id === templateId);
                if (tpl) {
                  Object.entries(tpl.data).forEach(([key, value]) => onDataChange(key, value));
                }
                setTemplateConfirm(true);
              }}
              className="px-3 py-1.5 rounded text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
            >
              Yes, load it
            </button>
            <button
              type="button"
              onClick={() => setTemplateId('')}
              className="px-3 py-1.5 rounded text-sm bg-slate-600 hover:bg-slate-500 text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
        {templateId && templateConfirm && (
          <div className="p-2 text-sm text-green-300 bg-green-500/10 border border-green-500/30 rounded-lg">
            ✅ Template loaded — edit the fields below, set the <strong>Title</strong> at the top, then click Create Puzzle.
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Learning Track</label>
          <select
            value={asString(puzzleData.track, '')}
            onChange={(e) => onDataChange('track', e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
          >
            <option value="">— None / standalone —</option>
            <optgroup label="HTML">
              <option value="HTML Basics">HTML Basics</option>
              <option value="HTML Structure">HTML Structure</option>
              <option value="HTML Forms">HTML Forms</option>
            </optgroup>
            <optgroup label="CSS">
              <option value="CSS Fundamentals">CSS Fundamentals</option>
              <option value="CSS Layout">CSS Layout</option>
              <option value="CSS Animations">CSS Animations</option>
            </optgroup>
            <optgroup label="JavaScript">
              <option value="JS Fundamentals">JS Fundamentals</option>
              <option value="JS DOM">JS DOM</option>
              <option value="JS Async">JS Async</option>
            </optgroup>
            <optgroup label="Advanced">
              <option value="TypeScript">TypeScript</option>
              <option value="Python">Python</option>
            </optgroup>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Level / Order</label>
          <input
            type="number"
            min={1}
            max={999}
            value={puzzleData.trackOrder != null ? Number(puzzleData.trackOrder) : ''}
            onChange={(e) => onDataChange('trackOrder', e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 1"
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
          />
        </div>
      </div>

      {/* ── Concept Tags ───────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Concept Tags <span className="font-normal text-gray-500">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={Array.isArray(puzzleData.concepts) ? (puzzleData.concepts as string[]).join(', ') : asString(puzzleData.concepts, '')}
          onChange={(e) => onDataChange('concepts', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          placeholder="e.g. HTML, semantic elements, nav"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>

      {/* ── Scenario ───────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Scenario</label>
        <textarea
          value={asString(puzzleData.scenario, '')}
          onChange={(e) => onDataChange('scenario', e.target.value)}
          placeholder="Describe the mission and what's broken"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>

      {/* ── Theory (Learn Before You Code) ─────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          📖 Learn Before You Code <span className="font-normal text-gray-500">(theory shown above editor)</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Explain the concept the puzzle is teaching. Shown as a collapsible panel before users start coding — open by default.
        </p>
        <textarea
          value={asString(puzzleData.theory, '')}
          onChange={(e) => onDataChange('theory', e.target.value)}
          placeholder={`e.g. The <nav> element is a semantic HTML5 landmark used to group major navigation links.\n\nUsing <nav> instead of <div> tells browsers and screen readers that this block contains navigation. It improves accessibility and helps search engines understand your page structure.\n\nExample:\n<nav>\n  <a href="/home">Home</a>\n  <a href="/about">About</a>\n</nav>`}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-40 font-mono text-xs"
        />
      </div>

      {/* ── Lesson Summary (post-solve reveal) ────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          🎉 Lesson Summary <span className="font-normal text-gray-500">(shown in celebration after solve)</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Explain what users just learned and WHY the fix works. Revealed only after a correct submission.
        </p>
        <textarea
          value={asString(puzzleData.lessonSummary, '')}
          onChange={(e) => onDataChange('lessonSummary', e.target.value)}
          placeholder={`e.g. You just replaced a generic <div> with a semantic <nav> element.\n\nWhy it matters:\n• Screen readers announce "navigation" to users — helping accessibility.\n• Search engines use <nav> to understand your page layout.\n• Your HTML is now self-documenting — any developer reading it immediately knows this is a nav block.\n\nKey rule: Use semantic elements whenever the content has a clear meaning.`}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-40 font-mono text-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Language</label>
          <select
            value={asString(puzzleData.language, 'html')}
            onChange={(e) => onDataChange('language', e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
          >
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Validation Mode</label>
          <select
            value={asString(puzzleData.validationMode, 'exact')}
            onChange={(e) => onDataChange('validationMode', e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
          >
            <option value="exact">Exact Match</option>
            <option value="contains">Must Contain</option>
            <option value="regex">Regex</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Broken Code</label>
        <textarea
          value={asString(puzzleData.brokenCode, '')}
          onChange={(e) => onDataChange('brokenCode', e.target.value)}
          placeholder="Paste the broken code"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-32 font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Prefill CSS <span className="font-normal text-gray-500">(optional — for HTML puzzles)</span></label>
        <textarea
          value={asString(puzzleData.prefillCss, '')}
          onChange={(e) => onDataChange('prefillCss', e.target.value)}
          placeholder="Optional CSS to prefill styles.css"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24 font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          Multi-file Override <span className="font-normal text-gray-500">(JSON — overrides Broken Code above)</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Provide a JSON object mapping file paths to code. When set, this replaces the Broken Code field.
          Example: <code className="text-indigo-300">&#123; "/index.html": "...", "/styles.css": "..." &#125;</code>
        </p>
        <textarea
          value={puzzleData.files ? JSON.stringify(puzzleData.files, null, 2) : ''}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!raw) { onDataChange('files', null); return; }
            try {
              const parsed = JSON.parse(raw);
              if (typeof parsed === 'object' && parsed !== null) onDataChange('files', parsed);
            } catch { /* let them keep typing */ }
          }}
          placeholder={`{\n  "/index.html": "<!doctype html>...",\n  "/styles.css": "body { ... }"\n}`}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-28 font-mono text-xs"
          spellCheck={false}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Expected Fix</label>
        <textarea
          value={asString(puzzleData.expectedFix, '')}
          onChange={(e) => onDataChange('expectedFix', e.target.value)}
          placeholder="What should the fixed code look like?"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-32 font-mono"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Must Contain (comma or newline)</label>
          <textarea
            value={asStringArray((puzzleData.validationRules as Record<string, unknown> | undefined)?.mustContain).join('\n')}
            onChange={(e) => updateValidationRule('mustContain', asStringArray(e.target.value))}
            placeholder="e.g., <nav>"
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Must Not Contain (comma or newline)</label>
          <textarea
            value={asStringArray((puzzleData.validationRules as Record<string, unknown> | undefined)?.mustNotContain).join('\n')}
            onChange={(e) => updateValidationRule('mustNotContain', asStringArray(e.target.value))}
            placeholder="e.g., <center>"
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Regex (optional)</label>
        <input
          type="text"
          value={asString((puzzleData.validationRules as Record<string, unknown> | undefined)?.regex, '')}
          onChange={(e) => updateValidationRule('regex', e.target.value)}
          placeholder="e.g., <nav>.*</nav>"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={Boolean((puzzleData.validationRules as Record<string, unknown> | undefined)?.ignoreCase)}
            onChange={(e) => updateValidationRule('ignoreCase', e.target.checked)}
            className="h-4 w-4"
          />
          Ignore Case
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={Boolean((puzzleData.validationRules as Record<string, unknown> | undefined)?.ignoreWhitespace)}
            onChange={(e) => updateValidationRule('ignoreWhitespace', e.target.checked)}
            className="h-4 w-4"
          />
          Ignore Whitespace
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={(puzzleData.validationRules as Record<string, unknown> | undefined)?.colorFlex !== false}
            onChange={(e) => updateValidationRule('colorFlex', e.target.checked)}
            className="h-4 w-4"
          />
          Match Color Names (e.g., blue)
        </label>
      </div>
    </div>
  );

  const renderDetectiveCaseFields = () => (
    <div className="space-y-3">
      <div className="text-sm text-gray-300">
        Paste a <span className="font-semibold">detectiveCase</span> JSON object. This puzzle type is multi-stage and locks forever on the first wrong submission.
      </div>
      <textarea
        value={detectiveJson}
        onChange={(e) => {
          const next = e.target.value;
          setDetectiveJson(next);
          try {
            const parsed = JSON.parse(next);
            onDataChange('detectiveCase', parsed);
            setDetectiveJsonError('');
          } catch (err) {
            setDetectiveJsonError('Invalid JSON (fix to save).');
          }
        }}
        className="w-full px-4 py-2 rounded-lg bg-slate-900/40 border border-slate-600 text-white font-mono text-xs h-64"
        spellCheck={false}
      />
      {detectiveJsonError ? <div className="text-sm text-red-300">{detectiveJsonError}</div> : null}
    </div>
  );

  const renderCipherFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Cipher Type</label>
        <select
          value={asString(puzzleData.cipherType, 'caesar')}
          onChange={(e) => onDataChange('cipherType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="caesar">Caesar Cipher</option>
          <option value="atbash">Atbash Cipher</option>
          <option value="vigenere">Vigenère Cipher</option>
          <option value="substitution">Substitution Cipher</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Shift/Key (for applicable ciphers)</label>
        <input
          type="text"
          value={asString(puzzleData.key, '')}
          onChange={(e) => onDataChange('key', e.target.value)}
          placeholder="e.g., 3 for Caesar or 'SECRET' for Vigenère"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Encrypted Message</label>
        <textarea
          value={asString(puzzleData.encryptedMessage, '')}
          onChange={(e) => onDataChange('encryptedMessage', e.target.value)}
          placeholder="The encrypted message for players to solve"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
    </div>
  );

  const renderTextExtractionFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Extraction Type</label>
        <select
            value={asString(puzzleData.extractionType, 'firstLetters')}
          onChange={(e) => onDataChange('extractionType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="firstLetters">First Letters</option>
          <option value="lastLetters">Last Letters</option>
          <option value="keywords">Keywords</option>
          <option value="positions">Specific Positions</option>
          <option value="highlighted">Highlighted Words</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Source Text</label>
        <textarea
            value={asString(puzzleData.sourceText, '')}
          onChange={(e) => onDataChange('sourceText', e.target.value)}
          placeholder="The text from which players extract the answer"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Hint for Extraction (optional)</label>
        <input
          type="text"
            value={asString(puzzleData.extractionHint, '')}
          onChange={(e) => onDataChange('extractionHint', e.target.value)}
          placeholder="e.g., 'Take the first letter of each line'"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
    </div>
  );

  if (puzzleType === 'jigsaw') {
    return renderJigsawFields();
  }

  if (puzzleType === 'code_master') {
    return renderCodeMasterFields();
  }

  const renderCoordinatesFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Latitude</label>
          <input
            type="number"
            step="0.0001"
            value={asNumberOrEmpty(puzzleData.latitude)}
            onChange={(e) => onDataChange('latitude', e.target.value === '' ? undefined : parseFloat(e.target.value))}
            placeholder="e.g., 40.7128"
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Longitude</label>
          <input
            type="number"
            step="0.0001"
            value={asNumberOrEmpty(puzzleData.longitude)}
            onChange={(e) => onDataChange('longitude', e.target.value === '' ? undefined : parseFloat(e.target.value))}
            placeholder="e.g., -74.0060"
            className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Accuracy Radius (meters)</label>
        <input
          type="number"
          value={asNumber(puzzleData.radius, 100)}
          onChange={(e) => onDataChange('radius', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Location Description</label>
        <textarea
          value={asString(puzzleData.locationDescription, '')}
          onChange={(e) => onDataChange('locationDescription', e.target.value)}
          placeholder="Describe the location clues for players"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
    </div>
  );

  const renderImageAnalysisFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Analysis Type</label>
        <select
          value={asString(puzzleData.analysisType, 'hotZones')}
          onChange={(e) => onDataChange('analysisType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="hotZones">Click Hot Zones</option>
          <option value="colorDetection">Color Detection</option>
          <option value="patternMatching">Pattern Matching</option>
          <option value="hiddenElements">Hidden Elements</option>
          <option value="qrCode">QR Code/Barcode</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Analysis Instructions</label>
        <textarea
          value={asString(puzzleData.instructions, '')}
          onChange={(e) => onDataChange('instructions', e.target.value)}
          placeholder="Describe what players need to find or analyze"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Image URL</label>
        <input
          type="url"
          value={asString(puzzleData.imageUrl, '')}
          onChange={(e) => onDataChange('imageUrl', e.target.value)}
          placeholder="Upload image via media manager first"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
    </div>
  );

  const renderAudioSpectrumFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Spectrum Type</label>
        <select
          value={asString(puzzleData.spectrumType, 'frequencies')}
          onChange={(e) => onDataChange('spectrumType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="frequencies">Frequency Analysis</option>
          <option value="spectralPattern">Spectral Pattern</option>
          <option value="waveform">Waveform Analysis</option>
          <option value="hidden">Hidden Message in Audio</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Audio URL</label>
        <input
          type="url"
          value={asString(puzzleData.audioUrl, '')}
          onChange={(e) => onDataChange('audioUrl', e.target.value)}
          placeholder="Upload audio via media manager first"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Instructions</label>
        <textarea
          value={asString(puzzleData.audioInstructions, '')}
          onChange={(e) => onDataChange('audioInstructions', e.target.value)}
          placeholder="What should players listen for or analyze?"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
    </div>
  );

  const renderMorseCodeFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Morse Code Sequence</label>
        <textarea
          value={asString(puzzleData.morseSequence, '')}
          onChange={(e) => onDataChange('morseSequence', e.target.value)}
          placeholder="e.g., '.... . .-.. .-.. ---'"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Provide Reference Chart</label>
        <select
          value={asString(puzzleData.provideChart, 'yes')}
          onChange={(e) => onDataChange('provideChart', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="yes">Yes - Show Morse Code Chart</option>
          <option value="no">No - Players must know Morse Code</option>
          <option value="partial">Partial - Limited reference</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Audio Representation</label>
        <input
          type="url"
          value={asString(puzzleData.audioUrl, '')}
          onChange={(e) => onDataChange('audioUrl', e.target.value)}
          placeholder="Optional: Audio file of morse code (upload via media manager)"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
    </div>
  );

  const renderSteganographyFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Steganography Type</label>
        <select
          value={asString(puzzleData.stegoType, 'lsb')}
          onChange={(e) => onDataChange('stegoType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="lsb">Least Significant Bit (LSB)</option>
          <option value="whitespace">Whitespace Encoding</option>
          <option value="headerData">Image Header Data</option>
          <option value="frequencyDomain">Frequency Domain</option>
          <option value="colorChannels">Color Channels</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Stego Image URL</label>
        <input
          type="url"
          value={asString(puzzleData.stegoImageUrl, '')}
          onChange={(e) => onDataChange('stegoImageUrl', e.target.value)}
          placeholder="Upload image via media manager first"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Extraction Method Description</label>
        <textarea
          value={asString(puzzleData.extractionMethod, '')}
          onChange={(e) => onDataChange('extractionMethod', e.target.value)}
          placeholder="Describe how to extract the hidden data"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Tools Hint (optional)</label>
        <input
          type="text"
          value={asString(puzzleData.toolsHint, '')}
          onChange={(e) => onDataChange('toolsHint', e.target.value)}
          placeholder="e.g., 'Try using tools like Steghide or ExifTool'"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
    </div>
  );

  const renderMultiStepFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Number of Steps</label>
        <input
          type="number"
          min="2"
          max="10"
          value={asNumber(puzzleData.numSteps, 2)}
          onChange={(e) => onDataChange('numSteps', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Chain Type</label>
        <select
          value={asString(puzzleData.chainType, 'linear')}
          onChange={(e) => onDataChange('chainType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="linear">Linear - Each step leads to next</option>
          <option value="convergent">Convergent - Multiple paths to answer</option>
          <option value="branching">Branching - Different endings</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Step Descriptions</label>
        <textarea
          value={asString(puzzleData.stepDescriptions, '')}
          onChange={(e) => onDataChange('stepDescriptions', e.target.value)}
          placeholder="Describe each step separated by newlines"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Step Answers</label>
        <textarea
          value={asString(puzzleData.stepAnswers, '')}
          onChange={(e) => onDataChange('stepAnswers', e.target.value)}
          placeholder="Comma-separated answers for each step"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
    </div>
  );


  const renderMathFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Math Type</label>
        <select
          value={asString(puzzleData.mathType, 'arithmetic')}
          onChange={(e) => onDataChange('mathType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="arithmetic">Arithmetic</option>
          <option value="algebra">Algebra</option>
          <option value="geometry">Geometry</option>
          <option value="sequence">Number Sequence</option>
          <option value="probability">Probability</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Problem Statement</label>
        <textarea
          value={asString(puzzleData.problemStatement, '')}
          onChange={(e) => onDataChange('problemStatement', e.target.value)}
          placeholder="State the math problem or equation"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Show Working (optional)</label>
        <textarea
          value={asString(puzzleData.workingExample, '')}
          onChange={(e) => onDataChange('workingExample', e.target.value)}
          placeholder="Example working/solution (for hints)"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-20"
        />
      </div>
    </div>
  );

  const renderPatternFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Pattern Type</label>
        <select
          value={asString(puzzleData.patternType, 'visual')}
          onChange={(e) => onDataChange('patternType', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
        >
          <option value="visual">Visual Pattern</option>
          <option value="sequence">Sequence</option>
          <option value="grid">Grid Pattern</option>
          <option value="symbolic">Symbolic Pattern</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Pattern Description</label>
        <textarea
          value={asString(puzzleData.patternDescription, '')}
          onChange={(e) => onDataChange('patternDescription', e.target.value)}
          placeholder="Describe the pattern for players"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500 h-24"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Pattern Image URL</label>
        <input
          type="url"
          value={asString(puzzleData.patternImageUrl, '')}
          onChange={(e) => onDataChange('patternImageUrl', e.target.value)}
          placeholder="Upload pattern image via media manager"
          className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-gray-500"
        />
      </div>
    </div>
  );

  // Advanced Escape Room Designer integration
  const renderEscapeRoomFields = () => {
    // Only render the EscapeRoomDesigner, no extra wrapper or heading
    return (
      <EscapeRoomDesigner
        initialData={puzzleData}
        editId={typeof puzzleData === 'object' && puzzleData && 'editId' in puzzleData ? (puzzleData.editId as string) : undefined}
        onChange={(designerData: any) => {
          onDataChange('escapeRoomData', designerData);
          if (designerData && typeof designerData.title === 'string') {
            onDataChange('title', designerData.title);
          }
        }}
      />
    );
  };

  const typeSpecificRenders: Record<string, () => JSX.Element> = {
    cipher: renderCipherFields,
    text_extraction: renderTextExtractionFields,
    coordinates: renderCoordinatesFields,
    image_analysis: renderImageAnalysisFields,
    audio_spectrum: renderAudioSpectrumFields,
    morse_code: renderMorseCodeFields,
    steganography: renderSteganographyFields,
    multi_step: renderMultiStepFields,
    math: renderMathFields,
    pattern: renderPatternFields,
    escape_room: renderEscapeRoomFields,
    detective_case: renderDetectiveCaseFields,
  };

  const renderer = typeSpecificRenders[puzzleType];

  // For escape_room, do not wrap in config card or heading
  if (puzzleType === 'escape_room') {
    return renderer ? renderer() : null;
  }
  return (
    <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6 space-y-4">
      <h4 className="text-lg font-bold text-white mb-4">⚙️ {puzzleType.replace(/_/g, ' ').toUpperCase()} Configuration</h4>
      {renderer ? renderer() : <p className="text-gray-400">No additional configuration for this type</p>}
    </div>
  );
}
