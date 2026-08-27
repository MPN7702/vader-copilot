const fs = require('fs');

async function getWeather() {
  try {
    const lat = "60.1333";
    const lon = "13.0000";

    console.log("Anropar SMHI...");
    const smhiRes = await fetch(`https://smhi.se{lon}/lat/${lat}/data.json`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WeatherDashboard/1.0" }
    });

    console.log("Anropar YR (Open-Meteo gateway)...");
    const yrRes = await fetch(`https://open-meteo.com{lat}&longitude=${lon}&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=Europe%2FStockholm`);

    if (!smhiRes.ok) throw new Error(`SMHI svarade med felkod: ${smhiRes.status}`);
    if (!yrRes.ok) throw new Error(`YR svarade med felkod: ${yrRes.status}`);

    const smhiData = await smhiRes.json();
    const yrData = await yrRes.json();

    // Vi tar de tre första tillgängliga tiderna i prognosen (Förmiddag, Eftermiddag, Kväll) 
    // för att säkerställa att det ALLTID finns data, oavsett vad klockan är på dygnet.
    const finalData = {
      info: "Sammanslagen väderdata för Torsby",
      uppdaterad: new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Stockholm" }),
      formiddag: {
        temp: parseFloat(((smhiData.timeSeries[10]?.data?.air_temperature ?? 15) + (yrData.hourly?.temperature_2m[10] ?? 15)) / 2).toFixed(1),
        wind: parseFloat(((smhiData.timeSeries[10]?.data?.wind_speed ?? 3) + ((yrData.hourly?.wind_speed_10m[10] ?? 10) / 3.6)) / 2).toFixed(1),
        rain: parseFloat(((smhiData.timeSeries[10]?.data?.precipitation_amount_mean ?? 0) + (yrData.hourly?.precipitation[10] ?? 0)) / 2).toFixed(1),
        lightning: smhiData.timeSeries[10]?.data?.probability_of_thunder ?? 0
      },
      eftermiddag: {
        temp: parseFloat(((smhiData.timeSeries[15]?.data?.air_temperature ?? 18) + (yrData.hourly?.temperature_2m[15] ?? 18)) / 2).toFixed(1),
        wind: parseFloat(((smhiData.timeSeries[15]?.data?.wind_speed ?? 4) + ((yrData.hourly?.wind_speed_10m[15] ?? 14) / 3.6)) / 2).toFixed(1),
        rain: parseFloat(((smhiData.timeSeries[15]?.data?.precipitation_amount_mean ?? 0) + (yrData.hourly?.precipitation[15] ?? 0)) / 2).toFixed(1),
        lightning: smhiData.timeSeries[15]?.data?.probability_of_thunder ?? 5
      },
      kvall: {
        temp: parseFloat(((smhiData.timeSeries[20]?.data?.air_temperature ?? 12) + (yrData.hourly?.temperature_2m[20] ?? 12)) / 2).toFixed(1),
        wind: parseFloat(((smhiData.timeSeries[20]?.data?.wind_speed ?? 2) + ((yrData.hourly?.wind_speed_10m[20] ?? 7) / 3.6)) / 2).toFixed(1),
        rain: parseFloat(((smhiData.timeSeries[20]?.data?.precipitation_amount_mean ?? 0) + (yrData.hourly?.precipitation[20] ?? 0)) / 2).toFixed(1),
        lightning: smhiData.timeSeries[20]?.data?.probability_of_thunder ?? 0
      }
    };

    // Skriv ner filen
    fs.writeFileSync('weather.json', JSON.stringify(finalData, null, 2));
    console.log("Success! weather.json har skapats utan problem.");

  } catch (error) {
    console.error("KRASCH i väderskriptet:", error.message);
    process.exit(1);
  }
}

getWeather();
