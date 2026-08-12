import type { Group, GroupInvitation } from '../types/models';

const INVITATION_PREFIX = 'traveltrack:v1:';
const MAX_TEXT_LENGTH = 256;

function randomPart(): string {
  return Math.random().toString(36).slice(2, 12);
}

export function createSessionValue(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomPart()}-${randomPart()}`;
}

export function createGroupInvitation(group: Group, ttlMs = 30 * 60 * 1000): GroupInvitation {
  return {
    version: 1,
    groupId: group.id,
    groupName: group.name,
    sessionId: group.sessionId,
    joinToken: group.joinToken,
    expiresAt: Date.now() + ttlMs,
    ...(group.networkName ? { networkName: group.networkName } : {}),
    ...(group.passphrase ? { passphrase: group.passphrase } : {}),
  };
}

export function encodeGroupInvitation(invitation: GroupInvitation): string {
  return `${INVITATION_PREFIX}${encodeURIComponent(JSON.stringify(invitation))}`;
}

export function parseGroupInvitation(value: string, now: number = Date.now()): GroupInvitation | null {
  if (!value.startsWith(INVITATION_PREFIX)) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value.slice(INVITATION_PREFIX.length)));
    if (
      parsed?.version !== 1 ||
      typeof parsed.groupId !== 'string' ||
      typeof parsed.groupName !== 'string' ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.joinToken !== 'string' ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= now ||
      parsed.groupId.length > MAX_TEXT_LENGTH ||
      parsed.groupName.length > MAX_TEXT_LENGTH ||
      parsed.sessionId.length > MAX_TEXT_LENGTH ||
      parsed.joinToken.length > MAX_TEXT_LENGTH
    ) return null;

    const networkName = typeof parsed.networkName === 'string' && parsed.networkName.length <= MAX_TEXT_LENGTH ? parsed.networkName : undefined;
    const passphrase = typeof parsed.passphrase === 'string' && parsed.passphrase.length <= MAX_TEXT_LENGTH ? parsed.passphrase : undefined;

    return {
      ...parsed,
      ...(networkName ? { networkName } : {}),
      ...(passphrase ? { passphrase } : {}),
    } as GroupInvitation;
  } catch {
    return null;
  }
}

export function payloadMatchesGroup(payload: any, group: Group | null): boolean {
  if (!group || !payload) return false;
  return (
    payload.groupId === group.id &&
    payload.sessionId === group.sessionId &&
    payload.joinToken === group.joinToken
  );
}

export function isValidLocationPayload(payload: any): boolean {
  return (
    payload?.type === 'LOCATION' &&
    typeof payload.memberId === 'string' && payload.memberId.length <= MAX_TEXT_LENGTH &&
    typeof payload.memberName === 'string' && payload.memberName.length <= MAX_TEXT_LENGTH &&
    typeof payload.latitude === 'number' && Number.isFinite(payload.latitude) &&
    typeof payload.longitude === 'number' && Number.isFinite(payload.longitude) &&
    payload.latitude >= -90 && payload.latitude <= 90 &&
    payload.longitude >= -180 && payload.longitude <= 180 &&
    typeof payload.accuracy === 'number' && Number.isFinite(payload.accuracy) &&
    payload.accuracy >= 0 && payload.accuracy <= 10_000 &&
    Number.isInteger(payload.sequence) && payload.sequence >= 0 &&
    typeof payload.fixAgeMs === 'number' && Number.isFinite(payload.fixAgeMs)
  );
}

export function sanitizeTransportText(value: unknown, fallback: string, max = MAX_TEXT_LENGTH): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().replace(/[\u0000-\u001f\u007f]/g, '');
  return trimmed ? trimmed.slice(0, max) : fallback;
}
