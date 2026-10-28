# Secure storage boundary

Store refresh tokens only with Keychain/Keystore-backed storage (for example, the maintained secure-storage package selected during native dependency setup). Do not put refresh tokens in AsyncStorage or plaintext files. Access tokens remain short-lived and in memory where possible.
