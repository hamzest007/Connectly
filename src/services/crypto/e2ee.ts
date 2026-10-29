import 'react-native-get-random-values';
import nacl from 'tweetnacl';
import {decodeBase64, decodeUTF8, encodeBase64, encodeUTF8} from 'tweetnacl-util';
import * as Keychain from 'react-native-keychain';
import {apiRequest} from '../api/client';

const SERVICE = 'com.connectly.e2ee.identity.v1';
type Identity = {publicKey: string; secretKey: string};
export type EncryptedMessage = {
  version: 1;
  nonce: string;
  senderPublicKey: string;
  ciphertexts: Record<string, string>;
};

async function identity(): Promise<Identity> {
  const stored = await Keychain.getGenericPassword({service: SERVICE});
  if (stored) return JSON.parse(stored.password) as Identity;
  const pair = nacl.box.keyPair();
  const value = {publicKey: encodeBase64(pair.publicKey), secretKey: encodeBase64(pair.secretKey)};
  await Keychain.setGenericPassword('connectly-e2ee', JSON.stringify(value), {service: SERVICE, accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
  return value;
}

export async function publishIdentityKey(accessToken: string) {
  const key = await identity();
  await apiRequest('/users/me/keys', {method: 'PUT', body: JSON.stringify({publicKey: key.publicKey})}, accessToken);
}

export async function encryptMessage(body: string, participantIds: string[], accessToken: string): Promise<EncryptedMessage> {
  const key = await identity();
  const ids = Array.from(new Set(participantIds));
  const publicKeys = await apiRequest<Array<{_id: string; publicKey: string}>>(`/users/me/keys?userIds=${encodeURIComponent(ids.join(','))}`, {}, accessToken);
  const byId = new Map(publicKeys.map(item => [item._id, item.publicKey]));
  const missing = ids.filter(id => !byId.get(id));
  if (missing.length) throw new Error('A participant has not opened an encrypted session yet. Ask them to open chat again.');
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const ciphertexts: Record<string, string> = {};
  for (const id of ids) {
    const shared = nacl.box.before(decodeBase64(byId.get(id)!), decodeBase64(key.secretKey));
    ciphertexts[id] = encodeBase64(nacl.box.after(decodeUTF8(body), nonce, shared));
  }
  return {version: 1, nonce: encodeBase64(nonce), senderPublicKey: key.publicKey, ciphertexts};
}

export async function decryptMessage(message: {e2ee?: EncryptedMessage}, currentUserId: string): Promise<string> {
  if (!message.e2ee) return '';
  const ciphertext = message.e2ee.ciphertexts[currentUserId];
  if (!ciphertext) return 'Unable to decrypt this message on this device.';
  const key = await identity();
  const shared = nacl.box.before(decodeBase64(message.e2ee.senderPublicKey), decodeBase64(key.secretKey));
  const plaintext = nacl.box.open.after(decodeBase64(ciphertext), decodeBase64(message.e2ee.nonce), shared);
  return plaintext ? encodeUTF8(plaintext) : 'Unable to decrypt this message on this device.';
}
