const fs = require('fs');

async function getWeather() {
  try {
    // Koordinater för Torsby
    const lat = "60.1333";
    const lon = "13.0000";

    console.log("Hämtar data från SMHI och YR...");

    // 1. ANROP TILL SMHI (Använder det nya, stabila snow1g API:et) [2026-08-27]
    const smhiRes = await fetch(`https://smhi.se{lon}/lat/${lat}/data.json`, {
      headers: { "User-Agent": "Mozilla/5.0 WeatherDashboard mr_magoo21@hotmail.com" }
    });

    // 2. ANROP TILL YR (Fungerar perfekt från GitHubs IP-adresser!)
    const yrRes = await fetch(`https://met.no{lat}&lon=${lon}`, {
      headers: { "User-Agent": "TorsbyWeatherCopilot mr_magoo21@hotmail.com" }
    });

    if (!smhiRes.ok || !yrRes.ok) {
      throw new Error(`API-fel. SMHI: ${smhiRes.status}, YR: ${yrRes.status}`);
    }

    const smhiData = await smhiRes.json();
    const yrData = await yrRes.json();

    // Måltider (10:00, 15:00, 20:00 svensk tid)
    const targetHoursSMHI = ["10:00:00", "15:00:00", "20:00:00"];
    const targetHoursYR = ["08:00:00Z", "13:00:00Z", "18:00:00Z"]; // YR kör UTC

    const result = {
      uppdaterad: new Date().toISOString(),
      formiddag: { temp: [], wind: [], rain: [], lightning: [] },
      eftermiddag: { temp: [], wind: [], rain: [], lightning: [] },
      kvall: { temp: [], wind: [], rain: [], lightning: [] }
    };

    // Eftersom klockan är sent på kvällen hämtar vi morgondagens datum (2026-08-28)
    const imorgonStr = new Date(Date.now() + 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });

    // PARSA SMHI
    smhiData.timeSeries.forEach(entry => {
      const [date, fullTime] = entry.validTime.split('T');
      const time = fullTime.replace('Z', '');
      if (date === imorgonStr && targetHoursSMHI.includes(time)) {
        const p = time === "10:00:00" ? "formiddag" : time === "15:00:00" ? "eftermiddag" : "kvall";
        result[p].temp.push(entry.data.air_temperature ?? 0);
        result[p].wind.push(entry.data.wind_speed ?? 0);
        result[p].rain.push(entry.data.precipitation_amount_mean ?? 0);
        result[p].lightning.push(entry.data.probability_of_thunder ?? 0);
      }
    });

    // PARSA YR
    yrData.properties.timeseries.forEach(slot => {
      const [date, fullTime] = slot.time.split('T');
      if (date === imorgonStr && targetHoursYR.includes(fullTime)) {
        const p = fullTime === "08:00:00Z" ? "formiddag" : fullTime === "13:00:00Z" ? "eftermiddag" : "kvall";
        result[p].temp.push(slot.data.instant.details.air_temperature ?? 0);
        result[p].wind.push(slot.data.instant.details.wind_speed ?? 0);
        result[p].rain.push(slot.data.next_1_hours?.details?.precipitation_amount ?? 0);
        result[p].lightning.push(slot.data.instant.details.probability_of_thunder ?? 0);
      }
    });

    // SAMMANSTÄLL MEDELVÄRDEN TILL DIN DASHBOARD
    const finalData = { info: `Prognos för Torsby (${imorgonStr})` };
    ["formiddag", "eftermiddag", "kvall"].forEach(p => {
      const count = result[p].temp.length;
      if (count === 0) return;
      finalData[p] = {
        temp: parseFloat((result[p].temp.reduce((a,b)=>a+b,0) / count).toFixed(1)),
        wind: parseFloat((result[p].wind.reduce((a,b)=>a+b,0) / count).toFixed(1)),
        rain: parseFloat((result[p].rain.reduce((a,b)=>a+b,0) / count).toFixed(1)),
        lightning: parseFloat((result[p].lightning.reduce((a,b)=>a+b,0) / count).toFixed(0))
      };
    });

    // Skapar filen weather.json
    fs.writeFileSync('weather.json', JSON.stringify(finalData, null, 2));
    console.log("weather.json har skapats!");

  } catch (error) {
    console.error("Fel i skriptet:", error.message);
    process.exit(1);
  }
}

getWeather();

