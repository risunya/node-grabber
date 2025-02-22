# Node Telegram Grabber v0.0.1  
Бот позволяет пересылать контент из любого Telegram-канала в ваши каналы с указанием источника.  

*Сама программа занимает примерно 150 mb свободного места. Также потребуется рантайм (среда выполнения), который занимает около 100 mb свободного места. Поскольку бот не выполняет ресурсоемких операций, асинхронность и высокая скорость обработки запросов являются ключевыми преимуществами Node.js (например, в сравнении с Python). **Если у вас около 10 каналов с новостями, и бот пересылает каждую новость в 3 канала, пиковая нагрузка не превышает 80 mb оперативной памяти**. Это позволяет использовать бота в рабочее время, а не выделять для него отдельный сервер.*

## Roadmap  
- [ ] Добавить возможность настройки цитирования источника.  
- [ ] Добавить возможность настройки вывода в консоль.  
- [ ] Добавить возможность настройки задержек, чтобы не попадать под лимиты Telegram.  
- [ ] Добавить возможность изменения текущих записей.  

## Используемые библиотеки  

_Все тестировалось на Node v20.18.2_  

Для работы бота необходимо установить библиотеки и среду выполнения Node.js.  

Node.js обычно устанавливается через MSI-файл ([скачать здесь](https://nodejs.org/en/download)), но если вы продвинутый пользователь, можете установить его через консоль, например, с помощью Chocolatey:  

```powershell
# Скачать и установить Chocolatey:
powershell -c "irm https://community.chocolatey.org/install.ps1 | iex"
# Скачать и установить Node.js:
choco install nodejs-lts --version="20"
# Проверить версию Node.js:
node -v # Должно вывести "v20.18.3".
# Проверить версию npm:
npm -v # Должно вывести "10.8.2".
```
После установки среды выполнения и npm необходимо загрузить зависимости. Для этого в корневой папке проекта выполните команду:

```sh
npm install
```
После завершения установки переходите к следующему шагу.

## Как запустить
Создайте Telegram-бота. Для этого напишите боту [BotFather](https://t.me/BotFather) и следуйте инструкциям. После создания сохраните токен бота.

Получите **API_ID** и **API_HASH**. Сделать это можно на сайте [my.telegram.org](https://my.telegram.org/auth) - [инструкция](https://www.youtube.com/watch?v=JBDnmEhvgac).
Создайте файл **.env** в корне проекта и укажите в нем переменные:
```
API_ID="ваш_api_id"
API_HASH="ваш_api_hash"
BOT_TOKEN="ваш_токен_бота"
USER_ID="ваш_user_id"
```
**USER_ID** можно получить через бота [Get My ID](https://t.me/getmyid_bot), отправив ему любое сообщение.

Для **запуска бота** выполните команду:

```
npm run start
```
Или запустите **start.bat** ;)

**При первом запуске необходимо ввести НОМЕР ТЕЛЕФОНА (НЕ ТОКЕН) и код, который придет в Telegram. Если у вас включена двухфакторная аутентификация, бот может запросить пароль. Мы не собираем эти данные — они отправляются напрямую в Core API Telegram для аутентификации.**

## Доступные команды
**/start** — Начало работы с ботом.

**/add** — Начинает диалог для добавления канала в список отслеживаемых.

**/del** — Начинает диалог для удаления канала из списка отслеживаемых.

**/cur** — Выводит текущий список отслеживаемых каналов.
