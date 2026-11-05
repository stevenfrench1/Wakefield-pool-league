import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareRosterImport } from '../lib/roster-import.mjs';

const club = () => ({
  settings: { name: 'Test club' },
  players: [
    { id: 'existing-a', name: 'Player A', rating: 72, pinHash: 'saved-hash-a' },
    { id: 'existing-b', name: 'Player B', rating: 39, pinHash: 'saved-hash-b' },
  ],
  league: [], cups: [], submissions: [], activity: [],
});
const plan = () => ({
  id: 'synthetic-import', expectedRevision: 7,
  players: [
    { name: ' Player A ', existingId: 'existing-a' },
    { name: 'Player B', existingId: 'existing-b' },
    { name: 'Player C' },
    { name: 'Player D' },
  ],
});

test('roster import adds the exact roster once without mutating the original club', () => {
  const original = club();
  const before = structuredClone(original);
  const proposal = plan();
  const proposalBefore = structuredClone(proposal);
  const result = prepareRosterImport(original, proposal, 7);
  assert.equal(result.applied, true);
  assert.equal(result.state.players.length, 4);
  assert.equal(new Set(result.state.players.map(player => player.id)).size, 4);
  assert.deepEqual(result.state.players.map(player => player.name), ['Player A', 'Player B', 'Player C', 'Player D']);
  assert.deepEqual(result.state.players.slice(0, 2), before.players);
  assert(result.state.players.slice(2).every(player => player.rating === 0 && !('pinHash' in player)));
  assert.deepEqual(result.state.appliedRosterImports, ['synthetic-import']);
  assert.deepEqual(original, before);
  assert.deepEqual(proposal, proposalBefore);
  assert.notStrictEqual(result.state.settings, original.settings);
  assert.notStrictEqual(result.state.players[0], original.players[0]);

  // A later revision or newly drawn competition must not reapply a completed import.
  result.state.league.push({ id: 'later-match' });
  const repeat = prepareRosterImport(result.state, proposal, 8);
  assert.equal(repeat.applied, false);
  assert.strictEqual(repeat.state, result.state);
  assert.equal(repeat.state.players.length, 4);
});

test('roster import retains existing IDs, ratings and PIN hashes when names are updated', () => {
  const original = club();
  original.appliedRosterImports = ['previous-import'];
  const proposal = plan();
  proposal.players[0].name = 'Renamed Player A';
  const { state } = prepareRosterImport(original, proposal, 7);
  assert.deepEqual(state.players[0], { ...original.players[0], name: 'Renamed Player A' });
  assert.deepEqual(state.players[1], original.players[1]);
  assert.deepEqual(state.appliedRosterImports, ['previous-import', 'synthetic-import']);
});

test('roster import rejects duplicate, blank, oversized and non-string display names', () => {
  for (const invalid of [' player a ', '   ', 'x'.repeat(46), 123, null]) {
    const proposal = plan();
    proposal.players[2].name = invalid;
    assert.throws(() => prepareRosterImport(club(), proposal, 7), /unique|nonblank|display name/);
  }
});

test('roster import requires every existing player exactly once and rejects unknown IDs', () => {
  const missing = plan();
  delete missing.players[0].existingId;
  assert.throws(() => prepareRosterImport(club(), missing, 7), /explicitly retain every existing player/);

  const duplicate = plan();
  duplicate.players[2].existingId = 'existing-a';
  assert.throws(() => prepareRosterImport(club(), duplicate, 7), /only once/);

  const unknown = plan();
  unknown.players[2].existingId = 'not-an-existing-player';
  assert.throws(() => prepareRosterImport(club(), unknown, 7), /not found/);
});

test('roster import requires the exact revision and no competitions or pending submissions', () => {
  assert.throws(() => prepareRosterImport(club(), plan(), 8), /revision has changed/);
  const stringRevision = plan();
  stringRevision.expectedRevision = '7';
  assert.throws(() => prepareRosterImport(club(), stringRevision, 7), /revision has changed/);
  assert.throws(() => prepareRosterImport(club(), plan(), undefined), /revision has changed/);
  for (const collection of ['league', 'cups', 'submissions']) {
    const original = club();
    original[collection].push({ id: 'existing-record' });
    const before = structuredClone(original);
    assert.throws(() => prepareRosterImport(original, plan(), 7), /before drawing competitions/);
    assert.deepEqual(original, before);
  }
});

test('roster import accepts two through 64 players and rejects counts outside that range', () => {
  for (const count of [2, 64]) {
    const proposal = plan();
    proposal.players = proposal.players.slice(0, 2);
    while (proposal.players.length < count) proposal.players.push({ name: `Synthetic ${proposal.players.length}` });
    assert.equal(prepareRosterImport(club(), proposal, 7).state.players.length, count);
  }
  for (const players of [null, [], [{ name: 'Player A', existingId: 'existing-a' }], Array.from({ length: 65 }, (_, i) => ({ name: `Synthetic ${i}` }))]) {
    assert.throws(() => prepareRosterImport(club(), { ...plan(), players }, 7), /between 2 and 64/);
  }
});
