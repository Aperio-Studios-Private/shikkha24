import type { Language } from '@payloadcms/translations'
import { enTranslations } from '@payloadcms/translations/languages/en'

/**
 * Bengali (বাংলা) admin locale.
 *
 * `docs/profile.md` — "Bengali only UI (NO English toggle)" — applies to the
 * **admin panel as well as the public site**, and `.sps/content-model.md` records
 * the gap: *"Payload ships no pre-built Bengali locale; write it."*
 *
 * ## Approach, and its limits
 *
 * Payload ships ~25 languages; Bengali is not one of them. Machine-translating
 * ~2,000 admin strings would produce exactly the uncurated slop the design gate
 * forbids, so this **extends the English bundle** and overrides only the strings
 * an editor actually reads every day.
 *
 * Every key below was verified to exist in the English bundle before being
 * overridden — checked with `Object.keys(enTranslations.<namespace>)`. Inventing a
 * key would silently do nothing, which is worse than not translating at all.
 *
 * Anything not overridden falls back to English. That is deliberate: an
 * untranslated string is *visible*, whereas a plausible-but-wrong translation is
 * invisible and misleading.
 *
 * ⚠️ **This is a working draft, not finished copy.** A Bengali speaker should
 * review the wording before launch. Recorded in `.sps/section-todos/S1.md`.
 *
 * `dateFNSKey: 'bn'` gives Bengali dates throughout the admin via date-fns.
 */

/** Verified-present `general` keys — navigation and shared actions. */
const general = {
  save: 'সংরক্ষণ',
  saving: 'সংরক্ষণ হচ্ছে…',
  cancel: 'বাতিল',
  delete: 'মুছুন',
  edit: 'সম্পাদনা',
  create: 'তৈরি করুন',
  remove: 'সরান',
  close: 'বন্ধ করুন',
  confirm: 'নিশ্চিত করুন',
  yes: 'হ্যাঁ',
  no: 'না',
  or: 'অথবা',
  and: 'এবং',
  of: 'এর',
  dashboard: 'ড্যাশবোর্ড',
  welcome: 'স্বাগতম',
  loading: 'লোড হচ্ছে…',
  error: 'ত্রুটি',
  success: 'সফল',
  filter: 'ফিল্টার',
  filters: 'ফিল্টারসমূহ',
  clear: 'মুছুন',
  next: 'পরবর্তী',
  previous: 'পূর্ববর্তী',
  columns: 'কলাম',
  locale: 'ভাষা',
  untitled: 'শিরোনামহীন',
  duplicate: 'প্রতিলিপি',
  copy: 'কপি',
  copied: 'কপি হয়েছে',
  moveUp: 'উপরে নিন',
  moveDown: 'নিচে নিন',
  trash: 'আবর্জনায় ফেলুন',
  restore: 'পুনরুদ্ধার',
  selectAll: 'সব নির্বাচন করুন',
  selectValue: 'একটি মান নির্বাচন করুন',
  noResults: 'কোনো ফলাফল নেই',
  noResultsFound: 'কিছু পাওয়া যায়নি',
  createdAt: 'তৈরির সময়',
  updatedAt: 'সর্বশেষ পরিবর্তন',
  email: 'ইমেইল',
  password: 'পাসওয়ার্ড',
}

/** Verified-present `authentication` keys. */
const authentication = {
  login: 'লগইন',
  logout: 'লগআউট',
  loggedIn: 'লগইন সফল হয়েছে',
  loggedOutSuccessfully: 'লগআউট হয়েছে',
  createFirstUser: 'প্রথম ব্যবহারকারী তৈরি করুন',
  beginCreateFirstUser: 'শুরু করতে প্রথম ব্যবহারকারী তৈরি করুন',
  forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
  resetPassword: 'পাসওয়ার্ড রিসেট',
  changePassword: 'পাসওয়ার্ড পরিবর্তন',
  confirmPassword: 'পাসওয়ার্ড নিশ্চিত করুন',
  newPassword: 'নতুন পাসওয়ার্ড',
  passwordResetSuccessfully: 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে',
  emailNotValid: 'ইমেইল ঠিকানাটি সঠিক নয়',
  accountVerified: 'অ্যাকাউন্ট সফলভাবে যাচাই হয়েছে',
}

/** Verified-present `fields` keys. */
const fields = {
  addLabel: 'লেবেল যোগ করুন',
  addNew: 'নতুন যোগ করুন',
  addNewLabel: 'নতুন লেবেল যোগ করুন',
  chooseFromExisting: 'বিদ্যমান থেকে বেছে নিন',
  selectExistingLabel: 'বিদ্যমান লেবেল নির্বাচন করুন',
}

export const bn: Language = {
  // `bn-BD` (Bangladesh) rather than bare `bn`: date-fns has no plain `bn` key,
  // and Bangladesh Bengali is the correct regional variant for this portal.
  dateFNSKey: 'bn-BD',
  translations: {
    ...enTranslations,
    general: { ...enTranslations.general, ...general },
    authentication: { ...enTranslations.authentication, ...authentication },
    fields: { ...enTranslations.fields, ...fields },
  },
}
