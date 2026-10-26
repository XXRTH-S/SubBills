import { validateState } from './validation.js';

// Pure preview only: no storage access, network requests or account writes.
// The caller must display this preview and obtain explicit confirmation first.
export function prepareAccountImport(raw) {
  const { value, damaged } = validateState(raw);
  if (damaged) throw new Error('IMPORT_INVALID_DATA');
  return {
    cards: value.cards.map(c => ({ legacyId: c.id, name: c.name, issuer: c.issuer, last4: c.last4 })),
    subscriptions: value.subs.map(s => ({ legacyId: s.id, name: s.name, cents: s.cents,
      currency: 'THB', cycle: s.cycle, anchorDate: s.date, legacyCardId: s.card || null })),
    // Prototype statuses cannot prove historical price/card values. Do not
    // silently turn them into financial history or overwrite account records.
    skippedStatuses: { paid: value.paid.length, read: value.read.length },
    requiresConfirmation: true
  };
}
