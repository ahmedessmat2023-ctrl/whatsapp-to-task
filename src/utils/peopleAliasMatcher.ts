/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PersonMapping } from '../types';

export interface AliasMatch {
  person: PersonMapping;
  matchedAlias: string;
  matchedTextInSource: string;
  startIndex: number;
  endIndex: number;
  matchType: 'exact_alias' | 'vocative_prefix' | 'mention' | 'department_domain';
  confidence: number;
  contextSnippet: string;
}

export interface CrossReferenceResult {
  matches: AliasMatch[];
  primarySuggestion: PersonMapping | null;
  primaryMatch: AliasMatch | null;
  alternateSuggestions: PersonMapping[];
  isCurrentOwnerMatched: boolean;
  matchedAliasesList: string[];
}

/**
 * Normalizes Arabic text to unify character variants and strip diacritics.
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    // Remove diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Remove tatweel
    .replace(/\u0640/g, '')
    // Normalize Alef variants
    .replace(/[إأآٱ]/g, 'ا')
    // Normalize Yaa and Alef Maksura
    .replace(/[ىي]/g, 'ي')
    // Normalize Taa Marbouta and Haa
    .replace(/[ةه]/g, 'ه')
    .trim();
}

/**
 * Clean text for standard Latin/Arabic comparative checks
 */
export function cleanForComparison(text: string): string {
  if (!text) return '';
  return normalizeArabic(text)
    .toLowerCase()
    .replace(/[@#]/g, '')
    .replace(/[_\-\.\,\(\)\[\]،؛:!"'؟?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Vocative and prepositional prefixes commonly encountered in Egyptian WhatsApp directives
 */
const PREFIXES = [
  'يا ',
  'يا',
  'كلم ',
  'قول لـ ',
  'قول ل ',
  'مع ',
  'لـ ',
  'ل ',
  'بـ ',
  'ب ',
  'و ',
  'شوفي يا ',
  'شوف يا ',
  'شوف ',
  'شوفي ',
  'خلي ',
  'ابعت لـ ',
  'ابعت ل ',
  '@',
];

/**
 * Department and domain keywords to cross-reference if exact alias isn't mentioned
 */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  Development: ['api', 'backend', 'endpoint', 'bug', 'server', 'database', 'frontend', 'react', 'node', 'redis'],
  'Business Analysis': ['requirements', 'prd', 'flow', 'spec', 'usecase', 'متطلبات', 'مواصفات'],
  'Engineering / Automation': ['automation', 'pipeline', 'runner', 'cron', 'docker', 'webhook', 'اوتوميشن', 'أوتوميشن'],
  'Data Operations': ['report', 'analytics', 'data', 'pivot', 'dashboard', 'query', 'sql', 'داتا', 'بيانات', 'تقرير'],
  Design: ['ui', 'ux', 'figma', 'design', 'layout', 'تصميم', 'واجهة', 'شاشة'],
  Operations: ['payout', 'disbursement', 'iban', 'bank', 'fawry', 'operation', 'تشغيل', 'فواتير', 'مدفوعات', 'حسابات'],
};

/**
 * Cross-references text (transcript, message, or draft description) against the active People Mapping library.
 */
export function crossReferenceTranscriptWithPeople(
  transcriptText: string,
  people: PersonMapping[],
  currentOwner?: string
): CrossReferenceResult {
  if (!transcriptText || !people || people.length === 0) {
    return {
      matches: [],
      primarySuggestion: null,
      primaryMatch: null,
      alternateSuggestions: [],
      isCurrentOwnerMatched: false,
      matchedAliasesList: [],
    };
  }

  const rawText = transcriptText;
  const normalizedSource = normalizeArabic(rawText).toLowerCase();
  const rawWords = rawText.split(/\s+/);

  const detectedMatches: AliasMatch[] = [];
  const seenPersons = new Set<string>();

  // 1. Direct Alias & Canonical Name Search (Ordered by longest alias first to prevent sub-string shadowing)
  for (const person of people) {
    // Collect all candidate alias terms for this person
    const candidateTerms = new Set<string>();
    if (person.displayName) candidateTerms.add(person.displayName);
    if (person.internalName) candidateTerms.add(person.internalName);
    if (person.canonicalName) candidateTerms.add(person.canonicalName);
    if (Array.isArray(person.aliases)) {
      person.aliases.forEach((a) => candidateTerms.add(a));
    }

    // Sort aliases descending by length
    const sortedTerms = Array.from(candidateTerms).sort((a, b) => b.length - a.length);

    for (const term of sortedTerms) {
      if (!term || term.trim().length < 2) continue;

      const normTerm = normalizeArabic(term).toLowerCase();

      // Check for exact substring match in normalized source
      let searchIndex = 0;
      while (searchIndex < normalizedSource.length) {
        const foundIndex = normalizedSource.indexOf(normTerm, searchIndex);
        if (foundIndex === -1) break;

        // Check word boundary: character before and after should not be an Arabic or Latin alphanumeric letter
        const charBefore = foundIndex > 0 ? normalizedSource[foundIndex - 1] : ' ';
        const charAfter =
          foundIndex + normTerm.length < normalizedSource.length
            ? normalizedSource[foundIndex + normTerm.length]
            : ' ';

        const isLetter = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

        const boundaryBefore = !isLetter(charBefore);
        const boundaryAfter = !isLetter(charAfter);

        if (boundaryBefore && boundaryAfter) {
          // Check if this range overlaps with an already found match for this person
          const overlaps = detectedMatches.some(
            (m) =>
              m.person.id === person.id &&
              !(foundIndex + normTerm.length <= m.startIndex || foundIndex >= m.endIndex)
          );

          if (!overlaps) {
            const matchedSnippet = rawText.slice(
              Math.max(0, foundIndex - 15),
              Math.min(rawText.length, foundIndex + normTerm.length + 15)
            );

            detectedMatches.push({
              person,
              matchedAlias: term,
              matchedTextInSource: rawText.slice(foundIndex, foundIndex + normTerm.length),
              startIndex: foundIndex,
              endIndex: foundIndex + normTerm.length,
              matchType: 'exact_alias',
              confidence: 98,
              contextSnippet: `...${matchedSnippet}...`,
            });
            seenPersons.add(person.id);
          }
        }

        searchIndex = foundIndex + 1;
      }

      // Check with vocative and preposition prefixes (e.g. "يا عصمت", "كلم إسماعيل", "لآلاء")
      for (const prefix of PREFIXES) {
        const prefixedTerm = normalizeArabic(prefix + term).toLowerCase();
        let prefixSearchIdx = 0;
        while (prefixSearchIdx < normalizedSource.length) {
          const pIndex = normalizedSource.indexOf(prefixedTerm, prefixSearchIdx);
          if (pIndex === -1) break;

          const overlaps = detectedMatches.some(
            (m) =>
              m.person.id === person.id &&
              !(pIndex + prefixedTerm.length <= m.startIndex || pIndex >= m.endIndex)
          );

          if (!overlaps) {
            const matchedSnippet = rawText.slice(
              Math.max(0, pIndex - 15),
              Math.min(rawText.length, pIndex + prefixedTerm.length + 15)
            );

            detectedMatches.push({
              person,
              matchedAlias: term,
              matchedTextInSource: rawText.slice(pIndex, pIndex + prefixedTerm.length),
              startIndex: pIndex,
              endIndex: pIndex + prefixedTerm.length,
              matchType: 'vocative_prefix',
              confidence: 95,
              contextSnippet: `...${matchedSnippet}...`,
            });
            seenPersons.add(person.id);
          }
          prefixSearchIdx = pIndex + 1;
        }
      }
    }
  }

  // 2. Domain / Department keyword fallback if no direct alias was found
  if (detectedMatches.length === 0) {
    for (const person of people) {
      const keywords = DOMAIN_KEYWORDS[person.department] || [];
      for (const kw of keywords) {
        const normKw = normalizeArabic(kw).toLowerCase();
        if (normalizedSource.includes(normKw)) {
          const kwIndex = normalizedSource.indexOf(normKw);
          detectedMatches.push({
            person,
            matchedAlias: `${kw} (${person.department})`,
            matchedTextInSource: rawText.slice(kwIndex, kwIndex + normKw.length),
            startIndex: kwIndex,
            endIndex: kwIndex + normKw.length,
            matchType: 'department_domain',
            confidence: 78,
            contextSnippet: `Matched domain keyword "${kw}" to ${person.department}`,
          });
          seenPersons.add(person.id);
          break;
        }
      }
    }
  }

  // Sort matches by start position in transcript, then by confidence descending
  detectedMatches.sort((a, b) => {
    if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
    return b.confidence - a.confidence;
  });

  // Unique list of matched aliases
  const matchedAliasesList = Array.from(new Set(detectedMatches.map((m) => m.matchedAlias)));

  // Identify primary suggestion:
  // Primary suggestion is the first person mentioned (who is not just the requester if there is an actionable target)
  const primaryMatch = detectedMatches.length > 0 ? detectedMatches[0] : null;
  const primarySuggestion = primaryMatch ? primaryMatch.person : null;

  // Alternate suggestions: other distinct people found
  const alternateSuggestions = primarySuggestion
    ? detectedMatches
        .filter((m) => m.person.id !== primarySuggestion.id)
        .map((m) => m.person)
        .filter((p, index, self) => index === self.findIndex((o) => o.id === p.id))
    : [];

  // Check if current owner matches the primary suggestion
  let isCurrentOwnerMatched = false;
  if (currentOwner && primarySuggestion) {
    const curNorm = cleanForComparison(currentOwner);
    const targetNorms = [
      cleanForComparison(primarySuggestion.displayName),
      cleanForComparison(primarySuggestion.internalName),
      cleanForComparison(primarySuggestion.canonicalName || ''),
      ...(primarySuggestion.aliases || []).map(cleanForComparison),
    ];
    isCurrentOwnerMatched = targetNorms.some(
      (t) => t && (t === curNorm || curNorm.includes(t) || t.includes(curNorm))
    );
  }

  return {
    matches: detectedMatches,
    primarySuggestion,
    primaryMatch,
    alternateSuggestions,
    isCurrentOwnerMatched,
    matchedAliasesList,
  };
}

/**
 * Splits transcript text into sequential segments of plain text and matched mention pills
 * for interactive visual highlighting in the Review Inbox.
 */
export function splitTranscriptIntoTokens(
  transcriptText: string,
  matches: AliasMatch[]
): Array<{ text: string; isMatch: boolean; match?: AliasMatch }> {
  if (!transcriptText) return [];
  if (!matches || matches.length === 0) {
    return [{ text: transcriptText, isMatch: false }];
  }

  // Sort non-overlapping matches by startIndex
  const sortedMatches = [...matches].sort((a, b) => a.startIndex - b.startIndex);

  const tokens: Array<{ text: string; isMatch: boolean; match?: AliasMatch }> = [];
  let currentIndex = 0;

  for (const match of sortedMatches) {
    if (match.startIndex > currentIndex) {
      tokens.push({
        text: transcriptText.slice(currentIndex, match.startIndex),
        isMatch: false,
      });
    }

    if (match.endIndex > currentIndex) {
      tokens.push({
        text: transcriptText.slice(Math.max(currentIndex, match.startIndex), match.endIndex),
        isMatch: true,
        match,
      });
      currentIndex = Math.max(currentIndex, match.endIndex);
    }
  }

  if (currentIndex < transcriptText.length) {
    tokens.push({
      text: transcriptText.slice(currentIndex),
      isMatch: false,
    });
  }

  return tokens;
}
