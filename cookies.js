const puppeteerExtra = require("puppeteer-extra");
const Stealth = require("puppeteer-extra-plugin-stealth");
const fs = require('fs').promises;
require('dotenv').config()

puppeteerExtra.use(Stealth());

const delay = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

async function getCookies() {
  const browserObj = await puppeteerExtra.launch({headless: false});
  const page = await browserObj.newPage();

  await page.setViewport({ width: 1920, height: 1080 });

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
  );

  await page.goto("https://www.facebook.com/login/");
  await page.waitForNetworkIdle(); // Wait for network resources to fully load
  await page.type("#email", process.env.EMAIL_OR_USERNAME, {
    delay: 100,
  });

  await page.type("#pass", process.env.YOUR_PASSWORD, {
    delay: 100,
  });

  await page.click('#loginbutton')
  await delay(15000)

  //save the cookies
  const cookies = await page.cookies();
  console.log(cookies)
  await fs.writeFile("./cookies.json", JSON.stringify(cookies, null, 2));

  await browserObj.close();
  console.log('Cookies have been saved')
}

getCookies();
