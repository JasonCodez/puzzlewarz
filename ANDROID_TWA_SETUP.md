# Android TWA Setup

This repo now includes the web-side groundwork for a Trusted Web Activity:

- Web manifest at `/manifest.webmanifest`
- Website-to-app association endpoint at `/.well-known/assetlinks.json`
- Bubblewrap helper scripts in `package.json`

## 1. Choose Android app identity

Decide these values before generating the wrapper app:

- Package name: `com.puzzlewarz.app`
- Android app display name
- Signing key / keystore that will be used for release builds

Recommended repo defaults for Puzzle Warz:

- Keystore path: `android\puzzlewarz-upload-keystore.jks`
- Alias: `puzzlewarz-upload`

## 2. Install Bubblewrap

Use one of these:

```powershell
npm i -g @bubblewrap/cli
```

or run the repo script directly through `npx`:

```powershell
npm run twa:init
```

## 3. Generate PWA screenshots

The manifest screenshots live in `public/pwa/` and can be regenerated locally before packaging:

```powershell
npm run build
npx next start -p 3002
```

Then, in a second terminal:

```powershell
$env:PWA_SCREENSHOT_BASE_URL='http://127.0.0.1:3002'
npm run pwa:screenshots
```

This produces:

- `public/pwa/screenshot-home-wide.png`: full-page desktop capture
- `public/pwa/screenshot-home-narrow.png`: true phone-width mobile capture with a shorter viewport crop

If you are capturing against another host, point `PWA_SCREENSHOT_BASE_URL` at that origin instead.

## 4. Initialize the Android wrapper

Bubblewrap reads values from the live manifest:

```powershell
bubblewrap init --manifest=https://puzzlewarz.com/manifest.webmanifest
```

If you use the repo helper:

```powershell
npm run twa:init
```

## 5. Build and install locally

```powershell
npm run twa:build
npm run twa:install
```

## 6. Publish the website-to-app association

Set these deployment environment variables for Puzzle Warz:

- `ANDROID_TWA_SHA256_FINGERPRINTS`: one or more SHA-256 fingerprints, separated by commas or new lines

Optional override:

- `ANDROID_TWA_PACKAGE_NAME`: only needed if you want to override the repo default package id of `com.puzzlewarz.app`

Once those are set, the site will serve a valid Digital Asset Links file from:

```text
https://puzzlewarz.com/.well-known/assetlinks.json
```

If the variables are missing, the endpoint returns an empty array so the TWA will fail closed instead of pretending verification is configured.

With the current repo default, setting `ANDROID_TWA_SHA256_FINGERPRINTS` is enough to make the site emit a valid asset links file for `com.puzzlewarz.app`.

## 7. Get the signing fingerprint

If `keytool` is not on `PATH`, install Android Studio or a JDK 17+ first. The repo includes PowerShell helpers for Windows:

Create the keystore:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\new-android-keystore.ps1 -KeystorePath .\android\puzzlewarz-upload-keystore.jks -Alias puzzlewarz-upload
```

Read the SHA-256 fingerprint later:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\get-android-keystore-sha256.ps1 -KeystorePath .\android\puzzlewarz-upload-keystore.jks -Alias puzzlewarz-upload
```

The script now prompts for the keystore password in PowerShell. Nothing is echoed as you type, which is expected.

If you forget the password for a brand-new local keystore that has not been used for a Play release yet, do not try to recover it. Delete the `.jks` file and create a new keystore with a password you save.

If you prefer the raw `keytool` command, this is the direct equivalent:

```powershell
keytool -genkeypair -v -keystore .\android\puzzlewarz-upload-keystore.jks -alias puzzlewarz-upload -keyalg RSA -keysize 2048 -validity 9125 -dname "CN=Puzzle Warz, OU=Mobile, O=Puzzle Warz, L=Unknown, S=Unknown, C=US"
```

Example `keytool` command:

```powershell
keytool -list -v -keystore path\to\upload-keystore.jks -alias your-key-alias
```

Copy the `SHA256` fingerprint value into `ANDROID_TWA_SHA256_FINGERPRINTS`.

## 8. Verify on device

After installing the generated Android app, verify the TWA provider:

```powershell
adb logcat -v brief | Select-String "TWAProviderPicker|digital_asset_links|OriginVerifier"
```

If Digital Asset Links verification fails, the app will still open as a Custom Tab with browser UI instead of a full-screen TWA.