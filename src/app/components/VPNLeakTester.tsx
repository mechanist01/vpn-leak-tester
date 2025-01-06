import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Loader, RefreshCw, Shield, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
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

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Constants
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
  // Removed Quad9 as it doesn't support CORS
];

const IP_SERVICES: IPService[] = [
  { name: 'ipify', url: 'https://api.ipify.org?format=json' },
  { name: 'icanhazip', url: 'https://icanhazip.com' },
  { name: 'ipapi', url: 'https://ipapi.co/json/' }
];

// Dynamically import the map component
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
  const [runAdvancedTests, setRunAdvancedTests] = useState(false);


  const addLog = (message: string): void => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkWebRTCLeak = (): Promise<EnhancedWebRTCResult> => {
    return new Promise((resolve) => {
      addLog('Starting WebRTC leak test...');
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
      'amazon.co.jp', // International domain
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
              // Add credentials: 'omit' for better CORS support
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
      // Using ipapi.co with HTTPS
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

  // Modify runTests to include all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setLogs([]);
    setRunAdvancedTests(false); // Reset
    addLog('Starting comprehensive VPN leak tests...');

    // Run basic tests
    await runTests();

    // Trigger advanced tests
    setRunAdvancedTests(true);
  };

  // Handle advanced tests completion
  const handleAdvancedTestsComplete = () => {
    setIsRunning(false);
    addLog('All tests completed');
  };

  // Run all tests
  const runTests = async () => {
    setIsRunning(true);
    setLogs([]);
    addLog('Starting VPN leak tests...');

    setTests({
      webRTC: { status: 'running', message: 'Testing WebRTC...', details: [] },
      dns: { status: 'running', message: 'Testing DNS...', details: [] },
      ipAddress: { status: 'running', message: 'Checking IP...', details: [] }
    });
    setGeoData([]); // Clear previous geo data

    // WebRTC Test
    try {
      const webRTCResult = await checkWebRTCLeak();
      setTests(prev => ({
        ...prev,
        webRTC: {
          status: webRTCResult.leaked ? 'failed' : 'passed',
          message: webRTCResult.leaked
            ? `WebRTC leak detected!`
            : 'No WebRTC leaks detected',
          details: [
            `Total IPs found: ${webRTCResult.ips.length}`,
            `Local IPs: ${webRTCResult.localIps?.join(', ') || 'None'}`,
            `Public IPs: ${webRTCResult.publicIps?.join(', ') || 'None'}`,
            `IPv6 IPs: ${webRTCResult.ipv6Ips?.join(', ') || 'None'}`
          ]
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        webRTC: { status: 'error', message: `Error testing WebRTC: ${error instanceof Error ? error.message : 'Unknown error'}`, details: [] }
      }));
    }

    // DNS Leak Test
    try {
      const dnsResult = await checkDNSLeaks();
      setTests(prev => ({
        ...prev,
        dns: {
          status: dnsResult.leaked ? 'failed' : 'passed',
          message: dnsResult.message,
          details: [
            'DNS Resolution Results:',
            ...dnsResult.results.map((r: DNSResult) => {
              const ipv4Info = `IPv4: ${r.ipv4.join(', ')}`;
              const ipv6Info = `IPv6: ${r.ipv6.join(', ')}`;
              const ptrInfo = r.reversePtr ? ` | PTR: ${r.reversePtr}` : '';
              return `${r.server}: ${r.domain} → ${ipv4Info} | ${ipv6Info}${ptrInfo}`;
            })]
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        dns: { status: 'error', message: `Error testing DNS: ${error instanceof Error ? error.message : 'Unknown error'}`, details: [] }
      }));
    }

    // IP Check
    try {
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
      setTests(prev => ({
        ...prev,
        ipAddress: { status: 'error', message: `Error checking IP: ${error instanceof Error ? error.message : 'Unknown error'}`, details: [] }
      }));
    }

    setIsRunning(false);
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
                <h3 className="font-mono font-medium uppercase tracking-wide">{testName} Test</h3>
                <p className="text-sm text-gray-600">{test.message}</p>
              </div>
              <span className="text-xs text-gray-400">{test.timestamp}</span>
            </div>
            {test.details && test.details.length > 0 && (
              <div className="ml-9 mt-2 text-sm text-gray-600 font-mono">
                {test.details.map((detail: string, index: number) => (
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
            {geoData.map((loc, index: number) => (
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
          triggerTests={runAdvancedTests}
          addLog={addLog}  // Add this
        />
      </div>

      <button
        onClick={runAllTests}
        disabled={isRunning}
        className={cn(
          "w-full mb-6 px-4 py-2 font-mono uppercase tracking-wider text-white bg-black",
          "rounded-md transition-colors duration-200",
          "hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
        )}
      >
        {isRunning ? 'Running All Tests...' : 'Start Complete VPN Test'}
      </button>

      {/* Keep only this one logs section */}
      {logs.length > 0 && (
        <div className="mb-6 p-4 bg-black rounded-lg">
          <h3 className="font-mono text-white mb-2 uppercase tracking-wide">Test Logs</h3>
          <div className="font-mono text-xs space-y-1 max-h-[300px] overflow-y-auto">
            {logs.map((log: string, index: number) => (
              <div key={index} className="text-gray-300">{log}</div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default VPNLeakTester;