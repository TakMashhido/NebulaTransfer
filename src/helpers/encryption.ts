export async function deriveKey(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyData = enc.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', keyData);
    return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptArrayBuffer(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, data);
    const result = new Uint8Array(iv.byteLength + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.byteLength);
    return result.buffer;
}

export async function decryptArrayBuffer(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    return crypto.subtle.decrypt({name: 'AES-GCM', iv: new Uint8Array(iv)}, key, encrypted);
}
