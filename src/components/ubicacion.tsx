import React, { useState } from "react";

// Estructura de datos para el estado de ubicación
interface UbicacionData {
  lat: number;
  lng: number;
  precision: number;
  direccion: string;
}

export default function Ubicacion(): React.JSX.Element {
  const [ubicacion, setUbicacion] = useState<UbicacionData | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Convertir Latitud y Longitud a Dirección (Reverse Geocoding)
  const obtenerDireccion = async (lat: number, lon: number): Promise<string> => {
    try {
      const respuesta = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
      );
      if (!respuesta.ok) throw new Error("Error al consultar la API de mapa");

      const datos = await respuesta.json();
      return datos.display_name || "Dirección no encontrada";
    } catch (err) {
      console.error(err);
      return "No se pudo obtener el nombre de la dirección";
    }
  };

  // 2. Obtener la posición nativa del dispositivo
  const solicitarUbicacion = (): void => {
    if (!navigator.geolocation) {
      setError("Tu navegador no admite geolocalización.");
      return;
    }

    setCargando(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (posicion: GeolocationPosition) => {
        const lat = posicion.coords.latitude;
        const lng = posicion.coords.longitude;
        const precision = posicion.coords.accuracy;

        const direccion = await obtenerDireccion(lat, lng);

        setUbicacion({
          lat,
          lng,
          precision,
          direccion,
        });

        setCargando(false);
      },
      (err: GeolocationPositionError) => {
        setCargando(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Permiso denegado. Habilita la ubicación en tu navegador.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("La información de ubicación no está disponible.");
            break;
          case err.TIMEOUT:
            setError("La solicitud para obtener la ubicación expiró.");
            break;
          default:
            setError("Ocurrió un error al obtener la ubicación.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
    maximumAge: 60000,
      }
    );
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-2xl shadow-md border border-slate-200 font-sans text-slate-800">
      <div className="text-center mb-6">
        <span className="text-3xl">📍</span>
        <h2 className="text-2xl font-bold text-slate-900 mt-2">Geolocalización</h2>
        <p className="text-slate-500 text-sm">Obtené tu posición en tiempo real</p>
      </div>

      <button
        onClick={solicitarUbicacion}
        disabled={cargando}
        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-2"
      >
        {cargando ? "Obteniendo ubicación..." : "Obtener Mi Ubicación"}
      </button>

      {/* Mensaje de error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Detalle de la ubicación */}
      {ubicacion && !cargando && (
        <div className="mt-6 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
          <div>
            <span className="font-bold text-slate-600 block">Coordenadas:</span>
            <p className="font-mono text-slate-900">
              {ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}
            </p>
          </div>

          <div>
            <span className="font-bold text-slate-600 block">Margen de precisión:</span>
            <p className="text-slate-900">~{Math.round(ubicacion.precision)} metros</p>
          </div>

          <div>
            <span className="font-bold text-slate-600 block">Dirección calculada:</span>
            <p className="text-slate-900 leading-snug">{ubicacion.direccion}</p>
          </div>

          <a
            href={`https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-emerald-600 hover:text-emerald-700 text-xs font-bold underline"
          >
            Ver coordenadas en Google Maps ↗
          </a>
        </div>
      )}
    </div>
  );
}