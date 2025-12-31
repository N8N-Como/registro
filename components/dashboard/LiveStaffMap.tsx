
import React, { useState, useEffect, useRef } from 'react';
import Card from '../shared/Card';
import { getLocations, getAllRunningTimeEntries, getEmployees } from '../../services/mockApi';
import { Location, Employee, TimeEntry } from '../../types';

declare var L: any; // Leaflet Global

const LiveStaffMap: React.FC = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<any>(null);
    const markersLayer = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const loadMapData = async () => {
        try {
            const [locs, entries, emps] = await Promise.all([
                getLocations(),
                getAllRunningTimeEntries(),
                getEmployees()
            ]);

            if (!leafletMap.current && mapRef.current) {
                // Santiago de Compostela / A Coruña default view
                leafletMap.current = L.map(mapRef.current).setView([43.3623, -8.4115], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(leafletMap.current);
                markersLayer.current = L.layerGroup().addTo(leafletMap.current);
            }

            if (markersLayer.current) {
                markersLayer.current.clearLayers();

                // 1. Add Locations (Blue Markers)
                locs.forEach(loc => {
                    const icon = L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color: #004A4E; color: white; padding: 5px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg></div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    });
                    L.marker([loc.latitude, loc.longitude], { icon })
                        .bindPopup(`<b>Establecimiento:</b><br>${loc.name}`)
                        .addTo(markersLayer.current);
                });

                // 2. Add Staff (Orange Markers)
                entries.forEach(entry => {
                    const emp = emps.find(e => e.employee_id === entry.employee_id);
                    const lat = entry.clock_in_latitude;
                    const lon = entry.clock_in_longitude;

                    if (lat && lon) {
                        const icon = L.divIcon({
                            className: 'staff-icon',
                            html: `
                                <div style="position: relative;">
                                    <img src="${emp?.photo_url || `https://ui-avatars.com/api/?name=${emp?.first_name}`}" 
                                         style="width: 36px; height: 36px; border-radius: 50%; border: 3px solid #F37021; object-cover: cover; background: white;"/>
                                    <div style="position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); background: #F37021; color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; white-space: nowrap; border: 1px solid white;">
                                        ${emp?.first_name || 'Staff'}
                                    </div>
                                </div>
                            `,
                            iconSize: [36, 36],
                            iconAnchor: [18, 18]
                        });
                        L.marker([lat, lon], { icon })
                            .bindPopup(`<b>Empleado:</b> ${emp?.first_name} ${emp?.last_name}<br><b>Fichaje:</b> ${new Date(entry.clock_in_time).toLocaleTimeString()}`)
                            .addTo(markersLayer.current);
                    }
                });

                // Zoom to fit if we have points
                const group = new L.featureGroup(markersLayer.current.getLayers());
                if (markersLayer.current.getLayers().length > 0) {
                    leafletMap.current.fitBounds(group.getBounds().pad(0.1));
                }
            }

            setIsLoading(false);
        } catch (e) {
            console.error("Map Error:", e);
        }
    };

    useEffect(() => {
        loadMapData();
        const interval = setInterval(loadMapData, 30000);
        return () => clearInterval(interval);
    }, []);

    const toggleFullscreen = () => {
        const elem = mapRef.current;
        if (!elem) return;
        
        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch(err => {
                alert(`Error al intentar modo pantalla completa: ${err.message}`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <Card title="Mapa de Personal en Vivo" className="overflow-hidden p-0 relative">
            <div className="absolute top-12 right-4 z-[1000] no-print">
                <button 
                    onClick={toggleFullscreen}
                    className="bg-white p-2 rounded-lg shadow-md border hover:bg-gray-50 flex items-center gap-2 text-xs font-bold text-gray-700"
                >
                    {isFullscreen ? '⏹ Salir Fullscreen' : '⛶ Pantalla Completa'}
                </button>
            </div>

            <div 
                ref={mapRef} 
                className={`w-full bg-gray-100 ${isFullscreen ? 'h-screen' : 'h-[500px]'}`}
                style={{ zIndex: 1 }}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[1001]">
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            <p className="mt-4 text-sm font-medium text-gray-600">Cargando Mapa Real...</p>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="p-3 bg-gray-50 flex items-center justify-between text-[10px] text-gray-500 border-t">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-full"></span> Establecimiento</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-full"></span> Personal</span>
                </div>
                <p>📍 Posiciones basadas en el último GPS registrado. Actualización automática cada 30s.</p>
            </div>
        </Card>
    );
};

export default LiveStaffMap;
