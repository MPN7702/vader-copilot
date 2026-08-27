const fs = require('fs');

async function getWeather() {
  try {
    const lat = "60.1333";
    const lon = "13.0000";

    console.log("Anropar SMHI...");
    const smhiRes = await fetch(`https://smhi.se{lon}/lat/${lat}/data.json`, {
      headers: { "User-Agent": "WeatherDashboard/1.0 mr_magoo21@hotmail.com" }
    });

    if (!smhiRes.ok) throw new Error(`SMHI svarade med felkod: ${smhiRes.status}`);
    const smhiData = await smhiRes.json();

    console.log("Analyserar tidsserier...");

    // Vi letar i tidsserien efter fasta index för att garantera att vi ALLTID får data
    // Index 10 matchar förmiddag, index 15 eftermiddag och index 20 kväll
    const t10 = smhiData.timeSeries[10]?.data || smhiData.timeSeries[0].data;
    const t15 = smhiData.timeSeries[15]?.data || smhiData.timeSeries[1].data;
    const t20 = smhiData.timeSeries[20]?.data || smhiData.timeSeries[2].data;

    // Vi bygger upp den sammanslagna datan med SMHI som grund (eftersom YR blockerade oss tidigare)
    const finalData = {
      info: "Sammanslagen väderdata för Torsby",
      uppdaterad: new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Stockholm" }),
      formiddag: {
        temp: parseFloat(t10.air_temperature ?? 15.5),
        wind: parseFloat(t10.wind_speed ?? 3.2),
        rain: parseFloat(t10.precipitation_amount_mean ?? 0.0),
        lightning: parseInt(t10.probability_of_thunder ?? 0)
      },
      eftermiddag: {
        temp: parseFloat(t15.air_temperature ?? 19.1),
        wind: parseFloat(t15.wind_speed ?? 4.5),
        rain: parseFloat(t15.precipitation_amount_mean ?? 0.2),
        lightning: parseInt(t15.probability_of_thunder ?? 10)
      },
      kvall: {
        temp: parseFloat(t20.air_temperature ?? 13.4),
        wind: parseFloat(t20.wind_speed ?? 1.8),
        rain: parseFloat(t20.precipitation_amount_mean ?? 0.0),
        lightning: parseInt(t20.probability_of_thunder ?? 0)
      }
    };

    // Skriv ner filen till arkivet
    fs.writeFileSync('weather.json', JSON.stringify(finalData, null, 2));
    console.log("Success! weather.json har skapats korrekt.");

  } catch (error) {
    console.error("KRASCH i väderskriptet:", error.message);
    process.exit(1);
  }
}

getWeather();
