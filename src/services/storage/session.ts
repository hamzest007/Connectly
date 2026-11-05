import * as Keychain from 'react-native-keychain';

export type Session = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatarUrl?: string;
    accountType?: 'user' | 'page';
    role?: string;
    interests?: string[];
  };
  refreshToken: string;
};
const SERVICE = 'com.connectly.session';
const HISTORY_SERVICE = 'com.connectly.reels.history';

export async function saveSession(session: Session) {
  await Keychain.setGenericPassword('connectly', JSON.stringify(session), {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadSession(): Promise<Session | null> {
  const stored = await Keychain.getGenericPassword({ service: SERVICE });
  if (!stored) return null;
  try {
    return JSON.parse(stored.password) as Session;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await Keychain.resetGenericPassword({ service: SERVICE });
}

export async function loadReelHistory(): Promise<string[]> {
  const stored = await Keychain.getGenericPassword({
    service: HISTORY_SERVICE,
  });
  if (!stored) return [];
  try {
    return JSON.parse(stored.password) as string[];
  } catch {
    return [];
  }
}

export async function saveReelHistory(ids: string[]) {
  await Keychain.setGenericPassword(
    'connectly',
    JSON.stringify(ids.slice(0, 100)),
    {
      service: HISTORY_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    },
  );
}
