import React from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import type { LocationMarker } from './types';

// Custom marker icon setup
const markerIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCA0OCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjQ4Ij48cGF0aCBmaWxsPSIjMWYyOTM3IiBkPSJNMTIgMEMyLjIgMCAwIDkuOSAwIDEyLjNDMCAyMSAxMiA0OCAxMiA0OFMyNCAxOS42IDI0IDEyLjNDMjQgOS45IDIxLjggMCAxMiAweiIvPjxjaXJjbGUgZmlsbD0iI2ZmZiIgY3g9IjEyIiBjeT0iMTIiIHI9IjQiLz48L3N2Zz4=',
    shadowUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MSIgaGVpZ2h0PSI0MSI+PHBhdGggZmlsbD0icmdiYSgwLCAwLCAwLCAwLjI1KSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTMsIDEzKSIgZD0iTTEyIDBDMi4yIDAgMCA5LjkgMCAxMi4zQzAgMjEgMTIgNDggMTIgNDhTMjQgMTkuNiAyNCAxMi4zQzI0IDkuOSAyMS44IDAgMTIgMHoiLz48L3N2Zz4=',
    iconSize: [24, 48],
    iconAnchor: [12, 48],
    popupAnchor: [0, -48],
    shadowSize: [41, 41],
    shadowAnchor: [13, 41]
});

interface MapComponentProps {
    markers: LocationMarker[];
}

// Create a dynamic Map component that only imports on client side
const DynamicMap = dynamic(() => 
    import('react-leaflet').then((mod) => {
        const { MapContainer, TileLayer, Marker, Popup } = mod;
        return function Map({ markers }: MapComponentProps) {
            const center = markers.length > 0
                ? [markers[0].lat, markers[0].lon]
                : [0, 0];

            return (
                <MapContainer
                    center={center as [number, number]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {markers.map((marker, index) => (
                        <Marker
                            key={index}
                            position={[marker.lat, marker.lon] as [number, number]}
                            icon={markerIcon}
                        >
                            <Popup>
                                <div className="font-mono text-sm">
                                    <div>IP: {marker.label}</div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            );
        };
    }),
    { ssr: false }
);

// Wrapper component that includes the container div
const IPLocationMap: React.FC<MapComponentProps> = ({ markers }) => {
    return (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-mono font-medium uppercase tracking-wide mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                IP Location Map
            </h3>
            <div className="h-[400px] w-full rounded-lg overflow-hidden">
                <DynamicMap markers={markers} />
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-600 font-mono">
                {markers.map((marker, index) => (
                    <div key={index}>
                        <div>IP: {marker.label}</div>
                        <div>Coordinates: {marker.lat}, {marker.lon}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IPLocationMap;