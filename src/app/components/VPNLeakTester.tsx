import React, { useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Loader, RefreshCw, Shield, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import AdvancedNetworkTests from './AdvancedNetworkTests';
import type {
    TestStatus,
    Tests,
    DNSCheckResult,
    EnhancedWebRTCResult,
    IPCheckResult,
    GeoLocation,
    LocationMarker,
    IPServiceResult,
    DNSResult,
    LeakAnalysis,
    DNSServer,
    IPService
} from './types';
import L from 'leaflet';

// Constants remain the same
const DNS_SERVERS: DNSServer[] = [
    {
        name: 'Cloudflare',
        endpoint: 'https://cloudflare-dns.com/dns-query',
        dohSupport: true
    },
    {
        name: 'Google',
        endpoint: 'https://dns.google/resolve',
        dohSupport: true
    }
];

const IP_SERVICES: IPService[] = [
    { name: 'ipify', url: 'https://api.ipify.org?format=json' },
    { name: 'icanhazip', url: 'https://icanhazip.com' },
    { name: 'ipapi', url: 'https://ipapi.co/json/' }
];


// Simple marker icon SVG as a base64 string
const markerIconBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIj48cGF0aCBmaWxsPSIjMWYyOTM3IiBkPSJNMTIuNSAwQzUuNiAwIDAgNS42IDAgMTIuNWMwIDcuMyAxMi41IDI4LjUgMTIuNSAyOC41UzI1IDE5LjggMjUgMTIuNSAyMC40IDAgMTIuNSAwem0wIDE3LjVjLTIuOCAwLTUtMi4yLTUtNXMyLjItNSA1LTUgNSAyLjIgNSA1LTIuMiA1LTUgNXoiLz48L3N2Zz4=";

// Simple marker shadow SVG as a base64 string
const markerShadowBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDQxIDQxIj48cGF0aCBmaWxsPSJyZ2JhKDAsIDAsIDAsIDAuMikiIGQ9Ik0xMi41IDBDNi4yIDAgMSA1LjIgMSAxMS41YzAgNy4zIDExLjUgMjguNSAxMS41IDI4LjVzMTEuNS0yMS4yIDExLjUtMjguNUMyNCAxIDIwLjggMCAxMi41IDB6Ii8+PC9zdmc+";

// Create icon objects
const customIcon = new L.Icon({
    iconUrl: markerIconBase64,
    shadowUrl: markerShadowBase64,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


// Dynamic map import remains the same
const DynamicIPMap = dynamic(() =>
    import('react-leaflet').then((leaflet) => {
        const { MapContainer, TileLayer, Marker, Popup } = leaflet;
        return ({ markers }: { markers: LocationMarker[] }) => {
            const center = markers.length > 0
                ? [markers[0].lat, markers[0].lon]
                : [0, 0];
            return (
                <div className="h-[400px] w-full rounded-lg overflow-hidden">
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
                            position={[marker.lat, marker.lon]}
                            icon={customIcon}
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
    }),
    { ssr: false }
);

const VPNLeakTester: React.FC = () => {
    const [tests, setTests] = useState<Tests>({
        webRTC: { status: 'pending', message: 'Not tested', details: [] },
        dns: { status: 'pending', message: 'Not tested', details: [] },
        ipAddress: { status: 'pending', message: 'Not tested', details: [] }
    });
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [geoData, setGeoData] = useState<GeoLocation[]>([]);
    const [shouldRunAdvanced, setShouldRunAdvanced] = useState(false);

    const addLog = useCallback((message: string): void => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    }, []);

    // Test implementation functions remain the same
    const checkWebRTCLeak = async (): Promise<EnhancedWebRTCResult> => {
        addLog('Starting WebRTC leak test...');
        return new Promise((resolve) => {
            // Add multiple STUN servers
            const stunServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun.stunprotocol.org:3478' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ];

            const pc = new RTCPeerConnection({ iceServers: stunServers });
            const ips = new Set<string>();
            const localIps = new Set<string>();
            const publicIps = new Set<string>();
            const ipv6Ips = new Set<string>();

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    // Enhanced IP detection regex for both IPv4 and IPv6
                    const ipv4Match = event.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
                    const ipv6Match = event.candidate.candidate.match(/([a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/);

                    if (ipv4Match) {
                        const ip = ipv4Match[1];
                        ips.add(ip);
                        addLog(`Found IPv4: ${ip} (${event.candidate.protocol || 'unknown protocol'})`);

                        if (ip.match(/^(192\.168\.|169\.254\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
                            localIps.add(ip);
                            addLog('Classified as local IPv4');
                        } else {
                            publicIps.add(ip);
                            addLog('Classified as public IPv4');
                        }
                    }

                    if (ipv6Match) {
                        const ip = ipv6Match[1];
                        ips.add(ip);
                        ipv6Ips.add(ip);
                        addLog(`Found IPv6: ${ip} (${event.candidate.protocol || 'unknown protocol'})`);
                    }

                    // Log additional candidate information
                    addLog(`Candidate type: ${event.candidate.type}`);
                    addLog(`Transport: ${event.candidate.protocol}`);
                }
            };

            // Test both UDP and TCP
            const dataChannelUDP = pc.createDataChannel('UDP_test', { protocol: 'udp' });
            const dataChannelTCP = pc.createDataChannel('TCP_test', { protocol: 'tcp' });

            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .catch(() => {
                    pc.close();
                    addLog('Error in WebRTC test');
                    resolve({
                        leaked: false,
                        ips: [],
                        error: true
                    });
                });

            // Set timeout to ensure test completion
            setTimeout(() => {
                pc.close();
                addLog('WebRTC test completed');
                resolve({
                    leaked: publicIps.size > 1,
                    ips: Array.from(ips),
                    localIps: Array.from(localIps),
                    publicIps: Array.from(publicIps),
                    ipv6Ips: Array.from(ipv6Ips)
                });
            }, 5000);
        });
    };

    const checkDNSLeaks = async (): Promise<DNSCheckResult> => {
        addLog('Starting enhanced DNS leak test...');
        const testDomains = [
            'google.com',
            'cloudflare.com',
            'netflix.com',
            'wikipedia.org',
            'amazon.co.jp',
            'bbc.co.uk',
            'edu.stanford.edu'
        ];

        const results: {
            server: string;
            domain: string;
            ipv4: string[];
            ipv6: string[];
            reversePtr?: string;
        }[] = [];

        for (const domain of testDomains) {
            addLog(`Testing resolution of ${domain}...`);

            for (const server of DNS_SERVERS) {
                try {
                    // Test both A and AAAA records
                    const [ipv4Response, ipv6Response] = await Promise.all([
                        fetch(`${server.endpoint}?name=${domain}&type=A`, {
                            headers: {
                                'Accept': 'application/dns-json'
                            },
                            credentials: 'omit'
                        }),
                        fetch(`${server.endpoint}?name=${domain}&type=AAAA`, {
                            headers: {
                                'Accept': 'application/dns-json'
                            },
                            credentials: 'omit'
                        })
                    ]);

                    const [ipv4Data, ipv6Data] = await Promise.all([
                        ipv4Response.json(),
                        ipv6Response.json()
                    ]);

                    const ipv4Addresses = ipv4Data.Answer?.map((a: any) => a.data) || [];
                    const ipv6Addresses = ipv6Data.Answer?.map((a: any) => a.data) || [];

                    // Perform reverse DNS lookup for each IPv4 address
                    const reversePtrs = await Promise.all(
                        ipv4Addresses.map(async (ip: string) => {
                            try {
                                const ptrResponse = await fetch(
                                    `${server.endpoint}?name=${ip.split('.').reverse().join('.')}.in-addr.arpa&type=PTR`,
                                    {
                                        headers: { 'Accept': 'application/dns-json' },
                                        credentials: 'omit'
                                    }
                                );
                                const ptrData = await ptrResponse.json();
                                return ptrData.Answer?.[0]?.data || null;
                            } catch {
                                return null;
                            }
                        })
                    );

                    results.push({
                        server: server.name,
                        domain,
                        ipv4: ipv4Addresses,
                        ipv6: ipv6Addresses,
                        reversePtr: reversePtrs.filter(Boolean)[0]
                    });

                    addLog(`${server.name} resolved ${domain}:`);
                    addLog(`IPv4: ${ipv4Addresses.join(', ')}`);
                    addLog(`IPv6: ${ipv6Addresses.join(', ')}`);
                } catch (error) {
                    addLog(`Error resolving ${domain} with ${server.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        }

        // Enhanced leak detection
        const leakAnalysis: LeakAnalysis = {
            inconsistentIPv4: false,
            inconsistentIPv6: false,
            mismatchedPtr: false
        };

        // Check for inconsistencies across resolvers
        for (const domain of testDomains) {
            const domainResults = results.filter(r => r.domain === domain);
            const ipv4Sets = domainResults.map(r => new Set(r.ipv4));
            const ipv6Sets = domainResults.map(r => new Set(r.ipv6));

            // Check IPv4 consistency
            leakAnalysis.inconsistentIPv4 = leakAnalysis.inconsistentIPv4 ||
                !ipv4Sets.every(set => set.size === ipv4Sets[0].size &&
                    Array.from(set).every(ip => ipv4Sets[0].has(ip)));

            // Check IPv6 consistency
            leakAnalysis.inconsistentIPv6 = leakAnalysis.inconsistentIPv6 ||
                !ipv6Sets.every(set => set.size === ipv6Sets[0].size &&
                    Array.from(set).every(ip => ipv6Sets[0].has(ip)));

            // Check PTR consistency
            const ptrs = domainResults.map(r => r.reversePtr).filter(Boolean);
            if (ptrs.length > 1) {
                leakAnalysis.mismatchedPtr = leakAnalysis.mismatchedPtr ||
                    !ptrs.every(ptr => ptr === ptrs[0]);
            }
        }

        return {
            leaked: leakAnalysis.inconsistentIPv4 || leakAnalysis.inconsistentIPv6 || leakAnalysis.mismatchedPtr,
            results,
            message: [
                leakAnalysis.inconsistentIPv4 ? 'Inconsistent IPv4 resolutions detected' : null,
                leakAnalysis.inconsistentIPv6 ? 'Inconsistent IPv6 resolutions detected' : null,
                leakAnalysis.mismatchedPtr ? 'Mismatched reverse DNS records detected' : null
            ].filter(Boolean).join('; ') || 'No DNS leaks detected'
        };
    };


    const checkIPAddress = async (): Promise<IPCheckResult> => {
        addLog('Starting comprehensive IP address check...');

        try {
            const results: (IPServiceResult | null)[] = await Promise.all(
                IP_SERVICES.map(async service => {
                    try {
                        const response = await fetch(service.url);
                        if (service.name === 'icanhazip') {
                            const ip = await response.text();
                            return { service: service.name, ip: ip.trim() };
                        }
                        const data = await response.json();
                        return {
                            service: service.name,
                            ip: data.ip || data.address || data.query
                        };
                    } catch (error) {
                        addLog(`Error with ${service.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        return null;
                    }
                })
            );

            const validResults = results.filter((result): result is IPServiceResult => result !== null);

            if (validResults.length === 0) {
                throw new Error('No IP detection services available');
            }

            const uniqueIPs = new Set(validResults.map(r => r.ip));
            const ipConsistent = uniqueIPs.size === 1;

            if (!ipConsistent) {
                addLog('WARNING: Inconsistent IPs detected across services');
                validResults.forEach(r => {
                    addLog(`${r.service}: ${r.ip}`);
                });
            }

            const locationData = await Promise.all(
                Array.from(uniqueIPs).map(ip => getIpLocation(ip))
            );

            setGeoData(locationData);

            const mainIP = validResults[0]?.ip;
            if (!mainIP) {
                throw new Error('No valid IP found');
            }

            addLog(`Primary detected IP: ${mainIP}`);
            locationData.forEach(loc => {
                addLog(`Location for ${loc.ip}: ${loc.city}, ${loc.country}`);
                addLog(`ISP: ${loc.isp}`);
            });

            return {
                ip: mainIP,
                allIPs: Array.from(uniqueIPs),
                consistent: ipConsistent,
                locations: locationData
            };

        } catch (error) {
            addLog('Error in IP detection');
            return { error: true };
        }
    };


    const getIpLocation = async (ip: string): Promise<GeoLocation> => {
        addLog(`Fetching geolocation for IP: ${ip}`);
        try {
            const response = await fetch(`https://ipapi.co/${ip}/json/`);
            if (!response.ok) {
                throw new Error(`Failed to fetch location for IP: ${ip} (Status: ${response.status})`);
            }
            const data = await response.json();
            return {
                ip,
                country: data.country_name || data.country,
                city: data.city,
                lat: data.latitude,
                lon: data.longitude,
                isp: data.org
            };
        } catch (error) {
            addLog(`Error fetching geolocation for IP: ${ip}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    };

    const runBasicTests = async () => {
        try {
            // WebRTC Test
            const webRTCResult = await checkWebRTCLeak();
            setTests(prev => ({
                ...prev,
                webRTC: {
                    status: webRTCResult.leaked ? 'failed' : 'passed',
                    message: webRTCResult.leaked
                        ? 'WebRTC leak detected!'
                        : 'No WebRTC leaks detected',
                    details: [
                        `Total IPs found: ${webRTCResult.ips.length}`,
                        `Local IPs: ${webRTCResult.localIps?.join(', ') || 'None'}`,
                        `Public IPs: ${webRTCResult.publicIps?.join(', ') || 'None'}`,
                        `IPv6 IPs: ${webRTCResult.ipv6Ips?.join(', ') || 'None'}`
                    ]
                }
            }));

            // DNS Test
            const dnsResult = await checkDNSLeaks();
            setTests(prev => ({
                ...prev,
                dns: {
                    status: dnsResult.leaked ? 'failed' : 'passed',
                    message: dnsResult.message,
                    details: dnsResult.results.map(r =>
                        `${r.server}: ${r.domain} → IPv4: ${r.ipv4.join(', ')} | IPv6: ${r.ipv6.join(', ')}${r.reversePtr ? ` | PTR: ${r.reversePtr}` : ''}`
                    )
                }
            }));

            // IP Test
            const ipResult = await checkIPAddress();
            setTests(prev => ({
                ...prev,
                ipAddress: {
                    status: ipResult.error ? 'error' : (ipResult.consistent ? 'passed' : 'failed'),
                    message: ipResult.error ? 'Error checking IP' : (ipResult.consistent ? 'IP address verified' : 'Inconsistent IPs detected'),
                    details: ipResult.ip ? [`Current IP: ${ipResult.ip}`, ...(ipResult.allIPs ? [`All IPs: ${ipResult.allIPs.join(', ')}`] : [])] : []
                }
            }));
        } catch (error) {
            addLog(`Error in basic tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleAdvancedTestsComplete = useCallback(() => {
        setIsRunning(false);
        setShouldRunAdvanced(false);
        addLog('All tests completed');
    }, [addLog]);

    const startAllTests = async () => {
        if (isRunning) return;

        setIsRunning(true);
        setLogs([]);
        setGeoData([]);
        setShouldRunAdvanced(false);

        setTests({
            webRTC: { status: 'running', message: 'Testing WebRTC...', details: [] },
            dns: { status: 'running', message: 'Testing DNS...', details: [] },
            ipAddress: { status: 'running', message: 'Checking IP...', details: [] }
        });

        await runBasicTests();
        setShouldRunAdvanced(true);
    };

    const getStatusIcon = (status: TestStatus) => {
        switch (status) {
            case 'passed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'failed':
                return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'running':
                return <Loader className="w-5 h-5 animate-spin text-gray-500" />;
            default:
                return <RefreshCw className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <div className="mb-6 flex items-center gap-4">
                <Shield className="w-8 h-8" />
                <div>
                    <h1 className="text-2xl font-mono font-bold uppercase tracking-wider">VPN Leak Test</h1>
                    <p className="text-gray-600 font-mono">Comprehensive VPN leak detection system</p>
                </div>
            </div>

            <div className="space-y-4 mb-6">
                {Object.entries(tests).map(([testName, test]) => (
                    <div
                        key={testName}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                        <div className="flex items-center gap-4 mb-2">
                            {getStatusIcon(test.status)}
                            <div className="flex-1">
                                <h3 className="font-mono font-medium uppercase tracking-wide">
                                    {testName} Test
                                </h3>
                                <p className="text-sm text-gray-600">{test.message}</p>
                            </div>
                        </div>
                        {test.details.length > 0 && (
                            <div className="ml-9 mt-2 text-sm text-gray-600 font-mono">
                                {test.details.map((detail, index) => (
                                    <div key={index} className="mb-1">{detail}</div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {geoData.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-mono font-medium uppercase tracking-wide mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        IP Location Map
                    </h3>
                    <DynamicIPMap
                        markers={geoData.map(loc => ({
                            lat: loc.lat,
                            lon: loc.lon,
                            label: `${loc.ip} (${loc.city}, ${loc.country})`,
                            color: '#1f2937'
                        }))}
                    />
                    <div className="mt-4 space-y-2 text-sm text-gray-600 font-mono">
                        {geoData.map((loc, index) => (
                            <div key={index}>
                                <div>IP: {loc.ip}</div>
                                <div>Location: {loc.city}, {loc.country}</div>
                                <div>ISP: {loc.isp}</div>
                                <div>Coordinates: {loc.lat}, {loc.lon}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4 mb-6">
                <AdvancedNetworkTests
                    isRunning={isRunning}
                    onTestComplete={handleAdvancedTestsComplete}
                    triggerTests={shouldRunAdvanced}
                    addLog={addLog}
                />
            </div>

            <button
                onClick={startAllTests}
                disabled={isRunning}
                className={cn(
                    "w-full mb-6 px-4 py-2 font-mono uppercase tracking-wider text-white bg-black",
                    "rounded-md transition-colors duration-200",
                    "hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                )}
            >
                {isRunning ? 'Running All Tests...' : 'Start Complete VPN Test'}
            </button>

            {logs.length > 0 && (
                <div className="mb-6 p-4 bg-black rounded-lg">
                    <h3 className="font-mono text-white mb-2 uppercase tracking-wide">Test Logs</h3>
                    <div className="font-mono text-xs space-y-1 max-h-[300px] overflow-y-auto">
                        {logs.map((log, index) => (
                            <div key={index} className="text-gray-300">{log}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VPNLeakTester;