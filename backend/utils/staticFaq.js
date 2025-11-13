const normalizeText = (text = '') =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const FAQ_ENTRIES = [
  {
    id: 'general-what-is',
    answer:
      'Franquicia Boost is a digital platform designed to connect potential franchise buyers with top franchise brands. We make it easy to discover, compare, and connect with the right business opportunity based on your goals and investment level. Even if you are short on funds, we help you arrange for funds so that your application is placed strongest for whichever opportunity you apply for.',
    keywords: [
      'what is franquicia boost',
      'who is franquicia boost',
      'about franquicia boost',
      'franquicia boost platform'
    ]
  },
  {
    id: 'general-how-it-works',
    answer:
      'It’s simple — browse our franchise listings, explore brand details and investment requirements, and apply for franchise opportunities directly through the platform. Whether you’re looking to buy or promote a franchise, we make the process faster and easier.',
    keywords: [
      'how does franquicia boost work',
      'how it works',
      'how do you work',
      'platform work',
      'process work'
    ]
  },
  {
    id: 'general-services',
    answer:
      'We offer franchise listings, FDD access, brand promotion, and lead generation services for franchisors. For buyers, we provide curated franchise opportunities, franchise financing, and expert insights through our strategic partnership to help you invest confidently.',
    keywords: [
      'what services',
      'services do you offer',
      'offer services',
      'what do you provide',
      'service list'
    ]
  },
  {
    id: 'general-who-can-use',
    answer:
      'Our platform is built for both franchise buyers/investors and franchisors/brands looking to expand.',
    keywords: [
      'who can use franquicia boost',
      'who can use',
      'who is this for',
      'who can access'
    ]
  },
  {
    id: 'general-free',
    answer:
      'Yes, browsing franchise listings is free for all users. Franchisors can choose one of our customised options for greater visibility and lead generation.',
    keywords: [
      'is franquicia boost free',
      'free to use',
      'cost to use',
      'do i pay to browse',
      'pricing to browse'
    ]
  },
  {
    id: 'general-location',
    answer:
      'We’re based in Canada, but we work with franchise brands and users globally.',
    keywords: [
      'where is franquicia boost based',
      'location of franquicia boost',
      'based in',
      'headquarters'
    ]
  },
  {
    id: 'general-differentiator',
    answer:
      'We combine verified listings, franchise insights, and digital verification expertise to help brands grow and buyers invest wisely — all in one platform.',
    keywords: [
      'what makes franquicia boost different',
      'why choose franquicia boost',
      'difference',
      'unique about franquicia boost'
    ]
  },
  {
    id: 'opportunities-types',
    answer:
      'We feature a wide range of franchises — from food & beverage, retail, and education to fitness, real estate, and tech-based franchises. You can filter by category, budget, or location.',
    keywords: [
      'what kinds of franchise opportunities',
      'types of franchises',
      'what franchises do you offer',
      'categories of franchises',
      'range of franchises'
    ]
  },
  {
    id: 'opportunities-find-best',
    answer:
      'Use our compatibility score to help inform you how fit you might be for that brand based on your preferences. You can also contact our support team for personalized franchise suggestions.',
    keywords: [
      'how can i find the best franchise',
      'find best franchise',
      'recommend franchise',
      'help me choose franchise',
      'which franchise should i pick'
    ]
  },
  {
    id: 'opportunities-low-cost',
    answer:
      'Yes! We regularly feature low-investment and home-based franchise opportunities.',
    keywords: [
      'low cost franchise',
      'low investment franchise',
      'affordable franchise',
      'home based franchise',
      'budget franchise'
    ]
  },
  {
    id: 'opportunities-apply',
    answer:
      'Once you find a brand that interests you, click “Start Application” on the listing page. The application will help prep your application in such a way that it gets prioritized ahead of other applications in queue, thanks to built-in digital verification and financial health check and readiness, without going anywhere to strengthen your application. We take care of all that for you. The franchisor will be informed about your application and readiness and will make arrangements to reach out with the next steps.',
    keywords: [
      'how do i apply for a franchise',
      'apply for franchise',
      'start application',
      'application process',
      'submit application'
    ]
  },
  {
    id: 'opportunities-contact',
    answer:
      'Absolutely. You can message them through our platform’s support form — your request goes straight to their franchise development team.',
    keywords: [
      'can i contact franchisors',
      'contact franchisor',
      'reach franchisor',
      'message franchisor'
    ]
  },
  {
    id: 'opportunities-verify',
    answer:
      'Yes, we review each brand before publication to ensure information accuracy and authenticity.',
    keywords: [
      'does franquicia boost verify listings',
      'verify franchise listing',
      'authenticated listings',
      'review listings'
    ]
  },
  {
    id: 'opportunities-compare',
    answer:
      'Yes, you can use our AI bot feature to evaluate multiple brands side by side — including investment requirements, locations, and support details.',
    keywords: [
      'can i compare franchises',
      'compare franchise',
      'side by side',
      'evaluate multiple brands'
    ]
  },
  {
    id: 'fdd-what',
    answer:
      'The Franchise Disclosure Document (FDD) is a legal document that provides detailed information about a franchise opportunity — including fees, earnings potential, obligations, and background of the franchisor.',
    keywords: [
      'what is an fdd',
      'fdd meaning',
      'franchise disclosure document',
      'explain fdd'
    ]
  },
  {
    id: 'fdd-access',
    answer:
      'Yes, we provide access to our AI bot with insights on FDD summaries so that you can ask questions for the same . We also provide downloadable FDDs (when available from franchisors) only when application is started for the opportunity. Look for the “View FDD” section in each franchise listing.',
    keywords: [
      'does franquicia boost provide fdd',
      'access to fdd',
      'view fdd',
      'download fdd',
      'fdd summaries'
    ]
  },
  {
    id: 'fdd-why-important',
    answer:
      'The FDD helps investors make informed decisions by showing all relevant business, financial, and legal details before signing a franchise agreement.',
    keywords: [
      'why is the fdd important',
      'importance of fdd',
      'why fdd matters'
    ]
  },
  {
    id: 'fdd-up-to-date',
    answer:
      'We encourage franchisors to upload the latest FDD version annually. Each listing shows the FDD’s last updated date for transparency.',
    keywords: [
      'are fdds up to date',
      'keep fdd updated',
      'latest fdd',
      'current fdd'
    ]
  },
  {
    id: 'fdd-help-understand',
    answer:
      'Yes — our AI bot includes guides and articles explaining key FDD sections. You can also request a consultation with one of our franchise advisors.',
    keywords: [
      'can you help me understand the fdd',
      'help with fdd',
      'explain disclosure document',
      'understand fdd'
    ]
  },
  {
    id: 'franchisors-list',
    answer:
      'Simply click on “List Your Franchise” and fill out the form with your brand details. Our team will review and publish your listing quickly.',
    keywords: [
      'how can i list my franchise',
      'list my franchise',
      'add my franchise',
      'submit franchise listing'
    ]
  },
  {
    id: 'franchisors-benefits',
    answer:
      'You’ll reach a qualified audience of franchise buyers actively looking for investment opportunities.',
    keywords: [
      'benefits of promoting my franchise',
      'why promote here',
      'benefits for franchisors',
      'advantage of listing'
    ]
  },
  {
    id: 'franchisors-cost',
    answer:
      'We offer customizable plans that align with your business strategies. Please contact our support@francquiciaboost.com and we will be happy to assist you in your journey.',
    keywords: [
      'how much does it cost to advertise',
      'pricing for advertising',
      'cost to list franchise',
      'franchisor cost',
      'advertise cost'
    ]
  },
  {
    id: 'franchisors-leads',
    answer:
      'Yes, we deliver digitally qualified franchise leads directly to your inbox. Our system filters and matches users who fit your ideal candidate profile.',
    keywords: [
      'do you help generate leads',
      'generate franchise leads',
      'lead generation',
      'leads for franchisors'
    ]
  },
  {
    id: 'franchisors-analytics',
    answer:
      'Definitely! We provide paid insights on people\'s engagement with the AI bot to help indicate if there are other guest users interested in your brand.',
    keywords: [
      'can i get analytics',
      'analytics on listing',
      'track engagement',
      'performance data'
    ]
  },
  {
    id: 'franchisors-go-live',
    answer:
      'Usually, within 24–48 hours after submission, once our team reviews the content.',
    keywords: [
      'how long to go live',
      'review time',
      'listing live time',
      'when will listing go live'
    ]
  },
  {
    id: 'pricing-options',
    answer:
      'We offer flexible listing plans to fit every brand’s needs —  contact us for a custom quote.',
    keywords: [
      'what are your pricing options',
      'pricing plans',
      'list of plans',
      'pricing details'
    ]
  },
  {
    id: 'pricing-demo',
    answer:
      'Yes! We can arrange a demo or trial listing so you can explore how Franquicia Boost helps attract quality leads.',
    keywords: [
      'can i get a demo',
      'demo or free trial',
      'trial listing',
      'test the platform'
    ]
  },
  {
    id: 'pricing-upgrade',
    answer:
      'You can manage your subscription by contacting our support team for help.',
    keywords: [
      'how do i upgrade my plan',
      'upgrade or cancel plan',
      'change my plan',
      'cancel subscription'
    ]
  },
  {
    id: 'pricing-payments',
    answer:
      'We accept major credit/debit cards and secure online payment options.',
    keywords: [
      'what payment methods do you accept',
      'payment methods',
      'how can i pay',
      'credit card payment'
    ]
  },
  {
    id: 'marketing-leads',
    answer:
      'We use SEO, social media marketing, and targeted ad campaigns to attract qualified investors. Leads are then digitally verified, financially ready and delivered directly to franchisors. Franchisors don\'t need to leverage our features through our website lead portal; they can refer leads directly to the platform using a QR code to start leveraging AI bot, digital verification and financial readiness features.',
    keywords: [
      'how does franquicia boost generate leads',
      'lead generation process',
      'marketing campaigns',
      'generate leads',
      'qualified investors'
    ]
  },
  {
    id: 'marketing-track',
    answer:
      'Yes! We will share a report on the progress of the applied leads and at which stage they are in the process.',
    keywords: [
      'can i track lead performance',
      'track leads',
      'lead progress',
      'monitor leads'
    ]
  },
  {
    id: 'education-first-time',
    answer:
      'Yes! Chat with our AI bot for free guides, articles, and checklists designed to help new franchise buyers.',
    keywords: [
      'resources for first time investors',
      'first time investor',
      'beginner resources',
      'new investor help'
    ]
  },
  {
    id: 'education-advice',
    answer:
      'Yes — you can schedule a consultation with our franchise experts who’ll guide you through due diligence and selection.',
    keywords: [
      'can i get professional advice',
      'speak to expert',
      'consultation with expert',
      'advisor help'
    ]
  },
  {
    id: 'account-create',
    answer:
      'Click on “Sign Up” at the top of the homepage, enter your details, and verify your email.',
    keywords: [
      'how do i create an account',
      'create account',
      'sign up process',
      'register account'
    ]
  },
  {
    id: 'account-forgot-password',
    answer:
      'Click on “Forgot Password?” on the login page and follow the reset instructions sent to your email.',
    keywords: [
      'forgot my password',
      'reset password',
      'password reset',
      'forgotten password'
    ]
  },
  {
    id: 'account-update-profile',
    answer:
      'Go to your dashboard→ Edit Profile to update your information anytime.',
    keywords: [
      'how do i update my profile',
      'edit profile',
      'update account info',
      'change profile'
    ]
  },
  {
    id: 'account-data-security',
    answer:
      'Yes, we use industry-standard encryption and never share your personal data without consent.',
    keywords: [
      'is my data secure',
      'data security',
      'secure my data',
      'privacy policy'
    ]
  },
  {
    id: 'partnerships-collaborate',
    answer:
      'We’re always open to collaborations with franchise consultants, brokers, or marketing agencies. Reach us via support@franquiciaboost.com.',
    keywords: [
      'how can i partner with franquicia boost',
      'partnerships',
      'collaborate with franquicia boost',
      'work together'
    ]
  },
  {
    id: 'partnerships-affiliate',
    answer:
      'Yes, we offer referral partnerships for professionals who bring new franchisors or investors to our platform. Contact us at support@franquiciaboost.com to learn more.',
    keywords: [
      'do you have affiliate program',
      'referral program',
      'affiliate partnership',
      'referral partnerships'
    ]
  },
  {
    id: 'contact-support',
    answer:
      'You can message us through our contact form or email us at support@franquiciaboost.com. Our team replies within 24 hours.',
    keywords: [
      'how can i contact franquicia boost support',
      'contact support',
      'get in touch',
      'reach support team',
      'contact franquicia'
    ]
  },
  {
    id: 'contact-live-chat',
    answer:
      'Yes — our chatbot and live support team, through scheduled meetings, are available during business hours..',
    keywords: [
      'do you offer live chat',
      'live chat support',
      'phone support',
      'talk to someone'
    ]
  },
  {
    id: 'navigation-find-franchises',
    answer:
      'Use the franchise opportunity page for a quick glance of different important details shown upfront, or ask the AI bot, and it can filter those as per your needs.',
    keywords: [
      'how do i find franchises by category',
      'find franchises by investment',
      'filter franchise list',
      'search franchises'
    ]
  },
  {
    id: 'navigation-save-favorites',
    answer:
      'We are always improving user experience, and this feature will be coming soon. But for now, you can share it with yourself through one of the social media integrations and save it offline.',
    keywords: [
      'can i save my favourite franchises',
      'save favorites',
      'bookmark franchise',
      'favorite franchise'
    ]
  },
  {
    id: 'navigation-alerts',
    answer:
      'Absolutely — sign up to stay updated on new listings.',
    keywords: [
      'can i get alerts about new franchises',
      'alerts for new franchise',
      'notify new listings',
      'notifications'
    ]
  },
  {
    id: 'guidance-start',
    answer:
      'Start by exploring our Beginner’s Guide with our AI bot and browse franchises that fit your investment goals. You can also speak to our advisors for tailored recommendations.',
    keywords: [
      'i am new to franchising',
      'where should i start',
      'new to franchising',
      'beginner guide'
    ]
  },
  {
    id: 'guidance-trending',
    answer:
      'We share those through our monthly newsletter, so do sign up!',
    keywords: [
      'which franchises are trending',
      'trending franchises',
      'popular franchises',
      'hot franchises'
    ]
  },
  {
    id: 'guidance-recommend',
    answer:
      'Sure! Tell us your budget, interests, and preferred industry — and we’ll suggest a few suitable franchise options.',
    keywords: [
      'can you recommend a franchise',
      'recommend franchise for me',
      'suggest franchise',
      'help me find franchise'
    ]
  }
];

function getStaticFAQAnswer(message = '') {
  const normalizedMessage = normalizeText(message);
  if (!normalizedMessage) {
    return null;
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const entry of FAQ_ENTRIES) {
    for (const keyword of entry.keywords) {
      if (!keyword) continue;
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) continue;

      if (normalizedMessage.includes(normalizedKeyword)) {
        const score = normalizedKeyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }
    }

    if (!bestMatch) {
      const tokens = normalizeText(entry.keywords.join(' ')).split(' ');
      const messageTokens = new Set(normalizedMessage.split(' '));
      const requiredTokens = tokens.filter(token => token.length > 3);
      if (requiredTokens.length === 0) continue;

      const overlap = requiredTokens.filter(token => messageTokens.has(token)).length;
      const tokenScore = overlap / requiredTokens.length;

      if (tokenScore >= 0.6 && tokenScore > bestScore) {
        bestScore = tokenScore;
        bestMatch = entry;
      }
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.answer;
  }

  return null;
}

module.exports = {
  getStaticFAQAnswer
};

