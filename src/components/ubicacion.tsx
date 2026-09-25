import React, { useState } from "react";

interface UbicacionData {
  lat: number;
  lng: number;
  precision: number;
  direccion: string;
  metodo: "GPS (Alta Precisión)" | "Búsqueda Manual" | "Aproximación por IP";
}

export default function Ubicacion(): React.JSX.Element {
  const [ubicacion, setUbicacion] = useState<UbicacionData | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [direccionInput, setDireccionInput] = useState<string>("");

  // 1. Geocodificación Inversa: Coordenadas -> Dirección
  const obtenerDireccionPorCoordenadas = async (lat: number, lon: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
      );
      if (!res.ok) throw new Error("Error en servicio de mapas");
      const data = await res.json();
      return data.display_name || "Dirección desconocida";
    } catch {
      return "No se pudo determinar el nombre de la calle";
    }
  };

  // 2. Geocodificación Directa: Texto de Dirección -> Coordenadas Exactas
  const buscarDireccionManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!direccionInput.trim()) return;

    setCargando(true);
    setError(null);

    try {
      const query = encodeURIComponent(direccionInput);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const resultado = data[0];
        setUbicacion({
          lat: parseFloat(resultado.lat),
          lng: parseFloat(resultado.lon),
          precision: 10, // Precisión de búsqueda directa
          direccion: resultado.display_name,
          metodo: "Búsqueda Manual",
        });
      } else {
        setError("No se encontró la dirección ingresada. Intentá ser más específico (Ej: Av. Colón 123, Córdoba).");
      }
    } catch {
      setError("Error al buscar la dirección manual.");
    } finally {
      setCargando(false);
    }
  };

  // 3. Respaldo por IP en caso de que falle el GPS por completo
  const obtenerUbicacionPorIP = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();

      setUbicacion({
        lat: data.latitude,
        lng: data.longitude,
        precision: 10000,
        direccion: `${data.city}, ${data.region}, ${data.country_name}`,
        metodo: "Aproximación por IP",
      });
      setError("No se pudo obtener la señal GPS exacta. Se muestra la ubicación aproximada de tu proveedor de red.");
    } catch {
      setError("No se pudo obtener la ubicación automáticamente.");
    } finally {
      setCargando(false);
    }
  };

  // 4. Solicitar GPS Nativo con Alta Precisión
  const obtenerUbicacionGPS = (): void => {
    setCargando(true);
    setError(null);

    if (!navigator.geolocation) {
      obtenerUbicacionPorIP();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (posicion: GeolocationPosition) => {
        const lat = posicion.coords.latitude;
        const lng = posicion.coords.longitude;
        const precision = posicion.coords.accuracy;

        const direccion = await obtenerDireccionPorCoordenadas(lat, lng);

        setUbicacion({
          lat,
          lng,
          precision,
          direccion,
          metodo: "GPS (Alta Precisión)",
        });

        setCargando(false);
      },
      (err: GeolocationPositionError) => {
        console.warn("Error de GPS:", err.message);
        // Si el GPS falla o expira, cae al respaldo por IP
        obtenerUbicacionPorIP();
      },
      {
        enableHighAccuracy: true, // Forzar uso de antena GPS / Triangulación Wi-Fi precisa
        timeout: 15000,            // Darle 15 segundos al dispositivo para fijar la posición
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-2xl shadow-md border border-slate-200 font-sans text-slate-800">
      <div className="text-center mb-6">
        <span className="text-3xl">📍</span>
        <h2 className="text-2xl font-bold text-slate-900 mt-2">Geolocalización</h2>
        <p className="text-slate-500 text-sm">Obtené tu posición exactas</p>
      </div>

      {/* Botón de GPS Automático */}
      <button
        onClick={obtenerUbicacionGPS}
        disabled={cargando}
        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-2 mb-4"
      >
        {cargando ? "Detectando ubicación..." : "🎯 Usar Mi Ubicación Actual (GPS)"}
      </button>

      {/* Separador */}
      <div className="relative my-4 text-center">
        <span className="bg-white px-2 text-xs text-slate-400 font-bold uppercase">o ingresá tu dirección</span>
        <div className="absolute inset-0 top-1/2 -z-10 border-t border-slate-200"></div>
      </div>

      {/* Formulario de Búsqueda Manual */}
      <form onSubmit={buscarDireccionManual} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Ej: Belgrano 450, San Justo"
          value={direccionInput}
          onChange={(e) => setDireccionInput(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={cargando || !direccionInput.trim()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Mensaje de aviso / error */}
      {error && (
        <div className="p-3 mb-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
          ⚠️ {error}
        </div>
      )}

      {/* Detalle de la Ubicación Encontrada */}
      {ubicacion && !cargando && (
        <div className="mt-4 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-600">Método de origen:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                ubicacion.metodo === "GPS (Alta Precisión)"
                  ? "bg-emerald-100 text-emerald-800"
                  : ubicacion.metodo === "Búsqueda Manual"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {ubicacion.metodo}
            </span>
          </div>

          <div>
            <span className="font-bold text-slate-600 block">Coordenadas:</span>
            <p className="font-mono text-slate-900">
              {ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}
            </p>
          </div>

          <div>
            <span className="font-bold text-slate-600 block">Dirección:</span>
            <p className="text-slate-900 leading-snug">{ubicacion.direccion}</p>
          </div>

          <a
            href={`https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-emerald-600 hover:text-emerald-700 text-xs font-bold underline"
          >
            Ver punto en Google Maps ↗
          </a>
        </div>
      )}
    </div>
  );
}