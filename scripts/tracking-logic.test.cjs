const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const freshness = require('../src/utils/trackingFreshness.ts');
const protocol = require('../src/utils/sessionProtocol.ts');
const geofence = require('../src/utils/geofence.ts');
const heading = require('../src/utils/heading.ts');
const stabilization = require('../src/utils/locationStabilization.ts');

const now = 1_000_000;
assert.equal(freshness.getLocalFixAgeMs(now - 12_000, now), 12_000);
assert.equal(freshness.getLocalFixAgeMs(now + 5_000, now), 0, 'future sender timestamps clamp to zero age');
assert.equal(freshness.reconstructSourceFixTime(45_000, now), now - 45_000);
assert.equal(freshness.getLocationFreshness(now - 30_000, now), 'live');
assert.equal(freshness.getLocationFreshness(now - 30_001, now), 'stale');
assert.equal(freshness.getLocationFreshness(now - 120_001, now), 'offline');

const group = {
  id: 'group-1', name: 'Trail', leaderId: 'leader', radiusMeters: 50,
  createdAt: now, sessionId: 'session-1', joinToken: 'token-1',
};
const invitation = protocol.createGroupInvitation(group, 10_000);
const encoded = protocol.encodeGroupInvitation(invitation);
assert.deepEqual(protocol.parseGroupInvitation(encoded, invitation.expiresAt - 1), invitation);
assert.equal(protocol.parseGroupInvitation(encoded, invitation.expiresAt), null, 'expired invitations are rejected');
assert.equal(protocol.payloadMatchesGroup({ groupId: 'group-1', sessionId: 'session-1', joinToken: 'wrong' }, group), false);

assert.equal(protocol.isValidLocationPayload({
  type: 'LOCATION', memberId: 'm1', memberName: 'Member', latitude: 7, longitude: 80,
  accuracy: 8, sequence: 1, fixAgeMs: 5_000,
}), true);
assert.equal(protocol.isValidLocationPayload({
  type: 'LOCATION', memberId: 'm1', memberName: 'Member', latitude: 107, longitude: 80,
  accuracy: 8, sequence: 1, fixAgeMs: 5_000,
}), false, 'impossible coordinates are rejected');

assert.equal(geofence.getMemberStatus(40, 50, 5), 'safe');
assert.equal(geofence.getMemberStatus(52, 50, 5), 'warning');
assert.equal(geofence.getMemberStatus(60, 50, 5), 'out_of_range');

assert.equal(heading.androidRotationVectorHeading(-Math.PI / 2), 90);
const smoothedNorth = heading.smoothHeading(359, 1);
assert.ok(smoothedNorth > 355 || smoothedNorth < 5, 'heading smoothing crosses north by the short path');
assert.equal(heading.getRadarHeading('rotation-vector', 72), 72, 'fused compass rotates the radar');
assert.equal(heading.getRadarHeading('magnetometer', 361), 1, 'magnetometer heading is normalized');
assert.equal(heading.getRadarHeading('gps-course', 25), 0, 'GPS travel course cannot impersonate phone orientation');
assert.equal(heading.getRadarHeading('none', 180), 0, 'sensorless radar remains north-up');

const stableFix = stabilization.stabilizeLocationFix(
  { latitude: 7, longitude: 80, accuracy: 5, speed: 0, bearing: 0, timestamp: 1 },
  { latitude: 7.000001, longitude: 80.000001, accuracy: 6, speed: 0, bearing: 45, timestamp: 2 }
);
assert.equal(stableFix.latitude, 7, 'sub-metre GPS wander does not move the radar centre');
assert.equal(stableFix.timestamp, 2, 'stabilized stationary fixes remain fresh');
assert.equal(stableFix.bearing, 45, 'compass/course metadata still updates');

console.log('Tracking safety logic: all assertions passed.');
