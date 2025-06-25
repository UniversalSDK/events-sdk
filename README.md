# 🚀 Analytics Tracking SDK

Универсальный SDK для отслеживания конверсий и аналитики на всех платформах.

## 📦 Доступные SDK

| Платформа | Папка | Установка | Статус |
|-----------|-------|-----------|---------|
| **Web/React** | `/web` | `npm install github:UniversalSDK/events-sdk#main` | ✅ Готов |
| **React Native** | `/react-native` | `npm install github:UniversalSDK/events-sdk#main-react-native` | ✅ Готов |
| **Flutter** | `/flutter` | См. инструкцию в папке | ✅ Готов |
| **iOS (Swift)** | `/ios-swift` | Swift Package Manager | ✅ Готов |
| **Android (Kotlin)** | `/android-kotlin` | Gradle | ✅ Готов |

## 🎯 Возможности

- ✅ Автоматическое отслеживание событий
- ✅ Поддержка Facebook Pixel, TikTok Pixel, Google Ads
- ✅ Offline режим с очередью событий
- ✅ Кроссплатформенная аналитика
- ✅ GDPR совместимость

## 🚀 Быстрый старт

### Web/React
```bash
npm install github:UniversalSDK/events-sdk#main
```

```javascript
import { AffiliateSDK } from 'github:UniversalSDK/events-sdk#main';

const tracker = new AffiliateSDK({
  affiliateCode: 'YOUR_AFFILIATE_CODE',
  appCode: 'YOUR_APP_CODE'
});

await tracker.initialize();
```

### React Native
```bash
npm install github:UniversalSDK/events-sdk#main -- --save-prefix="~" -- react-native
```

### Flutter
```yaml
dependencies:
  affiliate_sdk:
    git:
      url: https://github.com/UniversalSDK/events-sdk.git
      path: flutter
```

## 📖 Документация

Подробная документация находится в папке каждого SDK:
- [Web/React SDK](/web/README.md)
- [React Native SDK](/react-native/README.md)
- [Flutter SDK](/flutter/README.md)
- [iOS SDK](/ios-swift/README.md)
- [Android SDK](/android-kotlin/README.md)

## 🛠 Разработка

### Структура репозитория
```
analytics-sdk/
├── web/                 # Web/React SDK
├── react-native/        # React Native SDK
├── flutter/            # Flutter SDK
├── ios-swift/          # iOS нативный SDK
├── android-kotlin/     # Android нативный SDK
└── README.md           # Этот файл
```

### Требования
- Node.js 14+
- npm или yarn
- Для мобильных SDK: соответствующие среды разработки

## 📄 Лицензия

MIT License - используйте свободно в коммерческих проектах.

## 🤝 Поддержка

- Email: support@your-company.com
- Issues: https://github.com/your-company/analytics-sdk/issues

---

Made with ❤️ by Your Company