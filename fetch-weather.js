const fs = require('fs');

async function getWeather() {
  try {
    const lat = "60.1333";
    const lon = "13.0000";

    console.log("Hämtar data från SMHI...");
    const smhiRes = await fetch(`https://smhi.se{lon}/lat/${lat}/data.json`, {
      headers: { "User-Agent": "WeatherDashboard/1.0 mr_magoo21@hotmail.com" }
    });

    if (!smhiRes.ok) throw new Error(`SMHI svarade med felkod: ${smhiRes.status}`);
    const smhiData = await smhiRes.json();

    console.log("Hämtar data från YR-modellen via Open-Meteo...");
    const yrRes = await fetch(`https://open-meteo.com{lat}&longitude=${lon}&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=Europe%2FStockholm`);
    
    let yrData = null;
    if (yrRes.ok) {
      yrData = await yrRes.json();
    }

    // Skapa dagens datum i svenskt format (YYYY-MM-DD)
    const idagStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
    const targetHours = ["10:00:00", "15:00:00", "20:00:00"];

    // Standardvärden om data inte skulle matcha
    const result = {
      info: "Sammanslagen väderdata för Torsby",
      uppdaterad: new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Stockholm" }),
      formiddag: { temp: 15.0, wind: 3.0, rain: 0.0, lightning: 0 },
      eftermiddag: { temp: 18.0, wind: 4.0, rain: 0.0, lightning: 0 },
      kvall: { temp: 13.0, wind: 2.0, rain: 0.0, lightning: 0 }
    };

    // 1. PARSA SMHI (Sök i tidsserien efter matchande datum och timme)
    if (smhiData.timeSeries && Array.isArray(smhiData.timeSeries)) {
      smhiData.timeSeries.forEach(slot => {
        const [date, fullTime] = slot.validTime.split('T');
        const time = fullTime.replace('Z', '');

        if (date === idagStr && targetHours.includes(time)) {
          const p = time === "10:00:00" ? "formiddag" : time === "15:00:00" ? "eftermiddag" : "kvall";
          
          // Extrahera parametrar från SMHI:s array-struktur
          const tempParam = slot.parameters?.find(param => param.name === "t")?.values?.[0];
          const windParam = slot.parameters?.find(param => param.name === "ws")?.values?.[0];
          const rainParam = slot.parameters?.find(param => param.name === "pmean")?.values?.[0];
          const lightParam = slot.parameters?.find(param => param.name === "tstm")?.values?.[0];

          if (tempParam !== undefined) result[p].temp = tempParam;
          if (windParam !== undefined) result[p].wind = windParam;
          if (rainParam !== undefined) result[p].rain = rainParam;
          if (lightParam !== undefined) result[p].lightning = lightParam;
        }
      });
    }

    // 2. PARSA YR/OPEN-METEO OCH RÄKNA UT MEDELVÄRDET
    if (yrData && yrData.hourly && Array.isArray(yrData.hourly.time)) {
      yrData.hourly.time.forEach((timeStr, index) => {
        const [date, time] = timeStr.split('T');
        const matchHours = ["10:00", "15:00", "20:00"];

        if (date === idagStr && matchHours.includes(time)) {
          const p = time === "10:00" ? "formiddag" : time === "15:00" ? "eftermiddag" : "kvall";
          
          const yrTemp = yrData.hourly.temperature_2m[index];
          const yrWind = yrData.hourly.wind_speed_10m[index] / 3.6; // km/h till m/s
          const yrRain = yrData.hourly.precipitation[index];

          // Slå ihop värdena till ett exakt medelvärde mellan båda källorna
          result[p].temp = parseFloat(((result[p].temp + (yrTemp ?? result[p].temp)) / 2).toFixed(1));
          result[p].wind = parseFloat(((result[p].wind + (yrWind ?? result[p].wind)) / 2).toFixed(1));
          result[p].rain = parseFloat(((result[p].rain + (yrRain ?? result[p].rain)) / 2).toFixed(1));
        }
      });
    }

    // Spara filen till ditt arkiv
    fs.writeFileSync('weather.json', JSON.stringify(result, null, 2));
    console.log("Success! weather.json har skapats utan problem.");

  } catch (error) {
    console.error("Fel i väderskriptet:", error.message);
    process.exit(1);
  }
}

getWeather();
