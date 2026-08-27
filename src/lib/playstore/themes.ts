/**
 * Theme taxonomy for review mining.
 *
 * Deliberately rule-based rather than model-based: it runs in microseconds,
 * costs nothing, is deterministic across runs (so two researches on the same
 * keyword are comparable), and it produces the *evidence* that the AI call
 * is then asked to interpret. Sending the model raw reviews instead would be both
 * slower and far more expensive.
 *
 * Each theme carries patterns for the polarity it is measured in. A theme is
 * counted at most once per review.
 */

export interface Theme {
  id: string;
  label: string;
  patterns: RegExp[];
}

/** Complaint themes, matched against negative (1-2 star) reviews. */
export const COMPLAINT_THEMES: Theme[] = [
  {
    id: 'ads',
    label: 'Too many advertisements',
    patterns: [
      /\bads?\b/i,
      /\badvert/i,
      /\bcommercials?\b/i,
      /\bpop[- ]?ups?\b/i,
      /\bfull[- ]?screen ad/i,
      /\bvideo ads?\b/i,
    ],
  },
  {
    id: 'ui-complexity',
    label: 'Complicated or confusing UI',
    patterns: [
      /\bconfus/i,
      /\bcomplicated\b/i,
      /\bnot (?:user[- ]?friendly|intuitive)\b/i,
      /\bhard to (?:use|navigate|understand|find)\b/i,
      /\bdifficult to (?:use|navigate|understand)\b/i,
      /\bcluttered\b/i,
      /\bmessy (?:ui|interface|design)\b/i,
      /\btoo many (?:steps|taps|clicks)\b/i,
    ],
  },
  {
    id: 'performance',
    label: 'App is slow or laggy',
    patterns: [/\bslow\b/i, /\blag(?:gy|s|ging)?\b/i, /\bfreez(?:e|es|ing)\b/i, /\bhangs?\b/i, /\btakes forever\b/i, /\bstuck\b/i],
  },
  {
    id: 'stability',
    label: 'Crashes and bugs',
    patterns: [/\bcrash(?:es|ed|ing)?\b/i, /\bbugg?y\b/i, /\bbugs?\b/i, /\bkeeps? (?:closing|stopping)\b/i, /\bforce clos/i, /\bwon'?t open\b/i, /\berror\b/i],
  },
  {
    id: 'paywall',
    label: 'Aggressive paywall or pricing',
    patterns: [
      /\btoo expensive\b/i,
      /\bovers?priced\b/i,
      /\bpay(?:wall|ing)\b/i,
      /\bsubscription\b/i,
      /\bpremium (?:only|version|required)\b/i,
      /\bnot (?:really )?free\b/i,
      /\bhave to pay\b/i,
      /\bmoney grab\b/i,
    ],
  },
  {
    id: 'sync-backup',
    label: 'Sync and backup problems',
    patterns: [/\bsync(?:ing|ed|s)?\b/i, /\bbackup\b/i, /\brestore\b/i, /\bcloud\b/i, /\bmultiple devices?\b/i],
  },
  {
    id: 'data-loss',
    label: 'Lost data after update',
    patterns: [/\blost (?:all )?(?:my )?(?:data|entries|records|notes|history)\b/i, /\bdata (?:loss|gone|disappeared|wiped)\b/i, /\bdeleted everything\b/i, /\bafter (?:the )?update\b.*\b(?:lost|gone)\b/i],
  },
  {
    id: 'export',
    label: 'Missing export (PDF / Excel / CSV)',
    patterns: [/\bexport\b/i, /\bpdf\b/i, /\bexcel\b/i, /\bcsv\b/i, /\bspreadsheet\b/i, /\bprint(?:ing|able)?\b/i, /\bdownload (?:report|statement|data)\b/i],
  },
  {
    id: 'account',
    label: 'Login and account issues',
    patterns: [/\blog ?in\b/i, /\bsign ?in\b/i, /\bpassword\b/i, /\botp\b/i, /\bverif(?:y|ication)\b/i, /\bcan'?t (?:register|create an account)\b/i],
  },
  {
    id: 'notifications',
    label: 'Notification and reminder problems',
    patterns: [/\bnotification/i, /\bremind(?:er|ers|ing)?\b/i, /\balarm\b/i, /\balerts?\b/i],
  },
  {
    id: 'offline',
    label: 'Requires internet / no offline mode',
    patterns: [/\boffline\b/i, /\bno internet\b/i, /\brequires? (?:an )?internet\b/i, /\bneeds? (?:a )?connection\b/i, /\bwithout internet\b/i],
  },
  {
    id: 'support',
    label: 'Unresponsive customer support',
    patterns: [/\b(?:customer )?support\b/i, /\bno (?:reply|response|answer)\b/i, /\bcontacted (?:them|developer)\b/i, /\bignor(?:e|es|ed|ing)\b/i],
  },
  {
    id: 'permissions-privacy',
    label: 'Privacy and permission concerns',
    patterns: [/\bpermission/i, /\bprivacy\b/i, /\bcontacts? access\b/i, /\bsells? (?:my )?data\b/i, /\btracking\b/i, /\bspyware\b/i],
  },
  {
    id: 'localization',
    label: 'Language and currency gaps',
    patterns: [/\blanguage\b/i, /\btranslat/i, /\bcurrency\b/i, /\blocali[sz]/i, /\bregion(?:al)? (?:support|format)\b/i, /\bdate format\b/i],
  },
  {
    id: 'battery-size',
    label: 'Battery drain or app size',
    patterns: [/\bbattery\b/i, /\bdrain/i, /\bheat(?:s|ing)? (?:up )?(?:my )?phone\b/i, /\btoo (?:big|heavy|large)\b/i, /\bstorage\b/i, /\bmb\b/i],
  },
  {
    id: 'widget',
    label: 'Missing or broken widget',
    patterns: [/\bwidget\b/i, /\bhome ?screen\b/i, /\bquick add\b/i, /\bshortcut\b/i],
  },
  {
    id: 'limits',
    label: 'Free tier limits are too tight',
    patterns: [/\blimit(?:ed|s|ation)?\b/i, /\bonly \d+ (?:entries|items|accounts|categories|scans|projects)\b/i, /\bmaximum of\b/i, /\bcap(?:ped)?\b/i],
  },
];

/** Praise themes, matched against positive (4-5 star) reviews. */
export const PRAISE_THEMES: Theme[] = [
  {
    id: 'simplicity',
    label: 'Simple and easy to use',
    patterns: [/\beasy to use\b/i, /\bsimple\b/i, /\bstraight ?forward\b/i, /\buser[- ]?friendly\b/i, /\bintuitive\b/i, /\beasy\b/i],
  },
  {
    id: 'design',
    label: 'Clean design and UI',
    patterns: [/\bclean\b/i, /\bbeautiful\b/i, /\bnice (?:ui|design|interface|look)/i, /\bmodern\b/i, /\bgreat design\b/i, /\bslick\b/i],
  },
  {
    id: 'no-ads',
    label: 'No ads / unobtrusive ads',
    patterns: [/\bno ads?\b/i, /\bwithout ads?\b/i, /\bad[- ]?free\b/i, /\bads? (?:are )?(?:not )?(?:minimal|few|bearable)\b/i],
  },
  {
    id: 'free-value',
    label: 'Great value for free',
    patterns: [/\bfree\b/i, /\bworth (?:it|every|the money)\b/i, /\bvalue for money\b/i, /\baffordable\b/i, /\bcheap\b/i],
  },
  {
    id: 'features',
    label: 'Rich feature set',
    patterns: [/\bfeature[- ]?(?:rich|packed|full)\b/i, /\beverything i need\b/i, /\ball the features\b/i, /\bcustomi[sz]/i, /\bflexible\b/i],
  },
  {
    id: 'speed',
    label: 'Fast and lightweight',
    patterns: [/\bfast\b/i, /\bquick\b/i, /\blight ?weight\b/i, /\bsmooth\b/i, /\bresponsive\b/i, /\bsnappy\b/i],
  },
  {
    id: 'offline-support',
    label: 'Works offline',
    patterns: [/\boffline\b/i, /\bno internet (?:needed|required)\b/i, /\bworks without\b/i],
  },
  {
    id: 'reliability',
    label: 'Reliable and stable',
    patterns: [/\breliable\b/i, /\bnever crash/i, /\bstable\b/i, /\bno bugs?\b/i, /\bworks (?:perfectly|flawlessly|great)\b/i],
  },
  {
    id: 'sync-praise',
    label: 'Sync and backup work well',
    patterns: [/\bsync(?:s|ing)? (?:well|perfectly|great|fine)\b/i, /\bbackup works\b/i, /\bcloud backup\b/i, /\bacross devices\b/i],
  },
  {
    id: 'support-praise',
    label: 'Responsive developer',
    patterns: [/\bdeveloper (?:responded|replied|listens)\b/i, /\bgreat support\b/i, /\bquick (?:reply|response)\b/i, /\bregular updates?\b/i],
  },
];

/** Feature-request themes, matched against the request-shaped sentences. */
export const FEATURE_REQUEST_THEMES: Theme[] = [
  { id: 'req-export', label: 'Export to PDF / Excel / CSV', patterns: [/\bexport\b/i, /\bpdf\b/i, /\bexcel\b/i, /\bcsv\b/i, /\bprint\b/i] },
  { id: 'req-widget', label: 'Home screen widget', patterns: [/\bwidget\b/i, /\bhome ?screen\b/i, /\bshortcut\b/i] },
  { id: 'req-darkmode', label: 'Dark mode / theming', patterns: [/\bdark (?:mode|theme)\b/i, /\btheme\b/i, /\bcolou?rs?\b/i] },
  { id: 'req-sync', label: 'Cloud sync and multi-device', patterns: [/\bsync\b/i, /\bcloud\b/i, /\bmultiple devices?\b/i, /\bweb (?:version|app)\b/i, /\bdesktop\b/i] },
  { id: 'req-backup', label: 'Backup and restore', patterns: [/\bbackup\b/i, /\brestore\b/i, /\bgoogle drive\b/i] },
  { id: 'req-language', label: 'More languages and currencies', patterns: [/\blanguage\b/i, /\btranslat/i, /\bcurrency\b/i, /\bregional\b/i] },
  { id: 'req-recurring', label: 'Recurring / automation', patterns: [/\brecurring\b/i, /\bautomat/i, /\brepeat\b/i, /\bschedul/i, /\bauto[- ]?(?:add|fill|detect)\b/i] },
  { id: 'req-reports', label: 'Better reports and analytics', patterns: [/\breports?\b/i, /\bchart\b/i, /\bgraph\b/i, /\banalytics\b/i, /\bstatistics\b/i, /\bsummary\b/i, /\binsights?\b/i] },
  { id: 'req-categories', label: 'Custom categories and tags', patterns: [/\bcategor/i, /\btags?\b/i, /\blabels?\b/i, /\bcustom fields?\b/i] },
  { id: 'req-security', label: 'App lock / biometric security', patterns: [/\bpin\b/i, /\bfingerprint\b/i, /\bbiometric\b/i, /\bapp lock\b/i, /\bpassword protect/i, /\bface ?id\b/i] },
  { id: 'req-integration', label: 'Bank / third-party integration', patterns: [/\bbank\b/i, /\bsms\b/i, /\bupi\b/i, /\bintegrat/i, /\bapi\b/i, /\bimport from\b/i, /\bconnect (?:to|with)\b/i] },
  { id: 'req-collaboration', label: 'Sharing and collaboration', patterns: [/\bshare\b/i, /\bfamily\b/i, /\bcollaborat/i, /\bmultiple users?\b/i, /\bteam\b/i, /\bjoint\b/i] },
  { id: 'req-reminders', label: 'Reminders and notifications', patterns: [/\bremind/i, /\bnotif/i, /\balert\b/i, /\bdue date\b/i] },
  { id: 'req-search', label: 'Search and filtering', patterns: [/\bsearch\b/i, /\bfilter\b/i, /\bsort\b/i] },
  { id: 'req-offline', label: 'Offline mode', patterns: [/\boffline\b/i, /\bwithout internet\b/i] },
  { id: 'req-ai', label: 'AI / smart suggestions', patterns: [/\bai\b/i, /\bsmart\b/i, /\bsuggest/i, /\bautomatic(?:ally)? (?:categor|detect)/i, /\bocr\b/i, /\bscan\b/i] },
];

/**
 * Sentences that read like a request. Used to isolate the request-shaped part
 * of a review before theme matching, so "the export is broken" (a complaint)
 * is not miscounted as "please add export".
 */
export const REQUEST_SIGNALS: RegExp[] = [
  /\bplease add\b/i,
  /\bplease (?:include|provide|give|make|allow|support)\b/i,
  /\b(?:would|would'?ve|could) be (?:nice|great|better|helpful)\b/i,
  /\bi wish\b/i,
  /\bwish (?:it|they|there)\b/i,
  /\bhope (?:you|they|the developer)\b/i,
  /\bit (?:needs|lacks)\b/i,
  /\bneeds? (?:to have|an? )\b/i,
  /\bshould (?:have|add|include|support|allow)\b/i,
  /\bmissing\b/i,
  /\bno option (?:to|for)\b/i,
  /\bthere'?s no\b/i,
  /\badd (?:an? |the )?(?:option|feature|support|ability)\b/i,
  /\bif only\b/i,
  /\bsuggestion\b/i,
  /\brequest(?:ing)?\b/i,
  /\bwant(?:ed)? (?:to be able|an? )\b/i,
];
