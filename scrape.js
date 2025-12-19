
const path = require("path");
const fs = require("fs").promises;
const puppeteer = require("puppeteer");

// timeout increased to 30 sec for slow-loading Khan profiles.
const ENERGY_POINTS_TIMEOUT = 30000;

const LEADERBOARD_FILE = path.join(__dirname, "EP_Leaderboard.json");

async function scrapeEnergyPoints(url) {
  let browser;
  try {
    browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "networkidle2" });

    try {
      await page.waitForSelector(".energy-points-badge", { timeout: ENERGY_POINTS_TIMEOUT });
    } catch {
      console.log(`Energy points badge not found after ${ENERGY_POINTS_TIMEOUT / 1000} seconds.`);
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

// Helper to format points for display (e.g., 1234567 -> "1.2M")
function formatPointsBehind(points) {
    if (points >= 1000000) {
        return (points / 1000000).toFixed(1) + 'M';
    }
    if (points >= 1000) {
        return (points / 1000).toFixed(1) + 'K';
    }
    return points.toString();
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

  let pointsChanged = false;

  for (const entry of leaderboard.entries) {
    console.log(`Scraping ${entry.name}'s profile...`);
    const oldPoints = entry.points;
    const points = await scrapeEnergyPoints(entry.profile_url);
    
    if (points !== null) {
      if (points !== oldPoints) {
        entry.points = points;
        pointsChanged = true;
        console.log(`  Updated points: ${points} (was ${oldPoints})`);
      } else {
        console.log(`  Points unchanged for ${entry.name} (${points}).`);
      }
    } else {
      console.log(`  Could not update points for ${entry.name}.`);
    }
  }

  if (pointsChanged) {
    // Sort entries by points in descending order
    leaderboard.entries.sort((a, b) => (b.points || 0) - (a.points || 0));

    // Update rank and pointsBehind
    leaderboard.entries.forEach((entry, index) => {
      entry.rank = index + 1;
      if (index === 0) {
        entry.pointsBehind = null;
        entry.pointsBehindRaw = "N/A";
      } else {
        const higherRankedEntry = leaderboard.entries[index - 1];
        const pointsBehind = (higherRankedEntry.points || 0) - (entry.points || 0);
        entry.pointsBehind = pointsBehind;
        entry.pointsBehindRaw = formatPointsBehind(pointsBehind);
      }
    });

    leaderboard.generated_at = new Date().toISOString();
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
    console.log("Leaderboard updated and saved successfully!");
  } else {
    console.log("No point changes detected. Skipping file update to preserve original timestamp.");
  }
}

updateLeaderboard();
