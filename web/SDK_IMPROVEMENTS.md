# SDK Improvements - Universal Event Tracking

## Что было исправлено:

### 1. **Устранено дублирование событий**
- SDK больше не обрабатывает события дважды
- Добавлена проверка: если событие уже обработано через `[Web Analytics]`, оно не обрабатывается повторно

### 2. **Универсальная поддержка форматов полей**
SDK теперь понимает разные форматы именования полей:

```javascript
// Поддерживаемые форматы для статуса подписки:
- isActive
- isPremium  
- is_premium

// Поддерживаемые форматы для типа подписки:
- subscriptionType
- subscription_type

// Поддерживаемые форматы для даты истечения:
- expiryDate
- expiry_date
```

### 3. **Автоматическое определение событий покупки**
SDK автоматически перехватывает логи с ключевыми словами:
- "purchase"
- "payment"
- "subscription activated"
- "subscription purchased"

И извлекает данные из разных форматов:
```javascript
// Сумма покупки:
- amount
- price
- value

// ID продукта:
- productId
- product_id
- sku
- subscription_type

// ID транзакции:
- transactionId
- transaction_id
- orderId
- order_id
```

## Как использовать:

### Для разработчиков приложений:

Теперь можно использовать любой удобный формат логов:

```javascript
// Вариант 1 - camelCase
console.log("SUBSCRIPTION CHECK COMPLETED", {
  isPremium: true,
  subscriptionType: "monthly"
});

// Вариант 2 - snake_case
console.log("[Web Analytics] SUBSCRIPTION CHECK:", {
  is_premium: true,
  subscription_type: "monthly"
});

// Вариант 3 - для покупок (автоматически определится)
console.log("Purchase completed", {
  amount: 16.99,
  productId: "sub_monthly"
});
```

SDK автоматически распознает и правильно обработает любой формат!

## Результат:

- ✅ Нет дублирования событий
- ✅ Поддержка любых форматов полей
- ✅ Автоматическое определение покупок
- ✅ Работает "из коробки" без изменений в приложении