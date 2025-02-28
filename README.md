# Telegram Chat Summarizer

This project retrieves messages from a specific Telegram group/topic and summarizes them using an AI model compatible with the OpenAI API format.

## Features
- Fetches messages from a specific Telegram group/topic.
- Filters messages from the last two days.
- Summarizes the chat using an AI model (e.g., LM Studio with DeepSeek or any OpenAI-compatible API).
- Outputs the summary in Brazilian Portuguese.

## Prerequisites
Before running the project, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (latest LTS version recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A Telegram API ID and Hash (can be obtained from [my.telegram.org](https://my.telegram.org/apps))
- A session string for Telegram
- An AI model running locally or via an API (e.g., LM Studio with DeepSeek, OpenAI API, or any compatible service)

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/andrefmsouza/telegram-chat-summarizer.git
   cd telegram-chat-summarizer
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file in the project root and add the following environment variables:
   ```env
   TELEGRAM_API_ID=
   TELEGRAM_API_HASH=
   TELEGRAM_SESSION=""
   TELEGRAM_PHONE_NUMBER=""
   TELEGRAM_PASSWORD=""   # Se sua conta tiver autenticação de dois fatores
   TELEGRAM_GROUP_ID=
   TELEGRAM_TOPIC_ID=
   AI_API_URL="http://localhost:1234/v1/chat/completions"
   AI_MODEL="deepseek-r1-distill-llama-8b"
   ```
   - Replace `your_api_id`, `your_api_hash`, and `your_session_string` with your actual Telegram credentials.
   - Replace `your_group_id` with the Telegram group ID.
   - If using LM Studio or DeepSeek locally, update `URL_IA` accordingly.
   - If using OpenAI API, set `URL_IA=https://api.openai.com/v1/chat/completions` and add `OPENAI_API_KEY`.

## Running the Project
To start the application, run:
```sh
npm run dev
```

This will:
1. Connect to Telegram and fetch messages from the specified group/topic.
2. Filter messages from the last two days.
3. Send the chat history to the AI model for summarization.
4. Print the summary in the console.

## License
This project is licensed under the [MIT License](LICENSE). Feel free to modify and use it as needed.

---

### Contributions
Feel free to open issues or submit pull requests to improve the project!

🚀 Happy coding!

