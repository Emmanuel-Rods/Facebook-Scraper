const puppeteerExtra = require("puppeteer-extra");
const Stealth = require("puppeteer-extra-plugin-stealth");
puppeteerExtra.use(Stealth());
const fs = require("fs").promises;
const XLSX = require('xlsx'); 

const query = "cleaning";
const cityName = "new york";

async function run() {
  const browser = await puppeteerExtra.launch({ headless: false });
  const page = await browser.newPage();

  await page.setViewport({ width: 1920, height: 1080 });

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
  );

  //load cookies
  const cookiesString = await fs.readFile("./cookies.json");
  const cookies = JSON.parse(cookiesString);
  await page.setCookie(...cookies);

  // Intercept and monitor network responses
  await page.setRequestInterception(true);

  page.on("request", (request) => {
    request.continue();
  });

  await page.goto(`https://www.facebook.com/search/pages?q=${query}`);

  //set location
  await page.waitForSelector('input[placeholder="Location"]');
  const locationInput = await page.$('input[placeholder="Location"]');
  await locationInput.type(cityName, { delay: 100 }); // Example text input

  //clicking the first suggestion
  await page.waitForSelector('ul[role="listbox"]');
  await page.click('ul[role="listbox"] li:first-of-type');

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Scroll dynamically to load all content
  const scrollPageToBottom = async () => {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for content to load
  };

  let previousHeight = 0;
  while (true) {
    await scrollPageToBottom();
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === previousHeight) break;
    previousHeight = newHeight;
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const anchorLinks = await page.$$eval('div[role="feed"] a[role="presentation"][href]', (links) => {
    return links.map(link => link.href);
  });

   const extractedData = [];

   for (let link of anchorLinks) {
     try {
       
       const newPage = await browser.newPage();
       await newPage.goto(link, { waitUntil: 'domcontentloaded' }); // Wait until page is loaded
 
      
       const data = await newPage.evaluate(() => {
         // Extract the name (adjust the selector as needed)
         const nameElement = document.querySelector('h1'); // Replace with the actual selector for the name
         const name = nameElement ? nameElement.textContent.trim() : null;
 
         const phoneIcon = document.querySelector('img[src="https://static.xx.fbcdn.net/rsrc.php/v3/yT/r/Dc7-7AgwkwS.png"]');
         let phoneNumber = null;
         if (phoneIcon) {
           const parentDiv = phoneIcon.closest('div');
           const nextDiv = parentDiv ? parentDiv.nextElementSibling : null;
           if (nextDiv) {
             const phoneNumberElement = nextDiv.querySelector('span');
             if (phoneNumberElement) {
               phoneNumber = phoneNumberElement.textContent.trim();
             }
           }
         }
 
         const emailIcon = document.querySelector('img[src="https://static.xx.fbcdn.net/rsrc.php/v3/yE/r/2PIcyqpptfD.png"]');
         let email = null;
         if (emailIcon) {
           const parentDiv = emailIcon.closest('div');
           const nextDiv = parentDiv ? parentDiv.nextElementSibling : null;
           if (nextDiv) {
             const emailElement = nextDiv.querySelector('span');
             if (emailElement) {
               email = emailElement.textContent.trim();
             }
           }
         }
 
         const websiteIcon = document.querySelector('img[src="https://static.xx.fbcdn.net/rsrc.php/v3/y3/r/BQdeC67wT9z.png"]');
         let website = null;
         if (websiteIcon) {
           const parentDiv = websiteIcon.closest('div');
           const nextDiv = parentDiv ? parentDiv.nextElementSibling : null;
           if (nextDiv) {
             const websiteElement = nextDiv.querySelector('span');
             if (websiteElement) {
               website = websiteElement.textContent.trim();
             }
           }
         }
 
         return {
           name,
           phoneNumber,
           email,
           website
         };
       });
 
    
       extractedData.push(data);
 
       console.log("Extracted data for", link, data);
 
       await newPage.close();
     } catch (error) {
       console.error(`Error extracting data from ${link}:`, error);
     }
   }
  await page.screenshot({ path: "screenshot.png" });
  saveToExcel(extractedData, `${query}-${cityName}.xlsx`)
  await browser.close();
}


function saveToExcel(data, fileName) {
    const wb = XLSX.utils.book_new(); // Create a new workbook
    const ws = XLSX.utils.json_to_sheet(data); // Convert JSON data to a sheet
    XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data'); // Add the sheet to the workbook
    XLSX.writeFile(wb, fileName); // Write the workbook to the file
    console.log(`Data saved to ${fileName}`);
  }
  
run();
