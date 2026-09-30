# Nutrivo

Nutrivo is a nutrition tracking project built with Expo, React Native, TypeScript, and Expo Router for Android and web.

## Current status

The app has a routing preview with placeholder screens. Authentication, nutrition tracking, scanning, and the final visual design are not implemented yet. The existing Firebase configuration remains in `src/config/firebase.ts`.

## Run locally

```bash
npm install
npx expo start --web
```

For Android, run `npx expo start --android` with an Android emulator or use the QR code from `npx expo start` on a compatible device.

The `src/app` directory contains routes. Shared code belongs in the supporting folders under `src`.
