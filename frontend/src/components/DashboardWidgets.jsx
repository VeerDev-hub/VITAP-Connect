import { useState, useEffect } from "react";
import { Clock, Cloud, CloudLightning, CloudRain, CloudSnow, Moon, Sun, Wind } from "lucide-react";

const VIJAYAWADA_COORDS = { lat: 16.5062, lon: 80.6480 };

function getWeatherIcon(code) {
  if (code === 0) return <Sun className="text-amber-400" />;
  if (code <= 3) return <Cloud className="text-slate-400" />;
  if (code <= 48) return <Cloud className="text-slate-500" />;
  if (code <= 67) return <CloudRain className="text-blue-400" />;
  if (code <= 77) return <CloudSnow className="text-sky-300" />;
  if (code <= 82) return <CloudRain className="text-blue-500" />;
  if (code <= 99) return <CloudLightning className="text-indigo-500" />;
  return <Sun className="text-amber-400" />;
}

export default function DashboardWidgets() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    async function fetchWeather() {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${VIJAYAWADA_COORDS.lat}&longitude=${VIJAYAWADA_COORDS.lon}&current_weather=true`);
        const data = await res.json();
        setWeather(data.current_weather);
      } catch (error) {
        console.error("Weather fetch failed:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 300000); // Update every 5 mins

    return () => {
      clearInterval(timer);
      clearInterval(weatherTimer);
    };
  }, []);

  const timeString = time.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  const dateString = time.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 mb-8">
      {/* Clock Widget */}
      <div className="card relative overflow-hidden group border-slate-200 dark:border-white/10">
        <div className="absolute -right-6 -top-6 text-slate-100 dark:text-white/5 transition-transform group-hover:scale-110 duration-500">
          <Clock size={140} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Clock size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Local Time</span>
          </div>
          <h2 className="font-display text-4xl font-bold tracking-tighter text-slate-900 dark:text-white">{timeString}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{dateString} • IST</p>
        </div>
      </div>

      {/* Weather Widget */}
      <div className="card relative overflow-hidden group border-slate-200 dark:border-white/10">
        <div className="absolute -right-6 -top-6 text-slate-100 dark:text-white/5 transition-transform group-hover:scale-110 duration-500">
          {weather ? getWeatherIcon(weather.weathercode) : <Sun size={140} />}
        </div>
        <div className="relative z-10 w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Sun size={16} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Amaravati, AP</span>
            </div>
            {weather && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="h-1 w-1 bg-emerald-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
          
          {loading ? (
            <div className="space-y-2">
              <div className="h-10 w-32 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse" />
              <div className="h-4 w-24 bg-slate-50 dark:bg-white/5 rounded-full animate-pulse" />
            </div>
          ) : weather ? (
            <div className="flex items-end gap-3">
              <h2 className="font-display text-4xl font-bold tracking-tighter text-slate-900 dark:text-white">
                {Math.round(weather.temperature)}°C
              </h2>
              <div className="flex flex-col mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                  {getWeatherIcon(weather.weathercode)}
                  <span>Conditions</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    <Wind size={10} /> {weather.windspeed} km/h
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Weather service unavailable</p>
          )}
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Campus Forecast</p>
        </div>
      </div>
    </div>
  );
}
