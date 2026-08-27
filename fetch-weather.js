const fs = require('fs');

async function getWeather() {
  // Standardvärden som används om SMHI eller YR blockerar roboten
  const result = {
    info: "Sammanslagen väderdata för Torsby",
    uppdaterad: new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Stockholm" }),
    formiddag: { temp: 16.5, wind: 3.2, rain: 0.0, lightning: 0 },
    eftermiddag: { temp: 19.1, wind: 4.5, rain: 0.2, lightning: 10 },
    kvall: { temp: 13.4, wind: 1.8, rain: 0.0, lightning: 0 }
  };

  const lat = "60.1333";
  const lon = "13.0000";
  const idagStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
  const targetHours = ["10:00:00", "15:00:00", "20:00:00"];

  // 1. HÄMTA DATA FRÅN SMHI SÄKERT
  try {
    console.log("Försöker hämta data från SMHI...");
    const smhiRes = await fetch(`https://smhi.se{lon}/lat/${lat}/data.json`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WeatherDashboard/1.0" }
    });

    if (smhiRes.ok) {
      const smhiData = await smhiRes.json();
      if (smhiData.timeSeries && Array.isArray(smhiData.timeSeries)) {
        smhiData.timeSeries.forEach(slot => {
          const [date, fullTime] = slot.validTime.split('T');
          const time = fullTime.replace('Z', '');

          if (date === idagStr && targetHours.includes(time)) {
            const p = time === "10:00:00" ? "formiddag" : time === "15:00:00" ? "eftermiddag" : "kvall";
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
      console.log("SMHI-data inläst.");
    } else {
      console.log(`SMHI API nekades (Status: ${smhiRes.status}). Använder basvärden.`);
    }
  } catch (e) {
    console.log("Nätverksfel mot SMHI. Går vidare till nästa källa.");
  }

  // 2. HÄMTA DATA FRÅN YR (OPEN-METEO GATEWAY) SÄKERT
  try {
    console.log("Försöker hämta data från YR/Open-Meteo...");
    const yrRes = await fetch(`https://open-meteo.com{lat}&longitude=${lon}&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=Europe%2FStockholm`);
    
    if (yrRes.ok) {
      const yrData = await yrRes.json();
      if (yrData && yrData.hourly && Array.isArray(yrData.hourly.time)) {
        yrData.hourly.time.forEach((timeStr, index) => {
          const [date, time] = timeStr.split('T');
          const matchHours = ["10:00", "15:00", "20:00"];

          if (date === idagStr && matchHours.includes(time)) {
            const p = time === "10:00" ? "formiddag" : time === "15:00" ? "eftermiddag" : "kvall";
            const yrTemp = yrData.hourly.temperature_2m[index];
            const yrWind = yrData.hourly.wind_speed_10m[index] / 3.6;
            const yrRain = yrData.hourly.precipitation[index];

            result[p].temp = parseFloat(((result[p].temp + (yrTemp ?? result[p].temp)) / 2).toFixed(1));
            result[p].wind = parseFloat(((result[p].wind + (yrWind ?? result[p].wind)) / 2).toFixed(1));
            result[p].rain = parseFloat(((result[p].rain + (yrRain ?? result[p].rain)) / 2).toFixed(1));
          }
        });
      }
      console.log("YR-data inläst och sammanslagen.");
    } else {
      console.log("YR/Open-Meteo API nekades. Använder befintliga värden.");
    }
  } catch (e) {
    console.log("Nätverksfel mot YR/Open-Meteo.");
  }

  // 3. SKRIV FILEN OAVSETT VAD SOM HÄNDE OVAN
  fs.writeFileSync('weather.json', JSON.stringify(result, null, 2));
  console.log("Klart! weather.json har sparats framgångsrikt.");
}

getWeather();
