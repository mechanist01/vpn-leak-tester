"use client"

import React, { useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Loader, RefreshCw, Shield, MapPin } from 'lucide-react';
import AdvancedNetworkTests from './AdvancedNetworkTests';
import type {
  TestStatus,
  Tests,
  DNSCheckResult,
  EnhancedWebRTCResult,
  IPCheckResult,
  GeoLocation,
  IPServiceResult,
  LeakAnalysis,
  DNSServer,
  IPService,
  DNSAnswer
} from './types';
import IPLocationMap from './IPLocationMap';
import TLSFingerprintTest from './TLSFingerprintTest';
import InfoIcon, { TEST_INFO } from './InfoIcon';

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
    console.log(`[${timestamp}] ${message}`);
  }, []);

  const checkWebRTCLeak = async (): Promise<EnhancedWebRTCResult> => {
    addLog('Starting WebRTC leak test...');
    return new Promise((resolve) => {
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

          addLog(`Candidate type: ${event.candidate.type}`);
          addLog(`Transport: ${event.candidate.protocol}`);
        }
      };

      pc.createDataChannel('connectivity_test');

      pc.createOffer()
        .then(offer => {
          addLog('WebRTC offer created.');
          return pc.setLocalDescription(offer);
        })
        .catch(() => {
          pc.close();
          addLog('Error in WebRTC test');
          resolve({
            leaked: false,
            ips: [],
            error: true
          });
        });

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
          addLog(`Fetching IPv4 for ${domain} from ${server.name}...`);
          const ipv4Response = await fetch(`${server.endpoint}?name=${domain}&type=A`, {
            headers: {
              'Accept': 'application/dns-json'
            },
            credentials: 'omit'
          });
          addLog(`Fetching IPv6 for ${domain} from ${server.name}...`);
          const ipv6Response = await fetch(`${server.endpoint}?name=${domain}&type=AAAA`, {
            headers: {
              'Accept': 'application/dns-json'
            },
            credentials: 'omit'
          });


          addLog(`Parsing IPv4 response for ${domain} from ${server.name}...`);
          const ipv4Data = await ipv4Response.json();
          addLog(`Parsing IPv6 response for ${domain} from ${server.name}...`);
          const ipv6Data = await ipv6Response.json();

          const ipv4Addresses = ipv4Data.Answer?.map((a: DNSAnswer) => a.data) || [];
          const ipv6Addresses = ipv6Data.Answer?.map((a: DNSAnswer) => a.data) || [];
          addLog(`IPv4 addresses for ${domain} from ${server.name}: ${ipv4Addresses.join(', ')}`);
          addLog(`IPv6 addresses for ${domain} from ${server.name}: ${ipv6Addresses.join(', ')}`);

          addLog(`Fetching reverse DNS for IPv4 addresses for ${domain} from ${server.name}...`);
          const reversePtrs = await Promise.all(
            ipv4Addresses.map(async (ip: string) => {
              try {
                addLog(`Fetching reverse DNS for ${ip} from ${server.name}...`);
                const ptrResponse = await fetch(
                  `${server.endpoint}?name=${ip.split('.').reverse().join('.')}.in-addr.arpa&type=PTR`,
                  {
                    headers: { 'Accept': 'application/dns-json' },
                    credentials: 'omit'
                  }
                );
                addLog(`Parsing reverse DNS response for ${ip} from ${server.name}...`);
                const ptrData = await ptrResponse.json();
                addLog(`Reverse DNS response for ${ip} from ${server.name} has Answer: ${Boolean(ptrData.Answer)}`);
                return ptrData.Answer?.[0]?.data || null;
              } catch (error) {
                addLog(`Error fetching reverse DNS for ${ip} from ${server.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                return null;
              }
            })
          );
          addLog(`Reverse DNS records fetched for ${domain} from ${server.name}`);

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
          addLog(`Reverse PTR: ${reversePtrs.filter(Boolean)[0] || 'None'}`);
        } catch (error) {
          addLog(`Error resolving ${domain} with ${server.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    const leakAnalysis: LeakAnalysis = {
      inconsistentIPv4: false,
      inconsistentIPv6: false,
      mismatchedPtr: false
    };

    for (const domain of testDomains) {
      addLog(`Analyzing DNS results for ${domain}...`);
      const domainResults = results.filter(r => r.domain === domain);
      const ipv4Sets = domainResults.map(r => new Set(r.ipv4));
      const ipv6Sets = domainResults.map(r => new Set(r.ipv6));

      addLog(`Checking IPv4 consistency for ${domain}...`);
      leakAnalysis.inconsistentIPv4 = leakAnalysis.inconsistentIPv4 ||
        !ipv4Sets.every(set => set.size === ipv4Sets[0].size &&
          Array.from(set).every(ip => ipv4Sets[0].has(ip)));
      addLog(`IPv4 consistency for ${domain}: ${!leakAnalysis.inconsistentIPv4}`);


      addLog(`Checking IPv6 consistency for ${domain}...`);
      leakAnalysis.inconsistentIPv6 = leakAnalysis.inconsistentIPv6 ||
        !ipv6Sets.every(set => set.size === ipv6Sets[0].size &&
          Array.from(set).every(ip => ipv6Sets[0].has(ip)));
      addLog(`IPv6 consistency for ${domain}: ${!leakAnalysis.inconsistentIPv6}`);


      addLog(`Checking PTR consistency for ${domain}...`);
      const ptrs = domainResults.map(r => r.reversePtr).filter(Boolean);
      if (ptrs.length > 1) {
        leakAnalysis.mismatchedPtr = leakAnalysis.mismatchedPtr ||
          !ptrs.every(ptr => ptr === ptrs[0]);
        addLog(`PTR consistency for ${domain}: ${!leakAnalysis.mismatchedPtr}`);
      }
    }
    addLog(`DNS leak analysis completed: Inconsistent IPv4: ${leakAnalysis.inconsistentIPv4}, Inconsistent IPv6: ${leakAnalysis.inconsistentIPv6}, Mismatched PTR: ${leakAnalysis.mismatchedPtr}`);

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
      addLog('Fetching IP addresses from various services...');
      const results: (IPServiceResult | null)[] = await Promise.all(
        IP_SERVICES.map(async service => {
          try {
            addLog(`Fetching IP from ${service.name}...`);
            const response = await fetch(service.url);
            addLog(`Response received from ${service.name}: ${response.status}`);
            if (service.name === 'icanhazip') {
              const ip = await response.text();
              addLog(`IP address received from ${service.name}: ${ip.trim()}`);
              return { service: service.name, ip: ip.trim() };
            }
            const data = await response.json();
            const ip = data.ip || data.address || data.query;
            addLog(`IP address received from ${service.name}: ${ip}`);
            return {
              service: service.name,
              ip
            };
          } catch (error) {
            addLog(`Error with ${service.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
          }
        })
      );

      const validResults = results.filter((result): result is IPServiceResult => result !== null);

      if (validResults.length === 0) {
        addLog('No IP detection services available');
        throw new Error('No IP detection services available');
      }
      addLog('IP addresses fetched successfully');

      addLog('Checking consistency of IP addresses...');
      const uniqueIPs = new Set(validResults.map(r => r.ip));
      const ipConsistent = uniqueIPs.size === 1;

      if (!ipConsistent) {
        addLog('WARNING: Inconsistent IPs detected across services');
        validResults.forEach(r => {
          addLog(`${r.service}: ${r.ip}`);
        });
      }
      addLog(`IP consistency: ${ipConsistent}`);


      addLog('Fetching geolocation data for IP addresses...');
      const locationData = await Promise.all(
        Array.from(uniqueIPs).map(ip => getIpLocation(ip))
      );

      setGeoData(locationData);

      const mainIP = validResults[0]?.ip;
      if (!mainIP) {
        addLog('No valid IP found');
        throw new Error('No valid IP found');
      }

      addLog(`Primary detected IP: ${mainIP}`);
      locationData.forEach(loc => {
        addLog(`Location for ${loc.ip}: ${loc.city}, ${loc.country}`);
        addLog(`ISP: ${loc.isp}`);
      });

      addLog('IP address check completed successfully');

      return {
        ip: mainIP,
        allIPs: Array.from(uniqueIPs),
        consistent: ipConsistent,
        locations: locationData
      };

    } catch (error) {
      addLog(`Error in IP detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { error: true };
    }
  };

  const getIpLocation = async (ip: string): Promise<GeoLocation> => {
    addLog(`Fetching geolocation for IP: ${ip}`);
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      addLog(`Response received for geolocation of ${ip}: ${response.status}`);
      if (!response.ok) {
        addLog(`Failed to fetch location for IP: ${ip} (Status: ${response.status})`);
        throw new Error(`Failed to fetch location for IP: ${ip} (Status: ${response.status})`);
      }
      const data = await response.json();
      const result: GeoLocation = {
        ip,
        country: data.country_name || data.country,
        city: data.city,
        lat: data.latitude,
        lon: data.longitude,
        isp: data.org
      };
      addLog(`Geolocation data received for ${ip}: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      addLog(`Error fetching geolocation for IP: ${ip}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const startAllTests = async () => {
    if (isRunning) {
      addLog('Tests are already running. Ignoring start request.');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setGeoData([]);
    addLog('Starting all tests...');
    // Start all tests immediately
    setShouldRunAdvanced(true);

    setTests({
      webRTC: { status: 'running', message: 'Testing WebRTC...', details: [] },
      dns: { status: 'running', message: 'Testing DNS...', details: [] },
      ipAddress: { status: 'running', message: 'Checking IP...', details: [] }
    });

    try {
      addLog('Running all tests in parallel.');
      // Run all tests in parallel
      const [webRTCResult, dnsResult, ipResult] = await Promise.all([
        checkWebRTCLeak(),
        checkDNSLeaks(),
        checkIPAddress()
      ]);
      addLog('All tests completed. Updating UI.');

      // Update all test results at once
      setTests({
        webRTC: {
          status: webRTCResult.leaked ? 'failed' : 'passed',
          message: webRTCResult.leaked ? 'WebRTC leak detected!' : 'No WebRTC leaks detected',
          details: [
            `Total IPs found: ${webRTCResult.ips.length}`,
            `Local IPs: ${webRTCResult.localIps?.join(', ') || 'None'}`,
            `Public IPs: ${webRTCResult.publicIps?.join(', ') || 'None'}`,
            `IPv6 IPs: ${webRTCResult.ipv6Ips?.join(', ') || 'None'}`
          ]
        },
        dns: {
          status: dnsResult.leaked ? 'failed' : 'passed',
          message: dnsResult.message,
          details: dnsResult.results.map(r =>
            `${r.server}: ${r.domain} → IPv4: ${r.ipv4.join(', ')} | IPv6: ${r.ipv6.join(', ')}${r.reversePtr ? ` | PTR: ${r.reversePtr}` : ''}`
          )
        },
        ipAddress: {
          status: ipResult.error ? 'error' : (ipResult.consistent ? 'passed' : 'failed'),
          message: ipResult.error ? 'Error checking IP' : (ipResult.consistent ? 'IP address verified' : 'Inconsistent IPs detected'),
          details: ipResult.ip ? [`Current IP: ${ipResult.ip}`, ...(ipResult.allIPs ? [`All IPs: ${ipResult.allIPs.join(', ')}`] : [])] : []
        }
      });
    } catch (error) {
      addLog(`Error in tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRunning(false);
      setShouldRunAdvanced(false);
    } finally {
      addLog('All tests finished.');
      setIsRunning(false);
    }
  };

  const handleAdvancedTestsComplete = useCallback(() => {
    setIsRunning(false);
    setShouldRunAdvanced(false);
    addLog('All tests completed');
  }, [addLog]);

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="text-green-500 w-6 h-6 shrink-0" />;
      case 'failed':
        return <AlertTriangle className="text-red-500 w-6 h-6 shrink-0" />;
      case 'running':
        return <Loader className="animate-spin w-6 h-6 shrink-0" />;
      default:
        return <RefreshCw className="w-6 h-6 shrink-0" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-4">
      <div className="tool-section terminal-style">
        <div className="tool-header">
          <Shield />
          <div>
            <h1>VPN Leak Detector</h1>
            <p>Comprehensive VPN leak detection system</p>
          </div>
        </div>

        <div className="tool-info">
          brought to you by <a href="https://datablackout.com">datablackout.com</a>
          <p>React App - No Storage - <a href="https://github.com/mechanist01/vpn-leak-tester">Github Repository</a></p>
        </div>
      </div>

      <button
        onClick={startAllTests}
        disabled={isRunning}
        className="tool-button"
      >
        {isRunning ? 'Running All Tests...' : 'Start Complete VPN Test'}
      </button>

      {Object.entries(tests).map(([testName, test]) => (
        <div key={testName} className="tool-section terminal-style">
          <div className="tool-header flex justify-between items-start w-full">
            <div className="flex items-center gap-2">
              {getStatusIcon(test.status)}
              <div>
                <h3>
                  {testName === 'webRTC' ? TEST_INFO.webRTC.title :
                    testName === 'dns' ? TEST_INFO.dns.title :
                      testName === 'ipAddress' ? TEST_INFO.ipAddress.title :
                        `${testName} Test`}
                </h3>
                <p>{test.message}</p>
              </div>
            </div>
            {(testName === 'webRTC' ||
              testName === 'dns' ||
              testName === 'ipAddress') &&
              <InfoIcon content={
                testName === 'webRTC' ? TEST_INFO.webRTC.description :
                  testName === 'dns' ? TEST_INFO.dns.description :
                    TEST_INFO.ipAddress.description
              } />
            }
          </div>
          {test.details.length > 0 && (
            <div className="test-details max-h-48 overflow-y-auto">
              {test.details.map((detail: string, index: number) => (
                <div key={index}>{detail}</div>
              ))}
            </div>
          )}
        </div>
      ))}

      {geoData.length > 0 && (
        <div className="tool-section terminal-style">
          <div className="tool-header">
            <MapPin />
            <h3>IP Location Map</h3>
          </div>
          <IPLocationMap
            markers={geoData.map(loc => ({
              lat: loc.lat,
              lon: loc.lon,
              label: `${loc.ip} (${loc.city}, ${loc.country})`,
              color: '#1f2937'
            }))}
          />
          <div className="test-details">
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

      <div className="space-y-4">
        <AdvancedNetworkTests
          isRunning={isRunning}
          onTestComplete={handleAdvancedTestsComplete}
          triggerTests={shouldRunAdvanced}
          addLog={addLog}
        />
        <TLSFingerprintTest />
      </div>


    </div>
  );
};

export default VPNLeakTester;