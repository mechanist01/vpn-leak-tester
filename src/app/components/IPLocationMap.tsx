import React from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
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
                                    <div>{marker.label}</div>
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

// Simplified component that only includes the map
const IPLocationMap: React.FC<MapComponentProps> = ({ markers }) => {
    return (
        <div className="h-[400px] w-full rounded-lg overflow-hidden">
            <DynamicMap markers={markers} />
        </div>
    );
};

export default IPLocationMap;