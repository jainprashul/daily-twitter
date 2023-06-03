import "dotenv/config"
import { Configuration, OpenAIApi } from "openai";
import { TwitterApi } from "twitter-api-v2";
import cron from 'node-cron'
// get the open ai function get the text based on the prompt
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const T = new TwitterApi({
  appKey : process.env.TWITTER_API_KEY ?? '',
  appSecret : process.env.TWITTER_KEY_SECERT ?? '',
  accessToken : process.env.T_ACCESS_TOKEN ?? '',
  accessSecret : process.env.T_ACCESS_TOKEN_SECERT ?? ''
})

async function askGPT(prompt: string) {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages : [{
      role : "system",
      content : 'You are Tech Blogger , You specialize in Full Stack Development. You should give tip of the day for the technologies such as Javascript , Typescript, UI design. Give the concise summary in max 250 words of the any of these above mentioned technology to show daily tweet. Give a one right now. '
    }, ]
  });

  const text = completion.data.choices.map(c => c.message?.content).join("\n")
  console.log(text)

  const tweet = await T.v2.tweet(text)
  console.log(tweet)

  return text
};


// every 12 hours run the function

cron.schedule('*/10 * * * *', () => {
  console.log(new Date().toLocaleString())
  console.log("Tweetting....")
  askGPT("Give a one right now.")
})