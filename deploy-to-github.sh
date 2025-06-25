#!/bin/bash

echo "🚀 Скрипт автоматической загрузки SDK на GitHub"
echo "============================================"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Проверяем что мы в правильной папке
if [ ! -f "README.md" ] || [ ! -d "web" ]; then
    echo -e "${RED}❌ Ошибка: Запусти скрипт из папки /sdk${NC}"
    exit 1
fi

# Запрашиваем данные пользователя
echo -e "${BLUE}📝 Введи свой GitHub username:${NC}"
read -p "Username: " GITHUB_USERNAME

echo -e "${BLUE}📝 Введи название репозитория (по умолчанию: events-sdk):${NC}"
read -p "Repository name [events-sdk]: " REPO_NAME
REPO_NAME=${REPO_NAME:-events-sdk}

echo -e "${BLUE}📝 Введи свой email для Git:${NC}"
read -p "Email: " GIT_EMAIL

echo -e "${BLUE}📝 Введи свое имя для Git:${NC}"
read -p "Name: " GIT_NAME

# Настраиваем Git
echo -e "${BLUE}🔧 Настраиваю Git...${NC}"
git config user.email "$GIT_EMAIL"
git config user.name "$GIT_NAME"

# Проверяем статус git
if [ ! -d ".git" ]; then
    echo -e "${BLUE}📦 Инициализирую Git репозиторий...${NC}"
    git init
fi

# Добавляем все файлы
echo -e "${BLUE}📂 Добавляю файлы...${NC}"
git add .

# Проверяем есть ли изменения
if git diff --staged --quiet; then
    echo -e "${RED}⚠️  Нет изменений для коммита${NC}"
else
    # Создаем коммит
    echo -e "${BLUE}💾 Создаю коммит...${NC}"
    git commit -m "🚀 Multi-platform Analytics SDK

✅ Web/React SDK with pixel integration
✅ React Native SDK with device tracking  
✅ Flutter SDK with navigation observer
✅ iOS Swift SDK with async/await
✅ Android Kotlin SDK with coroutines
✅ Complete documentation and examples

Ready for production use! 🎉"
fi

# Проверяем есть ли уже remote
if git remote get-url origin >/dev/null 2>&1; then
    echo -e "${BLUE}🔗 Remote origin уже существует${NC}"
else
    # Добавляем remote
    echo -e "${BLUE}🔗 Добавляю remote origin...${NC}"
    git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
fi

# Создаем main ветку
echo -e "${BLUE}🌿 Переключаюсь на main ветку...${NC}"
git branch -M main

echo ""
echo -e "${GREEN}✅ Готово! Теперь выполни последнюю команду:${NC}"
echo -e "${BLUE}git push -u origin main${NC}"
echo ""
echo -e "${GREEN}📋 После загрузки SDK будет доступен по адресам:${NC}"
echo "🌐 Web: npm install github:$GITHUB_USERNAME/$REPO_NAME#main"
echo "📱 React Native: npm install github:$GITHUB_USERNAME/$REPO_NAME#main"
echo "🐦 Flutter: git: https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo "🍎 iOS: https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo "🤖 Android: https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo ""
echo -e "${GREEN}📖 Репозиторий: https://github.com/$GITHUB_USERNAME/$REPO_NAME${NC}"
echo ""
echo -e "${BLUE}🎉 Все готово! Твой SDK скоро будет доступен всему миру!${NC}"