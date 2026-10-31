// Shared with the server function (supabase/functions/forge-ai/roadmap.ts). Keep the two in sync.
export const ROADMAP = [
  { phase: 'Find the idea', steps: [
    { id: 'dump20', title: 'Dump 20 ideas between you', how: 'Quantity first. Bad ideas are fine; they lead to good ones.' },
    { id: 'score5', title: 'Both score your top 5, blind', how: 'Move your favorites to Exploring and score them separately so you don\'t sway each other.' },
    { id: 'pick2', title: 'Pick 1–2 ideas to test', how: 'Highest combined score that you\'re both excited about. Move them to Validating.' },
  ]},
  { phase: 'Prove people want it', steps: [
    { id: 'competitors', title: 'Study 3 competitors and their reviews', how: 'Competitors are good news: they prove demand. Read their 1–3 star reviews to find what customers hate.' },
    { id: 'talk10', title: 'Talk to 10 potential buyers', how: 'Ask about their problem and what they use now. Don\'t pitch. Ask what they last paid for a fix.' },
    { id: 'landing', title: 'Put up a simple page with a waitlist or pre-order', how: 'One page: the promise, a price, and a signup or pre-order button. Carrd or a Forge-built page works.' },
    { id: 'signal', title: 'Get 10+ signups or 3 pre-sales', how: 'Share the page where your buyers hang out, or spend $20–50 on ads. No traction after two weeks? Change the angle or kill it.' },
    { id: 'decide', title: 'Decide: go or kill', how: 'Move the idea to Chosen or Killed, and write down why.' },
  ]},
  { phase: 'Set up the company', steps: [
    { id: 'agreement', title: 'Agree on ownership, roles and money in writing', how: 'Who owns what %, who does what, what happens if one of you leaves. Do this before money comes in.' },
    { id: 'llc', title: 'Form an LLC in Utah', how: 'File with the Utah Division of Corporations (corporations.utah.gov). Write an operating agreement covering the split you agreed on.' },
    { id: 'ein', title: 'Get an EIN', how: 'Free from the IRS at irs.gov, takes about 10 minutes online. Never pay a site to do it.' },
    { id: 'bank', title: 'Open a business bank account', how: 'Keep business money fully separate from personal. Bring your LLC papers and EIN.' },
    { id: 'salestax', title: 'Register for Utah sales tax if you sell taxable products', how: 'Check with the Utah State Tax Commission (tax.utah.gov). Physical products usually need it.' },
    { id: 'books', title: 'Set up simple bookkeeping', how: 'A spreadsheet or free tool. Log every dollar in and out from day one.' },
  ]},
  { phase: 'Launch', steps: [
    { id: 'mvp', title: 'Build the smallest version people will pay for', how: 'Cut every feature you can. Ship in weeks, not months.' },
    { id: 'first10', title: 'Land your first 10 customers by hand', how: 'Message people directly. Unscalable is fine; you\'re learning what they want.' },
    { id: 'price', title: 'Test your price', how: 'Most first-timers underprice. Try higher than feels comfortable.' },
  ]},
  { phase: 'Grow', steps: [
    { id: 'numbers', title: 'Track 3 numbers weekly', how: 'Revenue, customers, and your one key growth number. Review in your weekly session.' },
    { id: 'channel', title: 'Double down on the channel that works', how: 'Find where your first customers came from and put most of your effort there.' },
  ]},
]
