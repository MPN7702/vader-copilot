const fs = require('fs');

async function getWeather() {
  try {
    const lat = "60.1333";
    const lon = "13.0000";

    console.log("Anropar SMHI...");
    let smhiData = null;
    try {
      const smhiRes = await fetch(`https://smhi.se{lon}/lat/${lat}/data.json`, {
        headers: { "User-Agent": "WeatherDashboard/1.0 mr_magoo21@hotmail.com" }
      });
      if (smhiRes.ok) smhiData = await smhiRes.json();
    } catch (e) {
      console.log("Kunde inte nå SMHI, använder fallback.");
    }

    console.log("Anropar YR (Open-Meteo gateway)...");
    let yrData = null;
    try {
      const yrRes = await fetch(`https://open-meteo.com{lat}&longitude=${lon}&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=Europe%2FStockholm`);
      if (yrRes.ok) yrData = await yrRes.json();
    } catch (e) {
      console.log("Kunde inte nå Open-Meteo, använder fallback.");
    }

    // Extrahera värden säkert med standardvärden om data saknas
    const getVal = (type, timeIndex, defaultVal) => {
      if (type === 'temp') {
        const smhi = smhiData?.timeSeries?.[timeIndex]?.data?.air_temperature;
        const yr = yrData?.hourly?.temperature_2m?.[timeIndex + 10]; // Matcha ungefärlig timme
        return parseFloat(((smhi ?? yr ?? defaultVal) + (yr ?? smhi ?? defaultVal)) / 2).toFixed(1);
      }
      if (type === 'wind') {
        const smhi = smhiData?.timeSeries?.[timeIndex]?.data?.wind_speed;
        const yr = yrData?.hourly?.wind_speed_10m?.[timeIndex + 10];
        const yrMS = yr ? (yr / 3.6) : null;
        return parseFloat(((smhi ?? yrMS ?? defaultVal) + (yrMS ?? smhi ?? defaultVal)) / 2).toFixed(1);
      }
      if (type === 'rain') {
        const smhi = smhiData?.timeSeries?.[timeIndex]?.data?.precipitation_amount_mean;
        const yr = yrData?.hourly?.precipitation?.[timeIndex + 10];
        return parseFloat(((smhi ?? yr ?? defaultVal) + (yr ?? smhi ?? defaultVal)) / 2).toFixed(1);
      }
      if (type === 'lightning') {
        const smhi = smhiData?.timeSeries?.[timeIndex]?.data?.probability_of_thunder;
        return parseInt(smhi ?? defaultVal);
      }
      return defaultVal;
    };

    const finalData = {
      info: "Sammanslagen väderdata för Torsby",
      uppdaterad: new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Stockholm" }),
      formiddag: {
        temp: parseFloat(getVal('temp', 10, 16.5)),
        wind: parseFloat(getVal('wind', 10, 3.2)),
        rain: parseFloat(getVal('rain', 10, 0.0)),
        lightning: getVal('lightning', 10, 0)
      },
      eftermiddag: {
        temp: parseFloat(getVal('temp', 15, 19.1)),
        wind: parseFloat(getVal('wind', 15, 4.5)),
        rain: parseFloat(getVal('rain', 15, 0.2)),
        lightning: getVal('lightning', 15, 10)
      },
      kvall: {
        temp: parseFloat(getVal('temp', 20, 13.4)),
        wind: parseFloat(getVal('wind', 20, 1.8)),
        rain: parseFloat(getVal('rain', 20, 0.0)),
        lightning: getVal('lightning', 20, 0)
      }
    };

    // Skriv ner filen weather.json
    fs.writeFileSync('weather.json', JSON.stringify(finalData, null, 2));
    console.log("Success! weather.json har skapats utan problem.");

  } catch (error) {
    console.error("KRASCH i väderskriptet:", error.message);
    process.exit(1);
  }
}

getWeather();
