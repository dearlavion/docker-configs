const redis = require('redis');
const axios = require('axios');

const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'Password1234';
const NGROK_URL = process.env.NGROK || 'http://localhost:5678';
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const QUEUE_NAME = 'expense-queue'; // This is your Redis list key

const client = redis.createClient({
  url: `redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`
});

async function startQueueProcessor() {
  try {
    await client.connect();
    console.log('✅ Connected to Redis');
    console.log(`⏳Connecting to ngrok: ${NGROK_URL}...`);
    console.log(`⏳Connecting to REDIS_HOST: ${REDIS_HOST}...`);
    console.log(`⏳Connecting to REDIS_PORT: ${REDIS_PORT}...`);

    while (true) {
      console.log(`⏳ Waiting for messages on queue: ${QUEUE_NAME}...`);
      // Block until there's a message in the queue
      const data = await client.blPop(QUEUE_NAME, 0); // 0 = block indefinitely

      if (!data || !data.element) {
        console.log('⚠️ Received empty message. Skipping.');
        continue;
      }

      const message = data.element;

      console.log(`📥 Message received from queue: ${message}`);

      try {
        const response = await axios.post(`${NGROK_URL}/webhook/redis-event`, {
          message,
          channel: QUEUE_NAME,
        });
        if (response.status === 200) {
            console.log('✅ Webhook processed successfully');
            // Proceed to next message
        } else {
            console.error(`❌ Webhook returned unexpected status: ${response.status}`);
            // Requeue message for retry
            await client.rPush(QUEUE_NAME, message);
        }
      } catch (err) {
        console.error('❌ Failed to process message. Requeuing...', err.message);

        // Requeue the message for retry
        await client.rPush(QUEUE_NAME, message);

        // Optional delay to avoid hammering webhook repeatedly
        await new Promise(res => setTimeout(res, 2000));
      }
    }

  } catch (err) {
    console.error('❌ Redis connection failed:', err.message);
    process.exit(1);
  }
}

startQueueProcessor();