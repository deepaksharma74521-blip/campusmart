# 📱 Campus Mart – Android WebView App & APK Guide

This folder contains the complete, production-ready **Android Studio WebView Project** for Campus Mart.

---

## 🚀 3 Ways to Get & Run the Android App

---

### Method 1: Instant PWA Mobile App (⭐ Recommended & Fastest)
*No compilation or Android SDK required!*

1. Connect your Laptop and Android Phone to the **same Wi-Fi / Mobile Hotspot**.
2. Find your Laptop IP address (in CMD / PowerShell type `ipconfig` -> find IPv4 address, e.g. `192.168.1.15`).
3. Make sure the server is running on your laptop:
   ```bash
   python server.py
   ```
4. On your Android phone, open Chrome and visit:
   ```text
   http://192.168.1.15:5000
   ```
5. Chrome will show an **"Install Campus Mart / Add to Home screen"** banner at the bottom (or tap 3 dots `⋮` -> "Add to Home screen" / "Install app").
6. **Campus Mart App Icon** will appear on your phone's home screen. When launched, it runs in full-screen standalone mode like a native app with zero browser bars!

---

### Method 2: 1-Click Free Online APK Generator (Fastest .apk File)
1. Go to [AppsGeyser Website to App](https://appsgeyser.com/create-website-app/) or [PWABuilder.com](https://www.pwabuilder.com/).
2. Enter your live website URL (e.g. your Ngrok / LocalTunnel URL or deployed domain).
3. Set App Name: **Campus Mart**
4. Upload Icon: `assets/icons/icon-512.png`
5. Click **"Generate APK"** -> Download the ready-to-install `CampusMart.apk` directly to your phone!

---

### Method 3: Build APK via Android Studio (Standard Developer Method)

1. Download & Open **Android Studio**.
2. Select **"Open an Existing Project"** and select the `CampusMart_Android_App` folder.
3. Open `app/src/main/java/com/campusmart/app/MainActivity.java`:
   - Set `DEFAULT_SERVER_URL` to your live domain:
     ```java
     public static final String DEFAULT_SERVER_URL = "https://campusmart.online";
     ```
4. In the top menu, go to:
   - **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**
5. Android Studio will compile and output the file at:
   ```text
   CampusMart_Android_App/app/build/outputs/apk/debug/app-debug.apk
   ```
6. Send `app-debug.apk` to your phone via WhatsApp/USB/Bluetooth and tap **Install**!

---

## 🛠️ Key App Features Configured:
- **Audio Auto-Unlock**: Web Audio harmonic chimes & Text-to-Speech voice announcements play automatically.
- **Swipe-to-Refresh**: Pull down from the top to refresh order status and catalog.
- **Offline Fallback Screen**: Shows friendly connection error with a 1-tap "Retry" button.
- **Cleartext HTTP Support**: Enabled in `network_security_config.xml` to allow direct local hotspot testing on `http://` IP addresses without SSL errors.
