import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import type { TileLayerProps } from 'react-leaflet';
import L from 'leaflet';

interface LocationMarker {
    lat: number;
    lon: number;
    label: string;
    color: string;
}

interface IPMapProps {
    markers: LocationMarker[];
}

const IPMap: React.FC<IPMapProps> = ({ markers }) => {
    const center: [number, number] = markers.length > 0
        ? [markers[0].lat, markers[0].lon]
        : [0, 0];

    return (
        <div className="h-[400px] w-full rounded-lg overflow-hidden">
            <MapContainer
                center={center}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markers.map((marker, index) => (
                    <Marker
                        key={index}
                        position={[marker.lat, marker.lon] as [number, number]}
                    >
                        <Popup>
                            <div className="font-mono text-sm">
                                <div>IP: {marker.label}</div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default IPMap;