import "dotenv/config";
import { Configuration, OpenAIApi } from "openai";
import { TwitterApi } from "twitter-api-v2";
import cron from "node-cron";
// get the open ai function get the text based on the prompt
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const T = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY ?? "",
  appSecret: process.env.TWITTER_KEY_SECERT ?? "",
  accessToken: process.env.T_ACCESS_TOKEN ?? "",
  accessSecret: process.env.T_ACCESS_TOKEN_SECERT ?? "",
});

let msgs: {
  role: "assistant" | "user" | "system";
  content: string;
}[] = [];

async function askGPT(prompt: string) {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are Tech Blogger , You specialize in Full Stack Development. You should give tip of the day for the technologies such as Javascript , Typescript, UI design, Nodejs, React, Docker, CSS, HTML, Kubernetes, system design , git , python . Give the concise summary for any of these above mentioned technology to show daily tweet. Make sure to keep the tweet short upto 280 characters.",
      },
      ...msgs,
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = completion.data.choices.map((c) => c.message?.content).join("\n");
  console.log(text);
  msgs.push({
    role: completion.data.choices[0].message?.role ?? "assistant",
    content: text,
  });
  return text;
}

async function tweet(text: string) {
  await T.v2.tweet(text);
}

async function autoTweet() {
  console.log("Tweetting....");
  const str = await askGPT("Give a one right now.");
  await tweet(str);
  console.log("Tweeted....");
}

cron.schedule("0 12,17 * * *", () => {
  console.log(new Date().toLocaleString());
  autoTweet();
});
