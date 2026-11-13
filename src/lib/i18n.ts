import "server-only";
import { cookies } from "next/headers";

export type Lang = "en" | "hi";

const dictionaries = {
  en: {
    "nav.home": "Home",
    "nav.about": "About",
    "nav.report": "Report a problem",
    "nav.map": "Campus map",
    "nav.awareness": "Awareness",
    "nav.announcements": "Announcements",
    "nav.login": "Sign in",
    "nav.signup": "Create account",
    "nav.dashboard": "Dashboard",
    "nav.portal": "My portal",
    "hero.badge": "Independent campus sustainability initiative",
    "hero.cta": "Report a problem",
    "hero.secondary": "Explore campus",
    "hero.assistant": "Ask EcoBot AI",
    "stats.title": "Live campus environmental statistics",
    "stats.description":
      "Counts come directly from platform records. Sample records are labelled as demo data — never presented as real live results.",
    "stats.total": "Total reported",
    "stats.resolved": "Resolved",
    "stats.pending": "Pending",
    "stats.inProgress": "In progress",
    "stats.water": "Water saved",
    "stats.energy": "Energy saved",
    "stats.notTracked": "Not tracked yet",
    "recent.title": "Recently reported issues",
    "recent.description": "Public progress from across the campus. Reporter identities are never shown publicly.",
    "recent.empty": "No issues reported yet. Your report can be the first.",
    "how.title": "How EcoCampus AI works",
    "how.description": "A transparent loop from observation to verified resolution.",
    "map.title": "Explore the campus map",
    "map.description": "Verified locations and reported issue markers. Building pins are added and verified by administrators.",
    "awareness.title": "Environmental awareness centre",
    "awareness.description": "Practical, campus-friendly knowledge for water, energy, waste and biodiversity.",
    "initiatives.title": "Sustainability initiatives",
    "initiatives.description": "Programmes run through EcoCampus AI. These are platform initiatives, not official university claims.",
    "achievements.title": "Platform achievements",
    "achievements.description": "Milestones computed from platform activity. Demo records are included where labelled.",
    "contact.title": "Contact & campus information",
    "footer.disclaimer":
      "Independent environmental management project. Not an official university service unless authorized.",
    "common.learnMore": "Learn more",
    "common.viewAll": "View all",
    "common.demo": "Demo",
    "common.language": "Language",
    "common.lightDark": "Light / dark",
    "common.reportNow": "Report now",
    "common.verifiedLocations": "Verified locations",
    "common.reportedIssues": "Reported issues",
    "common.noMapPins": "No verified building pins yet",
    "common.mapNote":
      "The map is centred on LTSU's official map location. Building-level pins require administrator verification.",
  },
  hi: {
    "nav.home": "होम",
    "nav.about": "परिचय",
    "nav.report": "समस्या दर्ज करें",
    "nav.map": "कैंपस मैप",
    "nav.awareness": "जागरूकता",
    "nav.announcements": "सूचनाएँ",
    "nav.login": "साइन इन",
    "nav.signup": "खाता बनाएँ",
    "nav.dashboard": "डैशबोर्ड",
    "nav.portal": "मेरा पोर्टल",
    "hero.badge": "स्वतंत्र कैंपस सस्टेनेबिलिटी पहल",
    "hero.cta": "समस्या दर्ज करें",
    "hero.secondary": "कैंपस देखें",
    "hero.assistant": "EcoBot AI से पूछें",
    "stats.title": "कैंपस पर्यावरण आँकड़े",
    "stats.description":
      "आँकड़े सीधे प्लेटफ़ॉर्म रिकॉर्ड से आते हैं। नमूना रिकॉर्ड डेमो के रूप में स्पष्ट रूप से चिह्नित हैं।",
    "stats.total": "कुल रिपोर्ट",
    "stats.resolved": "हल हुई",
    "stats.pending": "लंबित",
    "stats.inProgress": "प्रगति में",
    "stats.water": "पानी की बचत",
    "stats.energy": "ऊर्जा की बचत",
    "stats.notTracked": "अभी दर्ज नहीं",
    "recent.title": "हाल में दर्ज समस्याएँ",
    "recent.description": "कैंपस की सार्वजनिक प्रगति। रिपोर्टर की पहचान सार्वजनिक नहीं की जाती।",
    "recent.empty": "अभी कोई समस्या दर्ज नहीं हुई। आप पहली रिपोर्ट कर सकते हैं।",
    "how.title": "EcoCampus AI कैसे काम करता है",
    "how.description": "देखने से सत्यापित समाधान तक एक पारदर्शी प्रक्रिया।",
    "map.title": "कैंपस मैप देखें",
    "map.description": "सत्यापित स्थान और समस्या मार्कर। बिल्डिंग पिन प्रशासक जोड़कर सत्यापित करते हैं।",
    "awareness.title": "पर्यावरण जागरूकता केंद्र",
    "awareness.description": "पानी, ऊर्जा, कचरा और जैव विविधता के लिए व्यावहारिक जानकारी।",
    "initiatives.title": "सस्टेनेबिलिटी पहल",
    "initiatives.description": "EcoCampus AI के माध्यम से चलने वाले कार्यक्रम। ये आधिकारिक विश्वविद्यालय दावे नहीं हैं।",
    "achievements.title": "प्लेटफ़ॉर्म उपलब्धियाँ",
    "achievements.description": "प्लेटफ़ॉर्म गतिविधि से गणना किए गए मील के पत्थर। जहाँ चिह्नित है, डेमो रिकॉर्ड शामिल हैं।",
    "contact.title": "संपर्क और कैंपस जानकारी",
    "footer.disclaimer": "स्वतंत्र पर्यावरण प्रबंधन परियोजना। अधिकृत होने तक आधिकारिक विश्वविद्यालय सेवा नहीं।",
    "common.learnMore": "और जानें",
    "common.viewAll": "सभी देखें",
    "common.demo": "डेमो",
    "common.language": "भाषा",
    "common.lightDark": "लाइट / डार्क",
    "common.reportNow": "अभी रिपोर्ट करें",
    "common.verifiedLocations": "सत्यापित स्थान",
    "common.reportedIssues": "दर्ज समस्याएँ",
    "common.noMapPins": "अभी सत्यापित बिल्डिंग पिन नहीं",
    "common.mapNote": "मैप LTSU के आधिकारिक स्थान पर केंद्रित है। बिल्डिंग पिन प्रशासक सत्यापित करते हैं।",
  },
} as const;

export type TranslationKey = keyof (typeof dictionaries)["en"];

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return store.get("eco_lang")?.value === "hi" ? "hi" : "en";
}

export function t(lang: Lang, key: TranslationKey) {
  return dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
}

export function translator(lang: Lang) {
  return (key: TranslationKey) => t(lang, key);
}

export function getDictionary(lang: Lang): Record<string, string> {
  return { ...dictionaries.en, ...dictionaries[lang] };
}
