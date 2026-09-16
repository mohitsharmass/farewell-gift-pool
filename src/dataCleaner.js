/**
 * DataCleaner - Intelligent data ingestion, normalization, de-duplication,
 * fuzzy name merging, and validation for messy contribution lists.
 */

class DataCleaner {
  /**
   * Parse inconsistent currency amount representations:
   * Examples: "₹1,000", "1000", "Rs. 1000", "INR 1000", "1,000.50", " 1000 ", "1k", "1.5k", "500/-", "₹ 2,500.00"
   * Returns float number or null if invalid.
   * 
   * @param {string|number} rawAmount
   * @returns {number|null}
   */
  static parseAmount(rawAmount) {
    if (typeof rawAmount === 'number') {
      return !isNaN(rawAmount) && rawAmount > 0 ? Math.round(rawAmount * 100) / 100 : null;
    }
    if (!rawAmount || typeof rawAmount !== 'string') {
      return null;
    }

    let cleaned = rawAmount.trim().toLowerCase();

    // Check for negative amounts
    if (cleaned.startsWith('-') || cleaned.includes('negative')) {
      return null;
    }

    // Handle 'k' multiplier (e.g. 1k = 1000, 1.5k = 1500)
    let multiplier = 1;
    if (/[\d.]+\s*k\b/i.test(cleaned)) {
      multiplier = 1000;
      cleaned = cleaned.replace(/k/gi, '');
    }

    // Remove currency prefixes/suffixes and punctuation: ₹, rs., rs, inr, /-, commas
    cleaned = cleaned
      .replace(/₹/g, '')
      .replace(/inr/gi, '')
      .replace(/rs\.?/gi, '')
      .replace(/\/-+/g, '')
      .replace(/-/g, '')
      .replace(/,/g, '')
      .trim();

    // Extract first valid floating point number
    const match = cleaned.match(/^([0-9]+(?:\.[0-9]{1,2})?)/);
    if (!match) {
      return null;
    }

    const val = parseFloat(match[1]) * multiplier;
    if (isNaN(val) || val <= 0) {
      return null;
    }

    return Math.round(val * 100) / 100;
  }

  /**
   * Normalize person names for consistent comparison:
   * Trims whitespace, removes non-alphabetic noise, standardizes casing to Title Case.
   * 
   * @param {string} rawName
   * @returns {string}
   */
  static normalizeName(rawName) {
    if (!rawName || typeof rawName !== 'string') return '';
    
    // Clean unwanted characters but preserve spaces and hyphens
    let cleaned = rawName
      .replace(/["'()]/g, '')
      .replace(/[0-9]/g, '') // remove accidental digits in names
      .trim();

    // Standardize to Title Case (e.g. "aLIcE sHARMA" -> "Alice Sharma")
    return cleaned
      .split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Calculate Levenshtein distance between two strings.
   */
  static levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Determine if two names represent the same person.
   * Supports: exact match, case/space differences, substring matching (e.g. "Alice" vs "Alice S."),
   * or Levenshtein distance <= 1 for short names, <= 2 for long names.
   */
  static areNamesSimilar(nameA, nameB) {
    const a = nameA.toLowerCase();
    const b = nameB.toLowerCase();
    if (a === b) return true;

    // Check if one is direct initial prefix of another (e.g. "Alice S." and "Alice Sharma")
    const wordsA = a.split(/\s+/);
    const wordsB = b.split(/\s+/);

    if (wordsA[0] === wordsB[0]) {
      // First name matches
      if (wordsA.length === 1 || wordsB.length === 1) {
        return true;
      }
      if (wordsA[1] && wordsB[1] && (wordsA[1][0] === wordsB[1][0])) {
        return true;
      }
    }

    const maxLen = Math.max(a.length, b.length);
    if (maxLen <= 4) {
      return this.levenshteinDistance(a, b) <= 1;
    }
    return this.levenshteinDistance(a, b) <= 2;
  }

  /**
   * Parse messy text/CSV lines into raw contribution records.
   * Handles formats:
   * - "Alice, 1000, Paid full"
   * - "Bob: ₹500 (partial)"
   * - "Charlie - Rs. 1,000"
   * - Tab-delimited, comma-delimited, colon or hyphen separated.
   * 
   * @param {string} rawText
   * @returns {Array<{raw: string, lineNum: number, name: string, amount: string, note: string}>}
   */
  static parseRawText(rawText) {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const parsed = [];

    lines.forEach((line, index) => {
      // Skip commented lines
      if (line.startsWith('#') || line.startsWith('//')) return;

      // Handle commas inside numeric amounts (e.g. ₹1,000 or 10,000) so they don't break CSV split
      const normalizedLine = line.replace(/([0-9]),([0-9])/g, '$1$2');

      let name = '';
      let amount = '';
      let note = '';

      // Try CSV format (Name, Amount, Note)
      if (normalizedLine.includes(',')) {
        const parts = normalizedLine.split(',').map(p => p.trim());
        name = parts[0] || '';
        amount = parts[1] || '';
        note = parts.slice(2).join(', ').trim();
      } else if (normalizedLine.includes(':')) {
        const parts = normalizedLine.split(':').map(p => p.trim());
        name = parts[0] || '';
        amount = parts[1] || '';
      } else if (normalizedLine.includes('\t')) {
        const parts = normalizedLine.split('\t').map(p => p.trim());
        name = parts[0] || '';
        amount = parts[1] || '';
        note = parts.slice(2).join(' ').trim();
      } else if (normalizedLine.includes(' - ')) {
        const parts = normalizedLine.split(' - ').map(p => p.trim());
        name = parts[0] || '';
        amount = parts[1] || '';
      } else {
        // Fallback: match name and amount by pattern
        const match = normalizedLine.match(/^([A-Za-z\s.]+)\s+([₹$€Rs.INRA-Za-z0-9,./-]+)(.*)$/);
        if (match) {
          name = match[1].trim();
          amount = match[2].trim();
          note = (match[3] || '').trim();
        } else {
          name = normalizedLine;
          amount = '';
        }
      }

      parsed.push({
        lineNum: index + 1,
        raw: line,
        name,
        amount,
        note
      });
    });

    return parsed;
  }

  /**
   * Main import and reconciliation pipeline:
   * 1. Ingests raw rows.
   * 2. Cleans & validates amounts (rejects invalid/missing).
   * 3. Normalizes & merges similar name spellings.
   * 4. De-duplicates identical entries.
   * 5. Produces cleaned contributions and a comprehensive audit report.
   * 
   * @param {string|Array} input - Raw text or pre-parsed rows
   * @param {Array} existingParticipants - Current participants to merge with
   */
  static cleanAndReconcile(input, existingParticipants = []) {
    const rawRows = typeof input === 'string' ? this.parseRawText(input) : input;

    const report = {
      totalProcessed: rawRows.length,
      importedCount: 0,
      deduplicatedCount: 0,
      mergedCount: 0,
      rejectedCount: 0,
      imported: [],
      deduplicated: [],
      merged: [],
      rejected: []
    };

    const canonicalNames = {}; // maps normalized name -> canonical name
    const canonicalMembers = []; // array of { id, name }

    // Seed with existing participants
    existingParticipants.forEach(p => {
      canonicalMembers.push({ id: p.id, name: p.name });
      canonicalNames[p.name.toLowerCase()] = p.name;
    });

    const validEntries = [];

    // Step 1: Validation & Amount Parsing
    rawRows.forEach(row => {
      const normalizedName = this.normalizeName(row.name);

      // Validate Name
      if (!normalizedName || normalizedName.length < 2) {
        report.rejectedCount++;
        report.rejected.push({
          row: row.lineNum || 'N/A',
          raw: row.raw || JSON.stringify(row),
          reason: 'Missing or invalid person name'
        });
        return;
      }

      // Validate Amount
      const parsedAmount = this.parseAmount(row.amount);
      if (parsedAmount === null || parsedAmount <= 0) {
        report.rejectedCount++;
        report.rejected.push({
          row: row.lineNum || 'N/A',
          raw: row.raw || JSON.stringify(row),
          reason: `Invalid or non-positive amount: "${row.amount || 'Empty'}"`
        });
        return;
      }

      validEntries.push({
        lineNum: row.lineNum,
        raw: row.raw,
        originalName: row.name,
        normalizedName,
        amount: parsedAmount,
        note: (row.note || '').trim()
      });
    });

    // Step 2: Canonical Name Merging (Fuzzy Matching)
    validEntries.forEach(entry => {
      let matchedCanonical = null;

      // Check against known canonical names
      for (const knownName of Object.values(canonicalNames)) {
        if (this.areNamesSimilar(entry.normalizedName, knownName)) {
          matchedCanonical = knownName;
          break;
        }
      }

      if (matchedCanonical) {
        if (entry.originalName.trim() !== matchedCanonical) {
          report.mergedCount++;
          report.merged.push({
            original: entry.originalName,
            mergedInto: matchedCanonical,
            reason: `Fuzzy spelling / casing matched to "${matchedCanonical}"`
          });
        }
        entry.canonicalName = matchedCanonical;
      } else {
        // New canonical participant
        entry.canonicalName = entry.normalizedName;
        canonicalNames[entry.normalizedName.toLowerCase()] = entry.normalizedName;
        canonicalMembers.push({
          id: 'm_' + Math.random().toString(36).substr(2, 9),
          name: entry.normalizedName
        });
      }
    });

    // Step 3: De-duplication of Identical Entries
    const seenSignatures = new Map();
    const finalCleanedPayments = [];

    validEntries.forEach(entry => {
      // Create unique signature based on person, amount, and note
      const signature = `${entry.canonicalName.toLowerCase()}_${entry.amount}_${entry.note.toLowerCase()}`;

      if (seenSignatures.has(signature)) {
        report.deduplicatedCount++;
        const prev = seenSignatures.get(signature);
        report.deduplicated.push({
          row: entry.lineNum || 'N/A',
          person: entry.canonicalName,
          amount: entry.amount,
          reason: `Duplicate contribution matching previous entry at row ${prev.lineNum || 'earlier'}`
        });
        return;
      }

      seenSignatures.set(signature, entry);

      // Find member ID
      const member = canonicalMembers.find(m => m.name === entry.canonicalName);
      const memberId = member ? member.id : 'm_' + Date.now();

      const cleanedPayment = {
        id: 'p_clean_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        payerId: memberId,
        amount: entry.amount,
        note: entry.note || 'Cleaned contribution',
        beneficiaryId: null,
        date: 'Imported'
      };

      finalCleanedPayments.push(cleanedPayment);
      report.importedCount++;
      report.imported.push({
        person: entry.canonicalName,
        amount: entry.amount,
        note: entry.note || 'Cleaned contribution'
      });
    });

    return {
      cleanedPayments: finalCleanedPayments,
      participants: canonicalMembers,
      report
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataCleaner;
}
