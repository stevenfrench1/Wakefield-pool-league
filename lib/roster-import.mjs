import { uid } from './domain.mjs';

export function prepareRosterImport(state, plan, revision) {
  if (!plan || typeof plan.id !== 'string' || !plan.id.trim()) {
    throw Error('The roster import needs an identifier.');
  }
  if (state.appliedRosterImports?.includes(plan.id)) {
    return { state, applied: false };
  }
  if (!Number.isInteger(revision) || revision < 0 || plan.expectedRevision !== revision) {
    throw Error('The club revision has changed. Review the roster import again.');
  }
  if (state.league.length || state.cups.length || state.submissions.length) {
    throw Error('Import the roster before drawing competitions or submitting results.');
  }
  if (!Array.isArray(plan.players) || plan.players.length < 2 || plan.players.length > 64) {
    throw Error('The roster must contain between 2 and 64 players.');
  }

  const existing = new Map(state.players.map(player => [player.id, player]));
  const retained = new Set();
  const names = new Set();
  const entries = plan.players.map(entry => {
    if (!entry || typeof entry.name !== 'string') {
      throw Error('Each player needs a display name.');
    }
    const name = entry.name.trim();
    if (!name || name.length > 45) {
      throw Error('Use nonblank display names of up to 45 characters.');
    }
    const key = name.toLowerCase();
    if (names.has(key)) throw Error('Use unique display names.');
    names.add(key);

    if (entry.existingId !== undefined) {
      if (!existing.has(entry.existingId)) throw Error('An existing player ID was not found.');
      if (retained.has(entry.existingId)) throw Error('Retain each existing player only once.');
      retained.add(entry.existingId);
    }
    return { name, existingId: entry.existingId };
  });
  if (retained.size !== existing.size) {
    throw Error('The import must explicitly retain every existing player.');
  }

  const next = structuredClone(state);
  const preserved = new Map(next.players.map(player => [player.id, player]));
  next.players = entries.map(entry => entry.existingId === undefined
    ? { id: uid(), name: entry.name, rating: 0 }
    : { ...preserved.get(entry.existingId), name: entry.name });
  next.appliedRosterImports = [...(next.appliedRosterImports || []), plan.id];
  return { state: next, applied: true };
}
