# Native wrap (after PWA is proven)

Do not rewrite the Engine in React Native. When gym-floor PWA tests pass, wrap the same Next.js app with Capacitor for App Store / Play.

- Config: `capacitor.config.json` (appId `com.vitalitysweat.engine`)
- Reuse `creator_tasks` + member rest-timer alerts, then swap Web Push for APNs/FCM
- Optional later: Apple Health / Health Connect for steps and body weight
- Gym rest timer and Hunter Daily Brief should keep working from the same screens
