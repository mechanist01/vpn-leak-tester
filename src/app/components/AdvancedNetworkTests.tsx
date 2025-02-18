"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Loader, RefreshCw } from 'lucide-react';
import InfoIcon, { TEST_INFO } from './InfoIcon';

interface TestResult {
    status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
    message: string;
    details: string[];
}

interface AdvancedTestState {
    timezone: TestResult;
    network: TestResult;
    fingerprint: TestResult;
    traffic: TestResult;
}

interface NetworkConnection {
    type: string | undefined;
    effectiveType: string | undefined;
    downlink: number | undefined;
    rtt: number | undefined;
}

interface AdvancedNetworkTestsProps {
    onTestComplete?: () => void;
    triggerTests?: boolean;
    addLog?: (message: string) => void;
    isRunning?: boolean;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const safeFetch = async (url: string, options: RequestInit = {}): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const defaultOptions: RequestInit = {
        mode: 'no-cors',
        credentials: 'omit',
        cache: 'no-cache',
        signal: controller.signal
    };

    try {
        const response = await fetch(url, {
            ...defaultOptions,
            ...options,
            mode: 'no-cors'
        });
        clearTimeout(timeoutId);
        return response.type === 'opaque' ? true : response.ok;
    } catch {
        clearTimeout(timeoutId);
        return false;
    }
};

const timeServices = [
    { url: 'https://httpbin.org/get', name: 'HTTP Bin Get' },
    { url: 'https://httpbin.org/status/200', name: 'HTTP Bin Status' }
];

const AdvancedNetworkTests: React.FC<AdvancedNetworkTestsProps> = ({
    onTestComplete,
    triggerTests,
    addLog,
    isRunning: parentIsRunning
}) => {
    const [tests, setTests] = useState<AdvancedTestState>({
        timezone: { status: 'pending', message: 'Not tested', details: [] },
        network: { status: 'pending', message: 'Not tested', details: [] },
        fingerprint: { status: 'pending', message: 'Not tested', details: [] },
        traffic: { status: 'pending', message: 'Not tested', details: [] }
    });

    const [isLocalRunning, setIsLocalRunning] = useState(false);
    const isRunning = parentIsRunning || isLocalRunning;

    const checkTimezoneLeaks = useCallback(async (): Promise<TestResult> => {
        const results: string[] = [];
        const leaks: string[] = [];

        const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        results.push(`System timezone: ${systemTimezone}`);

        const offset = new Date().getTimezoneOffset();
        results.push(`UTC offset: ${offset} minutes`);

        const dateStr = new Date().toLocaleString();
        results.push(`Locale date string: ${dateStr}`);

        const timezoneRegion = systemTimezone.split('/')[0];
        const userLocation = await fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .catch(() => null);

        if (timezoneRegion === 'America' && userLocation) {
            if (!userLocation.country_code?.startsWith('US')) {
                leaks.push(`Timezone indicates US location but IP location shows ${userLocation.country_name}`);
            }
        }

        for (const service of timeServices) {
            try {
                await delay(1000);
                const response = await safeFetch(service.url);
                results.push(
                    response
                        ? `Successfully connected to time service: ${service.name}`
                        : `Failed to connect to time service: ${service.name}`
                );
            } catch {
                results.push(`Error checking time service: ${service.name}`);
            }
        }

        return {
            status: leaks.length > 0 ? 'failed' : 'passed',
            message: leaks.length > 0 ? 'Timezone leaks detected' : 'No timezone leaks detected',
            details: [...results, ...leaks]
        };
    }, []);

    const checkBrowserFingerprint = useCallback((): TestResult => {
        const results: string[] = [];
        const leaks: string[] = [];

        const languages = navigator.languages || [navigator.language];
        results.push(`Browser languages: ${languages.join(', ')}`);
        results.push(`Platform: ${navigator.platform}`);
        results.push(`Screen resolution: ${window.screen.width}x${window.screen.height}`);
        results.push(`Color depth: ${window.screen.colorDepth}`);

        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        results.push(`Timezone: ${timeZone}`);

        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    results.push(`WebGL Vendor: ${vendor}`);
                    results.push(`WebGL Renderer: ${renderer}`);
                }
            }
        } catch {
            // Ignore WebGL errors
        }

        if (languages.some(lang => !lang.startsWith(navigator.language.split('-')[0])) ||
            timeZone.includes('UTC')) {
            leaks.push('Inconsistent browser locale settings detected');
        }

        return {
            status: leaks.length > 0 ? 'failed' : 'passed',
            message: leaks.length > 0 ? 'Browser fingerprint inconsistencies detected' : 'Browser fingerprint analysis complete',
            details: [...results, ...leaks]
        };
    }, []);

    const checkNetworkInterfaces = useCallback(async (): Promise<TestResult> => {
        const results: string[] = [];
        const leaks: string[] = [];

        const packetSizes = [1500, 1400, 1300, 1200];
        for (const size of packetSizes) {
            try {
                await delay(2000);
                const payload = new URLSearchParams();
                payload.append('data', 'x'.repeat(size));

                const start = performance.now();
                const success = await safeFetch('https://httpbin.org/post', {
                    method: 'POST',
                    body: payload.toString(),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                const time = performance.now() - start;

                if (success) {
                    results.push(`Packet size ${size}: ${time.toFixed(2)}ms`);
                    if (time > 100) {
                        leaks.push(`Possible MTU fragmentation at ${size} bytes`);
                    }
                } else {
                    results.push(`Failed to test packet size ${size}`);
                }
            } catch {
                results.push(`Error testing packet size ${size}`);
            }
        }

        const testUrls = [
            'https://httpbin.org/get',
            'https://httpbin.org/status/200',
            'https://httpbin.org/delay/1'
        ];

        for (const url of testUrls) {
            try {
                await delay(2000);
                const start = performance.now();
                const success = await safeFetch(url, { method: 'GET' });
                const time = performance.now() - start;

                if (success) {
                    results.push(`Request to ${url}: ${time.toFixed(2)}ms`);
                    if (time > 100) {
                        leaks.push(`High latency detected for ${url}`);
                    }
                } else {
                    results.push(`Failed to connect to ${url}`);
                }
            } catch {
                results.push(`Error testing ${url}`);
            }
        }

        if ('connection' in navigator) {
            const connection = navigator.connection as NetworkConnection;
            if (connection) {
                results.push(`Connection type: ${connection.type || 'unknown'}`);
                results.push(`Effective type: ${connection.effectiveType || 'unknown'}`);
                results.push(`Downlink: ${connection.downlink || 'unknown'} Mbps`);
                results.push(`RTT: ${connection.rtt || 'unknown'} ms`);
            }
        }

        return {
            status: leaks.length > 0 ? 'failed' : 'passed',
            message: leaks.length > 0 ? 'Network anomalies detected' : 'Network analysis complete',
            details: [...results, ...leaks]
        };
    }, []);

    const analyzeTrafficPatterns = useCallback(async (): Promise<TestResult> => {
        const results: string[] = [];
        const leaks: string[] = [];
        const measurements: number[] = [];

        for (let i = 0; i < 5; i++) {
            try {
                await delay(2000);
                const start = performance.now();
                const success = await safeFetch('https://httpbin.org/get');
                const time = performance.now() - start;

                if (success) {
                    measurements.push(time);
                    results.push(`Request ${i + 1} latency: ${time.toFixed(2)}ms`);
                } else {
                    results.push(`Request ${i + 1} failed`);
                }
            } catch {
                results.push(`Error in request ${i + 1}`);
            }
        }

        if (measurements.length > 0) {
            const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
            const stdDev = Math.sqrt(
                measurements.reduce((a, b) => a + Math.pow(b - avgLatency, 2), 0) / measurements.length
            );

            results.push(`Average latency: ${avgLatency.toFixed(2)}ms`);
            results.push(`Latency standard deviation: ${stdDev.toFixed(2)}ms`);

            if (avgLatency > 100) {
                leaks.push('High average latency detected - possible VPN usage');
            }
            if (stdDev > 50) {
                leaks.push('High latency variation detected - possible VPN usage');
            }
        }

        return {
            status: leaks.length > 0 ? 'failed' : 'passed',
            message: leaks.length > 0 ? 'Traffic anomalies detected' : 'Traffic analysis complete',
            details: [...results, ...leaks]
        };
    }, []);

    const runAllTests = useCallback(async () => {
        if (isLocalRunning) return;

        setIsLocalRunning(true);
        if (addLog) {
            addLog('Starting advanced network tests');
        }

        // Set all tests to running state
        setTests({
            timezone: { status: 'running', message: 'Testing timezone...', details: [] },
            network: { status: 'running', message: 'Testing network...', details: [] },
            fingerprint: { status: 'running', message: 'Testing fingerprint...', details: [] },
            traffic: { status: 'running', message: 'Testing traffic...', details: [] }
        });

        try {
            // Run all tests in parallel
            const [timezoneResult, networkResult, fingerprintResult, trafficResult] = await Promise.all([
                checkTimezoneLeaks(),
                checkNetworkInterfaces(),
                checkBrowserFingerprint(),
                analyzeTrafficPatterns()
            ]);

            // Update all test results at once
            setTests({
                timezone: timezoneResult,
                network: networkResult,
                fingerprint: fingerprintResult,
                traffic: trafficResult
            });
        } catch (error) {
            console.error('Error running advanced tests:', error);
            if (addLog) {
                addLog('Error running advanced network tests');
            }
            // Set error state for all tests that haven't completed
            setTests(prev => ({
                timezone: prev.timezone.status === 'running' ? { status: 'error', message: 'Test failed', details: [] } : prev.timezone,
                network: prev.network.status === 'running' ? { status: 'error', message: 'Test failed', details: [] } : prev.network,
                fingerprint: prev.fingerprint.status === 'running' ? { status: 'error', message: 'Test failed', details: [] } : prev.fingerprint,
                traffic: prev.traffic.status === 'running' ? { status: 'error', message: 'Test failed', details: [] } : prev.traffic
            }));
        } finally {
            setIsLocalRunning(false);
            if (addLog) {
                addLog('Advanced network tests completed');
            }
            onTestComplete?.();
        }
    }, [
        isLocalRunning,
        addLog,
        checkTimezoneLeaks,
        checkNetworkInterfaces,
        checkBrowserFingerprint,
        analyzeTrafficPatterns,
        onTestComplete
    ]);

    useEffect(() => {
        if (triggerTests && !isRunning) {
            void runAllTests();
        }
    }, [triggerTests, isRunning, runAllTests]);

    const getStatusIcon = (status: TestResult['status']) => {
        switch (status) {
            case 'passed':
                return <CheckCircle className="text-green-500 w-6 h-6 shrink-0" />;
            case 'failed':
            case 'error':
                return <AlertTriangle className="text-red-500 w-6 h-6 shrink-0" />;
            case 'running':
                return <Loader className="animate-spin w-6 h-6 shrink-0" />;
            default:
                return <RefreshCw className="w-6 h-6 shrink-0" />;
        }
    };

    return (
        <div className="space-y-4">
            {Object.entries(tests).map(([testName, test]) => (
                <div key={testName} className="tool-section terminal-style">
                    <div className="tool-header flex justify-between items-start w-full">
                        <div className="flex items-center gap-2">
                            {getStatusIcon(test.status)}
                            <div>
                                <h3 className="text-lg font-semibold">
                                    {TEST_INFO[testName as keyof typeof TEST_INFO].title}
                                </h3>
                                <p className="text-sm opacity-90">{test.message}</p>
                            </div>
                        </div>
                        <InfoIcon
                            content={TEST_INFO[testName as keyof typeof TEST_INFO].description}
                        />
                    </div>
                    {test.details.length > 0 && (
                        <div className="test-details mt-4 space-y-2 text-sm">
                            {test.details.map((detail: string, index: number) => (
                                <div key={index} className="opacity-85">
                                    {detail}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default AdvancedNetworkTests;