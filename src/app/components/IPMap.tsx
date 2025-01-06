import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet';

// Base64 encoded marker icon and shadow
const markerIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCA0OCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjQ4Ij48cGF0aCBmaWxsPSIjMWYyOTM3IiBkPSJNMTIgMEMyLjIgMCAwIDkuOSAwIDEyLjNDMCAyMSAxMiA0OCAxMiA0OFMyNCAxOS42IDI0IDEyLjNDMjQgOS45IDIxLjggMCAxMiAweiIvPjxjaXJjbGUgZmlsbD0iI2ZmZiIgY3g9IjEyIiBjeT0iMTIiIHI9IjQiLz48L3N2Zz4=',
    shadowUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MSIgaGVpZ2h0PSI0MSI+PHBhdGggZmlsbD0icmdiYSgwLCAwLCAwLCAwLjI1KSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTMsIDEzKSIgZD0iTTEyIDBDMi4yIDAgMCA5LjkgMCAxMi4zQzAgMjEgMTIgNDggMTIgNDhTMjQgMTkuNiAyNCAxMi4zQzI0IDkuOSAyMS44IDAgMTIgMHoiLz48L3N2Zz4=',
    iconSize: [24, 48],
    iconAnchor: [12, 48],
    popupAnchor: [0, -48],
    shadowSize: [41, 41],
    shadowAnchor: [13, 41]
});

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
        </div>
    );
};

export default IPMap;