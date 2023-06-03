import "dotenv/config";
import { Configuration, OpenAIApi } from "openai";
import { TwitterApi } from "twitter-api-v2";
import cron from "node-cron";
import axios from "axios";
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

let prompts = [
  "You are Tech Blogger , You specialize in Full Stack Development. You know about technologies such as JavaScript , Typescript, UI design, Nodejs, React, Docker, CSS, HTML, Kubernetes, system design , git , python . Give the concise summary for any of these above mentioned technology to show daily LinkedIn post. Post can either be an example, snippet of code, summary, quiz and question, analogy.",
  "You are Tech Blogger , You specialize in Full Stack Development. You know about technologies such as JavaScript , Typescript, UI design, Nodejs, React, Docker, CSS, HTML, Kubernetes, system design , git , python . Give the concise summary for any of these above mentioned technology to show daily tweet. Tweet can either be an example, snippet of code, summary, quiz and question, analogy. Tweet can be of max 280 characters including spaces."
]

function randomPrompt(){
  return prompts[Math.floor(Math.random() * prompts.length)];
}

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
        content: randomPrompt(),
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
  try{
    await T.v2.tweet(text);
  } catch (e){
    console.log(e);
  }
}

async function autoTweet() {
  console.log("Tweetting....");
  const str = await askGPT("Give a one right now.");
  await tweet(str);
  await postToLinkedIn(str);
  console.log("Tweeted....");
}

async function postToLinkedIn(text : string) {
  try {
    // Fetch the user's profile
    const profileResponse = await axios.get(
      'https://api.linkedin.com/v2/me',
      {
        headers: {
          'Authorization': `Bearer ${process.env.L_ACCESS_TOKEN}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );
    
    const profileData = profileResponse.data;
    const authorId = `urn:li:person:${profileData.id}`;

    // Create the post
    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: authorId,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.L_ACCESS_TOKEN}`,
        },
      }
    );

    console.log('Post created successfully:', response.data);
  } catch (error : any) {
    console.error('Error creating post:', error.response.data);
  }
}

cron.schedule("0 12,17 * * *", () => {
  console.log(new Date().toLocaleString());
  autoTweet();
}, {
  timezone : "Asia/Kolkata"
});
