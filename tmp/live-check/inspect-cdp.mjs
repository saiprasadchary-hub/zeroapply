import {chromium} from 'playwright-core';
import fs from 'node:fs';
const port=fs.readFileSync('/Users/sriman/Library/Application Support/ZeroApply_Development_Sessions/DevToolsActivePort','utf8').split('\n')[0];
const browser=await chromium.connectOverCDP('http://127.0.0.1:'+port);
console.log(JSON.stringify(browser.contexts().flatMap(c=>c.pages().map(p=>p.url()))));
await browser.close();
