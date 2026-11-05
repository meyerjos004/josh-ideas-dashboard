// Launch playbooks: step-by-step selling plans per kind of product.
// Progress is saved on each idea as idea.playbook = { stepId: true }.
// Platform prices and fees change: every "how" says to check current pricing.

export const PLAYBOOKS = {
  download: {
    name: 'Digital download',
    blurb: 'Files people buy once: PDFs, templates, presets, spreadsheets, guides.',
    phases: [
      { phase: 'Prove it', steps: [
        { id: 'dl-problem', title: 'Write the one problem it solves, in the buyer\'s words', how: 'One sentence a buyer would actually say ("I never know what to post"). If you can\'t write it, the product is too vague.' },
        { id: 'dl-proof', title: 'Find 3 similar products that already sell', how: 'Search Etsy, Gumroad Discover and Payhip for the same thing. Note their price, page and best reviews. Sales on similar products = demand.' },
        { id: 'dl-presell', title: 'Pre-sell or get 20 waitlist signups', how: 'Post a simple page with the promise and price before you make it. A few pre-sales beats any amount of guessing.' },
      ]},
      { phase: 'Make it', steps: [
        { id: 'dl-mvp', title: 'Make version 1 in under 2 weeks', how: 'Smallest version that fully solves the problem. Canva, Google Docs/Sheets or Notion are enough. Polish later.' },
        { id: 'dl-test', title: 'Have 2–3 people use it and tell you what\'s confusing', how: 'Watch them use it if you can. Fix anything they get stuck on.' },
        { id: 'dl-cover', title: 'Make a cover image and 3 preview images', how: 'Show what\'s inside. Previews sell digital products more than descriptions do.' },
      ]},
      { phase: 'Set up selling', steps: [
        { id: 'dl-platform', title: 'Pick a store: Gumroad, Lemon Squeezy, Payhip or Etsy', how: 'Compare current fees on each site. Prefer one that handles sales tax for you (a "merchant of record") so you don\'t have to.' },
        { id: 'dl-price', title: 'Set a price (test higher than feels comfortable)', how: 'Match or beat the similar products you found. A small bundle at a higher price often sells better than one cheap file.' },
        { id: 'dl-page', title: 'Write the sales page: promise, what\'s inside, who it\'s for, price', how: 'Lead with the outcome. Add a short FAQ and a refund line.' },
        { id: 'dl-delivery', title: 'Test checkout and delivery yourself', how: 'Buy it with a discount code set to 100% off and make sure the file arrives and opens.' },
      ]},
      { phase: 'Launch & grow', steps: [
        { id: 'dl-first10', title: 'Get the first 10 sales by hand', how: 'Post where buyers hang out (Reddit, TikTok, Pinterest, Facebook groups) and send it to people who asked for it.' },
        { id: 'dl-reviews', title: 'Collect reviews and show them on the page', how: 'Ask every early buyer for one sentence. Real reviews raise conversion.' },
        { id: 'dl-upsell', title: 'Add an upsell or bundle', how: 'A bigger pack, a done-for-you version, or a related file at checkout. This is where the money grows.' },
      ]},
    ],
  },
  community: {
    name: 'Subscription community',
    blurb: 'Members pay monthly to belong: a group, chat, lessons and accountability.',
    phases: [
      { phase: 'Prove it', steps: [
        { id: 'cm-who', title: 'Define who it\'s for and the result members get', how: '"Beginners who want X in 90 days." Communities sell a transformation and belonging, not content.' },
        { id: 'cm-proof', title: 'Find 3 paid communities in this niche', how: 'Look on Skool\'s Discover page, Whop and Patreon. Note member counts, price and what they promise.' },
        { id: 'cm-founders', title: 'Get 10 founding members at a lower price', how: 'Sell spots before it fully exists. Founding members get a lifetime discount for giving feedback.' },
      ]},
      { phase: 'Set it up', steps: [
        { id: 'cm-platform', title: 'Pick a home: Skool, Whop, Circle or Discord + a paywall', how: 'Compare monthly costs and fees on each site. All-in-one (Skool, Circle) is simplest; Discord is free but needs a paid-access bot.' },
        { id: 'cm-price', title: 'Set the monthly price (and an annual option)', how: 'Price on the result, not the content. Annual plans (2 months free) cut churn.' },
        { id: 'cm-onboard', title: 'Build onboarding: welcome post, start-here, first win in 24h', how: 'New members who get a quick win stay. Make their first step obvious.' },
        { id: 'cm-rhythm', title: 'Set a weekly rhythm: a call, a challenge, a post schedule', how: 'Consistency is what members pay for. Pick a rhythm you can keep for a year.' },
      ]},
      { phase: 'Launch & grow', steps: [
        { id: 'cm-launch', title: 'Open the doors with a 1-week launch', how: 'Content showing results, a deadline, and the founding price going away.' },
        { id: 'cm-content', title: 'Post free content that leads to the community', how: 'Short videos or posts that solve small problems, ending with "the full system is inside".' },
        { id: 'cm-churn', title: 'Track churn monthly and fix the top reason people leave', how: 'Ask everyone who cancels why. Under ~10% monthly churn is a healthy start.' },
        { id: 'cm-referral', title: 'Add a member referral reward', how: 'Members who bring friends get a free month. Happy members are the cheapest growth.' },
      ]},
    ],
  },
  course: {
    name: 'Online course',
    blurb: 'Teach a skill in lessons, self-paced or as a live group (cohort).',
    phases: [
      { phase: 'Prove it', steps: [
        { id: 'cs-outcome', title: 'Write the promised outcome and who it\'s for', how: '"Go from X to Y in Z weeks." If you can\'t say what students can do after, rework it.' },
        { id: 'cs-proof', title: 'Find 3 courses on this topic and read their reviews', how: 'Udemy, Skool and creator sites. Low-star reviews show what students wish they got.' },
        { id: 'cs-presell', title: 'Pre-sell before recording anything', how: 'Sell the outline at an early-bird price. No buyers in two weeks? Change the angle before you build.' },
      ]},
      { phase: 'Build it', steps: [
        { id: 'cs-outline', title: 'Outline modules backward from the outcome', how: 'Only lessons that move students toward the result. Cut the rest.' },
        { id: 'cs-cohort', title: 'Run it live first as a small cohort (optional but smart)', how: 'Teaching 5–15 people live shows you what to record and gets testimonials.' },
        { id: 'cs-record', title: 'Record short lessons (5–15 min) with a worksheet each', how: 'A phone, a mic and screen recording are enough. Done beats perfect.' },
      ]},
      { phase: 'Set up selling', steps: [
        { id: 'cs-platform', title: 'Pick a platform: Teachable, Podia, Thinkific or Skool', how: 'Compare current plans and transaction fees. Start on the cheapest plan that works.' },
        { id: 'cs-price', title: 'Set the price and offer a payment plan', how: 'Price on the outcome. Payment plans (3 payments) raise sales on higher prices.' },
        { id: 'cs-page', title: 'Sales page: outcome, modules, who it\'s for, guarantee', how: 'Add student results from the cohort. A clear refund policy builds trust.' },
      ]},
      { phase: 'Launch & grow', steps: [
        { id: 'cs-launch', title: 'Launch with free value + a deadline', how: 'A free mini-lesson or live workshop, then a limited-time bonus or price.' },
        { id: 'cs-testimonials', title: 'Get testimonials from the first students', how: 'Ask right after they hit a win. Use them on the sales page.' },
        { id: 'cs-evergreen', title: 'Make it evergreen: email sequence or regular launches', how: 'Either a sign-up sequence that sells automatically or relaunch every few months.' },
      ]},
    ],
  },
}

export const playbookFor = (kind) => PLAYBOOKS[kind] ?? null
export const playbookSteps = (kind) => (PLAYBOOKS[kind]?.phases ?? []).flatMap((p) => p.steps)
export function playbookProgress(idea) {
  const steps = playbookSteps(idea?.kind)
  const done = steps.filter((s) => idea?.playbook?.[s.id]).length
  return { done, total: steps.length, next: steps.find((s) => !idea?.playbook?.[s.id]) ?? null }
}
