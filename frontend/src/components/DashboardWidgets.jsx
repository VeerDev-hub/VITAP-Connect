import { useState, useEffect, useMemo } from "react";
import { Clock, Sun, Quote, Cloud, CloudLightning, CloudRain, CloudSnow } from "lucide-react";
import { motion } from "framer-motion";

const VIJAYAWADA_COORDS = { lat: 16.5062, lon: 80.6480 };

const techQuotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Hardware is where the power is. Software is where the magic is.", author: "Unknown" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Computers are fast; developers are keeping them slow.", author: "Unknown" },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" }
];

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

  const quote = useMemo(() => techQuotes[Math.floor(Math.random() * techQuotes.length)], []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    async function fetchData() {
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

    fetchData();
    const refreshTimer = setInterval(fetchData, 300000);

    return () => {
      clearInterval(timer);
      clearInterval(refreshTimer);
    };
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const ampm = time.getHours() >= 12 ? 'PM' : 'AM';

  const dateString = time.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short"
  });

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-12 mb-8">
      {/* Clock & Weather Combo - Compact & Clean */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="lg:col-span-12 xl:col-span-8 card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 p-5 sm:p-8 flex flex-col justify-center min-h-0 sm:min-h-[180px]"
      >
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Campus Hub</span>
              </div>
              
              <div className="flex items-baseline">
                <h2 className="text-5xl sm:text-7xl font-display font-black tracking-tighter text-slate-900 dark:text-white flex items-center">
                  <span>{hours}</span>
                  <motion.span 
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="mx-1 text-indigo-500"
                  >
                    :
                  </motion.span>
                  <span>{minutes}</span>
                </h2>
                <span className="text-base sm:text-xl font-bold text-slate-400 ml-2 uppercase">{ampm}</span>
              </div>
              <p className="text-sm sm:text-lg font-medium text-slate-500 dark:text-slate-400">
                {dateString} • VIT-AP
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="h-12 w-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block" />
              {loading ? (
                <div className="h-12 w-24 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse" />
              ) : weather ? (
                <div className="text-left sm:text-right">
                  <div className="flex items-center sm:justify-end gap-3">
                    <div className="text-3xl sm:text-5xl">
                      {getWeatherIcon(weather.weathercode)}
                    </div>
                    <h3 className="text-3xl sm:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tighter">
                      {Math.round(weather.temperature)}°
                    </h3>
                  </div>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Amaravati Forecast</p>
                </div>
              ) : null}
            </div>
         </div>
      </motion.div>

      {/* Quote Card - Compact Version */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="lg:col-span-12 xl:col-span-4 card bg-slate-900 text-white border-transparent p-6 sm:p-8 flex flex-col justify-center"
      >
        <div className="relative z-10">
          <p className="text-base sm:text-xl font-medium leading-relaxed italic mb-4 text-slate-100 font-display">
            "{quote.text}"
          </p>
          <div className="flex items-center gap-3">
             <div className="h-[1.5px] w-6 bg-indigo-500" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{quote.author}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
