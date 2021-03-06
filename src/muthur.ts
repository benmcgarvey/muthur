import { App } from '@slack/bolt';
import 'dotenv/config.js';

import commands from 'commands';
import { register } from 'utils';
import { userResolver } from 'middleware';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.use(userResolver);

commands.forEach(register(app));

(async () => {
  await app.start(3000);
  console.log(`muthur is listening on port ${3000}`);
})();
