const path = require("path");
const fs = require("fs").promises;
const puppeteer = require("puppeteer");

const LEADERBOARD_FILE = path.join(__dirname, "EP_Leaderboard.json");

async function scrapeEnergyPoints(url) {
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "networkidle2" });

    try {
      await page.waitForSelector(".energy-points-badge", { timeout: 10000 });
    } catch {
      console.log("Energy points badge not found after 10 seconds.");
      await page.screenshot({ path: path.join(__dirname, "debug.png") });
      console.log("Screenshot saved to debug.png");
      return null;
    }

    const pointsText = await page.evaluate(() => {
      const element = document.querySelector(".energy-points-badge");
      return element ? element.textContent : null;
    });

    return pointsText ? parseInt(pointsText.replace(/,/g, ""), 10) : null;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

async function updateLeaderboard() {
  let leaderboard;
  try {
    const fileContent = await fs.readFile(LEADERBOARD_FILE, "utf8");
    leaderboard = JSON.parse(fileContent);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("No existing leaderboard file, starting fresh.");
      leaderboard = { entries: [], generated_at: new Date().toISOString() };
    } else {
      throw err;
    }
  }

  for (const entry of leaderboard.entries) {
    console.log(`Scraping ${entry.name}'s profile...`);
    const points = await scrapeEnergyPoints(entry.profile_url);
    if (points !== null) {
      entry.points = points;
      console.log(`  Updated points: ${points}`);
    } else {
      console.log(`  Could not update points for ${entry.name}.`);
    }
  }

  leaderboard.generated_at = new Date().toISOString();
  await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
  console.log("Leaderboard updated successfully!");
}

updateLeaderboard();
