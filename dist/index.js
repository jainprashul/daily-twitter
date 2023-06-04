"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const openai_1 = require("openai");
const twitter_api_v2_1 = require("twitter-api-v2");
const node_cron_1 = __importDefault(require("node-cron"));
const axios_1 = __importDefault(require("axios"));
// get the open ai function get the text based on the prompt
const configuration = new openai_1.Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new openai_1.OpenAIApi(configuration);
const T = new twitter_api_v2_1.TwitterApi({
    appKey: process.env.TWITTER_API_KEY ?? "",
    appSecret: process.env.TWITTER_KEY_SECERT ?? "",
    accessToken: process.env.T_ACCESS_TOKEN ?? "",
    accessSecret: process.env.T_ACCESS_TOKEN_SECERT ?? "",
});
let prompts = [
    "You are Tech Blogger , You specialize in Full Stack Development. You know about technologies such as JavaScript , Typescript, UI design, Nodejs, React, Docker, CSS, HTML, Kubernetes, system design , git , python . Give the concise summary for any of these above mentioned technology to show daily LinkedIn post. Post can either be an example, snippet of code, summary, quiz and question, analogy.",
    "You are Tech Blogger , You specialize in Full Stack Development. You know about technologies such as JavaScript , Typescript, UI design, Nodejs, React, Docker, CSS, HTML, Kubernetes, system design , git , python . Give the concise summary for any of these above mentioned technology to show daily tweet. Tweet can either be an example, snippet of code, summary, quiz and question, analogy. Tweet can be of max 280 characters including spaces."
];
function randomPrompt() {
    return prompts[Math.floor(Math.random() * prompts.length)];
}
let msgs = [];
async function askGPT(prompt) {
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
async function tweet(text) {
    try {
        await T.v2.tweet(text);
    }
    catch (e) {
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
async function postToLinkedIn(text) {
    try {
        // Fetch the user's profile
        const profileResponse = await axios_1.default.get('https://api.linkedin.com/v2/me', {
            headers: {
                'Authorization': `Bearer ${process.env.L_ACCESS_TOKEN}`,
                'cache-control': 'no-cache',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });
        const profileData = profileResponse.data;
        const authorId = `urn:li:person:${profileData.id}`;
        // Create the post
        const response = await axios_1.default.post('https://api.linkedin.com/v2/ugcPosts', {
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
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.L_ACCESS_TOKEN}`,
            },
        });
        console.log('Post created successfully:', response.data);
    }
    catch (error) {
        console.error('Error creating post:', error.response.data);
    }
}
node_cron_1.default.schedule("0 12,17 * * *", () => {
    console.log(new Date().toLocaleString());
    autoTweet();
}, {
    timezone: "Asia/Kolkata"
});
